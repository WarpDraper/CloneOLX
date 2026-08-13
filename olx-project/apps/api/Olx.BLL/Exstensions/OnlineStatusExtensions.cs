using Olx.BLL.DTOs.AdvertDtos;
using Olx.BLL.DTOs.OlxUserDtos;
using Olx.BLL.Interfaces;

namespace Olx.BLL.Exstensions
{
    // AutoMapper's ProjectTo<T> translates the whole mapping straight into a SQL query, so
    // IsOnline (backed by the in-memory IConnectionTracker, not a DB column) can never be part
    // of that expression — CreateMap<...>().ForMember(x => x.IsOnline, opt => opt.Ignore())
    // keeps ProjectTo happy and leaves it false. These extensions stamp the real presence value
    // onto the already-materialized DTOs right before they leave the service layer.
    public static class OnlineStatusExtensions
    {
        public static OlxUserDto WithOnlineStatus(this OlxUserDto dto, IConnectionTracker tracker)
        {
            dto.IsOnline = tracker.IsOnline(dto.Id);
            return dto;
        }

        public static OlxUserShortDto WithOnlineStatus(this OlxUserShortDto dto, IConnectionTracker tracker)
        {
            dto.IsOnline = tracker.IsOnline(dto.Id);
            return dto;
        }

        public static IEnumerable<OlxUserDto> WithOnlineStatus(this IEnumerable<OlxUserDto> dtos, IConnectionTracker tracker)
        {
            foreach (var dto in dtos)
                dto.WithOnlineStatus(tracker);
            return dtos;
        }

        public static AdvertDto WithOnlineStatus(this AdvertDto dto, IConnectionTracker tracker)
        {
            if (dto.User is not null)
                dto.User.WithOnlineStatus(tracker);
            return dto;
        }

        public static IEnumerable<AdvertDto> WithOnlineStatus(this IEnumerable<AdvertDto> dtos, IConnectionTracker tracker)
        {
            foreach (var dto in dtos)
                dto.WithOnlineStatus(tracker);
            return dtos;
        }
    }
}
