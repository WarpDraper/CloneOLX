using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Olx.BLL.Entities
{
    // Скарга користувача на оголошення (AdvertId) і/або на іншого користувача/продавця
    // (TargetUserId) — принаймні одне з двох мусить бути заповнене
    // (ReportCreationModelValidator це контролює). Адмін розглядає чергу через
    // GET /api/Report/pending і закриває скаргу PUT /api/Report/{id}/resolve|reject,
    // опційно блокуючи цільового користувача або знімаючи оголошення з публікації.
    [Table("tbl_Reports")]
    public class Report : BaseEntity
    {
        public int ReporterId { get; set; }
        public OlxUser Reporter { get; set; } = null!;

        public int? TargetUserId { get; set; }
        public OlxUser? TargetUser { get; set; }

        public int? AdvertId { get; set; }
        public Advert? Advert { get; set; }

        [StringLength(100)]
        public string Reason { get; set; } = string.Empty;

        [StringLength(2000)]
        public string? Description { get; set; }

        public ReportStatus Status { get; set; } = ReportStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Заповнюються лише після Resolve/Reject.
        public int? ResolvedByUserId { get; set; }
        public OlxUser? ResolvedByUser { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
