using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Olx.BLL.Entities;

namespace Olx.DAL.Data.EntityConfigs
{
    public class NotificationConfig : IEntityTypeConfiguration<Notification>
    {
        public void Configure(EntityTypeBuilder<Notification> builder)
        {
            builder.HasKey(x => x.Id);

            builder.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Every read path filters by UserId (+ IsRead for the unread badge/top-3 query), so
            // both the single-column and composite index pay for themselves immediately.
            builder.HasIndex(x => x.UserId);
            builder.HasIndex(x => new { x.UserId, x.IsRead });
        }
    }
}
