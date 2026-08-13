using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Olx.BLL.Entities;

namespace Olx.DAL.Data.EntityConfigs
{
    public class OrderItemConfig : IEntityTypeConfiguration<OrderItem>
    {
        public void Configure(EntityTypeBuilder<OrderItem> builder)
        {
            builder.HasKey(x => x.Id);
            builder.HasOne(x => x.Advert)
                .WithMany()
                .HasForeignKey(x => x.AdvertId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
