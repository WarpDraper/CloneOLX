using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Report;

namespace OLX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController(IReportService reportService) : ControllerBase
    {
        // POST /api/Report — any authenticated user can report an advert (AdvertId) or a
        // seller/user (TargetUserId).
        [Authorize(Roles = Roles.User)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ReportCreationModel model) =>
            Ok(await reportService.CreateAsync(model));

        // GET /api/Report/pending — admin queue (ReportsPage), flattened with reporter/target
        // details so the table doesn't need extra round-trips.
        [Authorize(Roles = Roles.Admin)]
        [HttpGet("pending")]
        public async Task<IActionResult> GetPending() => Ok(await reportService.GetPendingAsync());

        // PUT /api/Report/{id}/resolve — closes the report as legitimate; optionally bans the
        // reported user and/or unpublishes the reported advert in the same action.
        [Authorize(Roles = Roles.Admin)]
        [HttpPut("{id:int}/resolve")]
        public async Task<IActionResult> Resolve([FromRoute] int id, [FromBody] ReportResolutionModel? model)
        {
            await reportService.ResolveAsync(id, model ?? new ReportResolutionModel());
            return Ok();
        }

        // PUT /api/Report/{id}/reject — closes the report as not actionable. Still accepts the
        // same optional ban/unpublish flags for the rare case an admin wants to act on the
        // target without validating the specific report as "legitimate".
        [Authorize(Roles = Roles.Admin)]
        [HttpPut("{id:int}/reject")]
        public async Task<IActionResult> Reject([FromRoute] int id, [FromBody] ReportResolutionModel? model)
        {
            await reportService.RejectAsync(id, model ?? new ReportResolutionModel());
            return Ok();
        }
    }
}
