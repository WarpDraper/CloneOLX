using Domain;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace BLL.DTO.Report
{
    public class ResolveReportDto
    {
        [Required]
        public long ReportId { get; set; }

        [Required]
        public ReportStatus Resolution { get; set; }

        [MaxLength(500)]
        public string AdminNotes { get; set; }

        public bool ShouldBanUser { get; set; }

        [MaxLength(500)]
        public string BanReason { get; set; }
    }
}
