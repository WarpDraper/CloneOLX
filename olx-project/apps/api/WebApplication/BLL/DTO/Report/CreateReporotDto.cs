using Domain;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace BLL.DTO.Report
{
    public class CreateReportDto
    {
        [Required]
        public long TargetUserId { get; set; }

        [Required]
        public ReportReason Reason { get; set; }

        [MaxLength(500)]
        public string Description { get; set; }
    }
}
