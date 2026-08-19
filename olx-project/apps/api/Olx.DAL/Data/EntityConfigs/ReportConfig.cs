using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Olx.BLL.Entities;

namespace Olx.DAL.Data.EntityConfigs
{
    public class ReportConfig : IEntityTypeConfiguration<Report>
    {
        public void Configure(EntityTypeBuilder<Report> builder)
        {
            builder.HasKey(x => x.Id);

            // Reporter is required — cascade is safe here (only one Cascade path into
            // AspNetUsers for this entity; TargetUser/ResolvedByUser use SetNull below to avoid
            // Postgres multiple-cascade-path errors).
            builder.HasOne(x => x.Reporter)
                .WithMany()
                .HasForeignKey(x => x.ReporterId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.TargetUser)
                .WithMany()
                .HasForeignKey(x => x.TargetUserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(x => x.ResolvedByUser)
                .WithMany()
                .HasForeignKey(x => x.ResolvedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(x => x.Advert)
                .WithMany()
                .HasForeignKey(x => x.AdvertId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Property(x => x.Status).HasConversion<int>();
        }
    }
}
