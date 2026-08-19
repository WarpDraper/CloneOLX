using Microsoft.AspNetCore.Mvc;
using Olx.BLL.Interfaces;

namespace OLX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NewPostController(INewPostService newPostService) : ControllerBase
    {
        [HttpGet("areas")]
        public async Task<ActionResult> GetAreas() => Ok(await newPostService.GetAreasAsync());

        [HttpGet("regions")]
        public async Task<ActionResult> GetRegions() => Ok(await newPostService.GetRegionsAsync());

        [HttpGet("areas/regions")]
        public async Task<ActionResult> GetRegions([FromQuery] string areaRef) => Ok(await newPostService.GetRegionsByAreaAsync(areaRef));

        [HttpGet("region/settlements")]
        public async Task<ActionResult> GetSettlements([FromQuery] string regionRef) => Ok(await newPostService.GetSettlementsByRegionAsync(regionRef));

        [HttpGet("settlements/warehouses")]
        public async Task<ActionResult> GetWarehouses([FromQuery] string settlementRef) => 
            Ok(await newPostService.GetWarehousesBySettlementAsync(settlementRef));

        [HttpGet("settlements")]
        public async Task<ActionResult> GetSettlement([FromQuery] string settlementRef) => Ok(await newPostService.GetSettlement(settlementRef));

        // Local, case-insensitive lookup over already-synced settlements (EF.Functions.ILike —
        // see NewPostService.SearchSettlementsAsync) — used by the delivery/settlement picker's
        // autocomplete instead of round-tripping to the live Nova Poshta API on every keystroke.
        [HttpGet("settlements/search")]
        public async Task<ActionResult> SearchSettlements([FromQuery] string query, [FromQuery] int take = 20) =>
            Ok(await newPostService.SearchSettlementsAsync(query, take));

        [HttpPost("update")]
        public async Task<ActionResult> UpdateData()
        {
            await newPostService.UpdateNewPostData();
            return Ok();
        }
        
    }
}
