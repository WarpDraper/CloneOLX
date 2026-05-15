using Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DAL.Context
{


    public class ApplicationContext : IdentityDbContext<
        AppUser,
        AppRole,
        long,
        IdentityUserClaim<long>,
        AppUserRole,
        IdentityUserLogin<long>,
        IdentityRoleClaim<long>,
        IdentityUserToken<long>>
    {
        public ApplicationContext(DbContextOptions<ApplicationContext> opt) : base(opt)
        {

        }

        public DbSet<Report> Reports { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            builder.Entity<AppUserRole>(ur =>
            {
                ur.HasOne(ur => ur.Role)
                    .WithMany(r => r.UserRoles)
                    .HasForeignKey(r => r.RoleId)
                    .IsRequired();

                ur.HasOne(ur => ur.User)
                    .WithMany(r => r.UserRoles)
                    .HasForeignKey(u => u.UserId)
                    .IsRequired();
            });

            builder.Entity<Report>(report =>
            {
                report.HasKey(r => r.Id);

                report.HasOne(r => r.Reporter)
                    .WithMany(u => u.ReportsCreated)
                    .HasForeignKey(r => r.ReporterId)
                    .OnDelete(DeleteBehavior.Cascade);

                report.HasOne(r => r.TargetUser)
                    .WithMany(u => u.ReportsReceived)
                    .HasForeignKey(r => r.TargetUserId)
                    .OnDelete(DeleteBehavior.Cascade);

                report.HasOne(r => r.ResolvedByAdmin)
                    .WithMany(u => u.ReportsResolved)
                    .HasForeignKey(r => r.ResolvedByAdminId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.SetNull);

                report.Property(r => r.Reason).IsRequired();
                report.Property(r => r.Description).HasMaxLength(500);
                report.Property(r => r.AdminNotes).HasMaxLength(500);
                report.Property(r => r.Status).IsRequired();
                report.Property(r => r.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });
        }
    }
}

