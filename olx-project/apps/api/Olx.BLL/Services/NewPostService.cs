using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Olx.BLL.DTOs.NewPost;
using Olx.BLL.Entities.NewPost;
using Olx.BLL.Exceptions;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.NewPost;
using Olx.BLL.Resources;
using Olx.BLL.Specifications;
using System.Net;
using System.Text;

namespace Olx.BLL.Services
{

    public class NewPostService(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        IRepository<Area> areaRepository,
        IRepository<Region> regionRepository,
        IRepository<Settlement> settlementRepository,
        IMapper mapper,
        ILogger<NewPostService> logger) : INewPostService
    {
        private readonly string _newPostKey = configuration.GetValue<string>("NewPostApiKey")!;
        private readonly string _newPostUrl = configuration.GetValue<string>("NewPostApiUrl")!;

        private async Task<IEnumerable<T>> GetNewPostData<T>(string modelName,
            string calledMethod,
            int page = 1 ,
            int limit = 200,
            string areaRef = ""
            ,string region = "",
            string settlementRef = "")
        {
            NewPostRequestModel postModel = new(_newPostKey, modelName, calledMethod, page, limit, areaRef,region, settlementRef);
            string json = JsonConvert.SerializeObject(postModel);
            HttpContent content = new StringContent(json, Encoding.UTF8, "application/json");
            // Client comes from IHttpClientFactory (see AddOlxHttpClients) instead of `new
            // HttpClient()`: pooled connections plus the standard Polly retry/timeout/circuit
            // breaker pipeline around every call to Nova Poshta.
            var httpClient = httpClientFactory.CreateClient(HttpClients.NewPost);
            HttpResponseMessage response = await httpClient.PostAsync(_newPostUrl, content);
            var requestResult = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError(
                    "Nova Poshta request failed ({Method}) with HTTP {StatusCode}: {Body}",
                    calledMethod, (int)response.StatusCode, requestResult);
                throw new HttpException(Errors.NewPostRequestError, HttpStatusCode.BadGateway);
            }

            requestResult = requestResult?.Trim('[', ']');
            var result = string.IsNullOrWhiteSpace(requestResult)
                ? null
                : JsonConvert.DeserializeObject<NewPostResponseModel<T>>(requestResult);

            if (result is null)
            {
                logger.LogError("Nova Poshta ({Method}) returned an unparsable response: {Body}", calledMethod, requestResult);
                throw new HttpException(Errors.NewPostRequestError, HttpStatusCode.BadGateway);
            }

            // Nova Poshta returns HTTP 200 for logical failures too (bad apiKey, invalid
            // method/params, rate limiting) — "success": false with the real reason in "errors"
            // is the only reliable signal, so IsSuccessStatusCode alone is not enough.
            if (!result.Success)
            {
                var reason = result.Errors.Count > 0 ? string.Join("; ", result.Errors) : "unknown error";
                logger.LogError("Nova Poshta ({Method}) reported failure: {Reason}", calledMethod, reason);
                throw new HttpException($"{Errors.NewPostRequestError}: {reason}", HttpStatusCode.BadGateway);
            }

            return result.Data ?? [];
        }

        public async Task<IEnumerable<Area>> GetAreasDataAsync() => await GetNewPostData<Area>("Address", "getSettlementAreas");

        public async Task<IEnumerable<Settlement>> GetSettlementsDataAsync(IEnumerable<Region> regions)
        {
            List<Settlement> settlements = [];
            int page = 1;
            while (true)
            {
                var result = await GetNewPostData<Settlement>("Address", "getSettlements", page++,500);
                if (result.Any())
                {
                    settlements.AddRange(result);
                }
                else
                {
                    break;
                }
            };
            
            settlements.AsParallel().ForAll(settlement => 
            {
                if (String.IsNullOrWhiteSpace(settlement.Region)) 
                {
                    settlement.Region = regions.FirstOrDefault(region => region.AreasCenter == settlement.Ref)?.Ref;
                }
            });

            return settlements.AsParallel()
                .GroupBy(x => x.Ref)
                .Select(z => z.First());
        }

        public async Task<IEnumerable<Region>> GetRegionsDataAsync(IEnumerable<string> areaRefs)
        {
            List<Region> result = [];
            foreach (var areaRef in areaRefs)
            {
                var regions = await GetNewPostData<Region>("Address", "getSettlementCountryRegion", areaRef: areaRef);
                if (regions.Any())
                {
                    regions.AsParallel().ForAll(region => region.AreaRef = areaRef);
                    result.AddRange(regions);
                }
            }
            return result.AsParallel()
                .GroupBy(x => x.Ref)
                .Select(z => z.First());
        }

        public async Task<IEnumerable<AreaDto>> GetAreasAsync() =>  await mapper.ProjectTo<AreaDto>(areaRepository.GetQuery()).ToArrayAsync();

        public async Task<IEnumerable<WarehousDto>> GetWarehousesBySettlementAsync(string settlementRef)
        {
            var result = await GetNewPostData<WarehousDto>("Address", "getWarehouses", settlementRef: settlementRef)
                ?? throw new HttpException(Errors.NewPostRequestError, HttpStatusCode.InternalServerError);
            return mapper.Map<IEnumerable<WarehousDto>>(result);
        }

        public async Task<IEnumerable<SettlementDto>> GetSettlementsByRegionAsync(string regionRef) 
        {
            if (!await regionRepository.AnyAsync(x => x.Ref == regionRef))
            {
                throw new HttpException(Errors.InvalidRegionRef, HttpStatusCode.BadRequest);
            }
            return await mapper.ProjectTo<SettlementDto>(settlementRepository.GetQuery().Where(x => x.Region == regionRef)).ToArrayAsync();
        }
            

        public async Task<IEnumerable<RegionDto>> GetRegionsAsync() =>
           await  mapper.ProjectTo<RegionDto>(regionRepository.GetQuery()).ToArrayAsync();

        public async Task<IEnumerable<RegionDto>> GetRegionsByAreaAsync(string areaRef) 
        {
            if (!await areaRepository.AnyAsync(x => x.Ref == areaRef))
            {
                throw new HttpException(Errors.InvalidAreaRef, HttpStatusCode.BadRequest);
            }
            return await mapper.ProjectTo<RegionDto>(regionRepository.GetQuery().Where(x => x.AreaRef == areaRef)).ToArrayAsync();
        }
            

        // Pure UPSERT: matches incoming Nova Poshta rows against already-tracked entities by Ref
        // (the primary key) and either updates the existing row in place or inserts a new one.
        // Nothing already in the table is ever removed here — Areas/Regions/Settlements that
        // Nova Poshta stops returning (renamed/merged upstream) simply stop being refreshed
        // instead of being deleted, which is what keeps this safe against the AspNetUsers/
        // Adverts FKs that point at tbl_Settlements. Lookups are a Dictionary<Ref, T> (O(1))
        // instead of the previous FirstOrDefault-in-a-loop (O(n*m)), which matters once the
        // settlement set is in the tens of thousands of rows.
        private static async Task UpsertAsync<T>(
            IRepository<T> repository,
            IEnumerable<T> incoming,
            IReadOnlyCollection<T> tracked,
            Func<T, string> keySelector,
            Action<T, T> updateExisting) where T : class
        {
            var trackedByRef = tracked.ToDictionary(keySelector);
            var toAdd = new List<T>();

            foreach (var item in incoming)
            {
                if (trackedByRef.TryGetValue(keySelector(item), out var existing))
                {
                    updateExisting(item, existing);
                }
                else
                {
                    toAdd.Add(item);
                }
            }

            if (toAdd.Count > 0)
            {
                await repository.AddRangeAsync(toAdd);
            }
        }

        public async Task UpdateNewPostData()
        {
            try
            {
                logger.LogInformation("{info}", Messages.AreasUpdate);
                var areasData = (await GetAreasDataAsync()).ToArray();
                var areas = (await areaRepository.GetListBySpec(new NewPostDataSpecs.GetAreas(true))).ToArray();
                await UpsertAsync(areaRepository, areasData, areas, x => x.Ref, (source, dest) => mapper.Map(source, dest));
                await SaveWithFkDiagnosticsAsync(areaRepository, "tbl_Areas");

                logger.LogInformation("{info}", Messages.RegionsUpdate);
                var regionsData = (await GetRegionsDataAsync(areasData.Select(x => x.Ref))).ToArray();
                var regions = (await regionRepository.GetListBySpec(new NewPostDataSpecs.GetRegions(true))).ToArray();
                await UpsertAsync(regionRepository, regionsData, regions, x => x.Ref, (source, dest) => mapper.Map(source, dest));
                await SaveWithFkDiagnosticsAsync(regionRepository, "tbl_Regions");

                logger.LogInformation("{info}", Messages.SettlemensUpdate);
                var settlementsData = (await GetSettlementsDataAsync(regionsData)).ToArray();
                var settlements = (await settlementRepository.GetListBySpec(new NewPostDataSpecs.GetSettlements(true))).ToArray();
                await UpsertAsync(settlementRepository, settlementsData, settlements, x => x.Ref, (source, dest) => mapper.Map(source, dest));
                await SaveWithFkDiagnosticsAsync(settlementRepository, "tbl_Settlements");

                logger.LogInformation("{info}", Messages.NPUpdateCompleted);
                logger.LogInformation("{info}", string.Format(Messages.AreasCount, areasData.Length));
                logger.LogInformation("{info}", string.Format(Messages.RegionsCount, regionsData.Length));
                logger.LogInformation("{info}", string.Format(Messages.SettlementsCount, settlementsData.Length));
            }
            catch (HttpException)
            {
                // Already logged with full context (Nova Poshta error / FK diagnostics below) —
                // rethrow as-is instead of burying it behind the generic 500 below.
                throw;
            }
            catch (Exception e)
            {
                logger.LogError(e, "{error} {info}", Errors.NewPostDataUpdateError, e.Message);
                throw new HttpException(Errors.NewPostDataUpdateError, HttpStatusCode.InternalServerError);
            }
        }

        // Wraps SaveAsync so a constraint violation (e.g. 23503 foreign key) surfaces the
        // Postgres-reported table/constraint instead of a bare "an error occurred while saving"
        // — makes any future FK regression here diagnosable from the logs alone.
        private async Task SaveWithFkDiagnosticsAsync<T>(IRepository<T> repository, string tableName) where T : class
        {
            try
            {
                await repository.SaveAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx)
            {
                logger.LogError(ex,
                    "Nova Poshta sync failed saving {Table}: Postgres {SqlState} — {Detail}",
                    tableName, pgEx.SqlState, pgEx.MessageText);
                throw new HttpException(
                    $"{Errors.NewPostDataUpdateError}: {tableName} ({pgEx.SqlState}) — {pgEx.MessageText}",
                    HttpStatusCode.InternalServerError);
            }
        }

        public async Task<SettlementDto> GetSettlement(string settlementRef) =>
            await mapper.ProjectTo<SettlementDto>(settlementRepository.GetQuery().Where(x => x.Ref == settlementRef)).FirstOrDefaultAsync()
            ?? throw new HttpException(Errors.InvalidSettlementRef,HttpStatusCode.BadRequest);

        // Local, case-insensitive search over already-synced settlements (Description is the
        // Ukrainian city/town/village name Nova Poshta returns). EF.Functions.ILike compiles to
        // Postgres's native ILIKE operator, which — unlike `x.Description.ToLower().Contains(...)`
        // — can use a trigram (pg_trgm) GIN/GIST index on Description instead of forcing a
        // sequential scan with a function call on every row.
        public async Task<IEnumerable<SettlementDto>> SearchSettlementsAsync(string query, int take = 20)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return [];
            }

            var pattern = $"%{query.Trim()}%";
            return await mapper.ProjectTo<SettlementDto>(
                    settlementRepository.GetQuery()
                        .Where(x => EF.Functions.ILike(x.Description, pattern))
                        .OrderBy(x => x.Description)
                        .Take(take))
                .ToArrayAsync();
        }
    }
}
