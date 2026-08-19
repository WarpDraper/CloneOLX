using Olx.BLL.DTOs;
using Olx.BLL.DTOs.AdvertDtos;
using Olx.BLL.Models.Advert;
using Olx.BLL.Models.Page;
using Pgvector;

namespace Olx.BLL.Interfaces
{
    public interface IAdvertService
    {
        Task<int> RemoveCompletedAsync();
        Task<PageResponse<AdvertDto>> GetPageAsync(AdvertPageRequest pageRequest);
        Task<IEnumerable<AdvertDto>> GetAllAsync();
        Task<IEnumerable<AdvertDto>> GetUserAdvertsAsync(bool locked = false, bool completed = false);
        Task<IEnumerable<AdvertDto>> GetByUserId(int userId);
        Task<AdvertDto> GetByIdAsync(int id);
        Task<IEnumerable<AdvertDto>> GetRangeAsync(IEnumerable<int> ids);
        Task<IEnumerable<AdvertImageDto>> GetImagesAsync(int advertId);
        Task<AdvertDto> CreateAsync(AdvertCreationModel advertModel);
        Task<AdvertDto> UpdateAsync(AdvertCreationModel advertModel);

        // Admin-only full edit (PUT /api/admin/adverts/{id}) — bypasses the owner check
        // AdvertCreationModel-based UpdateAsync enforces.
        Task<AdvertDto> AdminUpdateAsync(int id, AdminAdvertUpdateModel model);
        Task DeleteAsync(int id);
        Task ApproveAsync(int id);
        Task SetLockedStatusAsync(AdvertLockRequest lockRequest);
        Task SetCompletedAsync(int advertId);
        Task BuyAsync(int advertId);

        // pgvector semantic search: ranks approved/non-completed adverts (excluding
        // `excludeAdvertId`, e.g. the advert the embedding was generated from) by cosine
        // distance between the stored Advert.Embedding and the supplied query embedding — the
        // closer to 0, the more semantically similar. Adverts without an embedding yet are
        // excluded (CosineDistance is undefined against a null vector).
        Task<IEnumerable<AdvertDto>> SearchSimilarAdvertsAsync(Vector embedding, int take = 10, int? excludeAdvertId = null);
    }
}
