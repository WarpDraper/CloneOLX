using Ardalis.Specification;
using Olx.BLL.Entities;

namespace Olx.BLL.Specifications
{
    public static class AdvertSpecs
    {
        private static void SetOptions(ISpecificationBuilder<Advert> query, AdvertOpt? options)
        {
            if (options is not null)
            {
                // EF Core warning 20504: Include()-ing more than one collection navigation
                // (Images, FilterValues, FavoritedByUsers, Chats) in the same query causes a
                // cartesian-explosion join. Count how many collection Includes this spec ends
                // up applying and switch to AsSplitQuery() whenever it's more than one.
                int collectionIncludeCount = 0;

                foreach (AdvertOpt option in Enum.GetValues(typeof(AdvertOpt)))
                {
                    if (options.Value.HasFlag(option))
                    {
                        switch (option) 
                        {
                            case AdvertOpt.Images: query.Include(x => x.Images); collectionIncludeCount++; break;
                            case AdvertOpt.NoTracking: query.AsNoTracking(); break;
                            case AdvertOpt.FilterValues: query.Include(x => x.FilterValues); collectionIncludeCount++; break;
                            case AdvertOpt.Category:  query.Include(x => x.Category); break;
                            case AdvertOpt.User:  query.Include(x => x.User); break;
                            case AdvertOpt.FavoritedByUsers:  query.Include(x => x.FavoritedByUsers); collectionIncludeCount++; break;
                            case AdvertOpt.Chats:  query.Include(x => x.Chats); collectionIncludeCount++; break;
                            case AdvertOpt.Settlement: query.Include(x => x.Settlement); break;
                            case AdvertOpt.UserSettlement: query.Include(x => x.User).ThenInclude(x=>x.Settlement); break;
                        }      
                    }
                }

                if (collectionIncludeCount > 1)
                {
                    query.AsSplitQuery();
                }
            }
        }

        public class GetByIds : Specification<Advert>
        {
            public GetByIds(IEnumerable<int> ids, AdvertOpt? options = null)
            {
                SetOptions(Query,options);
                Query.Where(x=> ids.Contains(x.Id));
            }
        }

        public class GetUserAdvertById : Specification<Advert>
        {
            public GetUserAdvertById(int userId,int advertId, AdvertOpt? options = null)
            {
                SetOptions(Query, options);
                Query.Where(x =>x.UserId == userId && x.Id == advertId);
            }
        }

        public class GetAll : Specification<Advert>
        {
            public GetAll(AdvertOpt? options = null)
            {
                SetOptions(Query, options);
            }
        }
        public class GetByUserId : Specification<Advert>
        {
            public GetByUserId(int userId, AdvertOpt? options = null)
            {
                SetOptions(Query, options);
                Query.Where(x => x.UserId == userId);
            }
        }

        public class GetById : Specification<Advert>
        {
            public GetById(int id, AdvertOpt? options = null)
            {
                SetOptions(Query, options);
                Query.Where(x => x.Id == id);
            }
        }

        public class GetCompleted : Specification<Advert>
        {
            public GetCompleted(int userId, AdvertOpt? options = null)
            {
                SetOptions(Query, options);
                Query.Where(x => x.UserId == userId && x.Completed);
            }
        }
    }
}
