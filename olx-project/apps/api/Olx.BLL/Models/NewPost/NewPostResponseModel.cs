using Newtonsoft.Json;
using Olx.BLL.Entities.NewPost;

namespace Olx.BLL.Models.NewPost
{
    // Nova Poshta's API almost always returns HTTP 200 even for a *logical* failure (bad
    // apiKey, invalid method, rate limit, etc.) — the real result is the "success" boolean plus
    // an "errors" array in the body. Checking only HttpResponseMessage.IsSuccessStatusCode misses
    // all of these and either silently returns an empty result set or throws a deserialization
    // error with no indication of what Nova Poshta actually said was wrong.
    public class NewPostResponseModel<T>
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("data")]
        public T[] Data { get; set; } = Array.Empty<T>();

        [JsonProperty("errors")]
        public List<string> Errors { get; set; } = [];

        [JsonProperty("warnings")]
        public List<string> Warnings { get; set; } = [];
    }
}
