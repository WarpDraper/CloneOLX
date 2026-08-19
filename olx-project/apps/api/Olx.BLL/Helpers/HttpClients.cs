namespace Olx.BLL.Helpers
{
    /// <summary>
    /// Names of the <see cref="System.Net.Http.HttpClient"/>s registered via
    /// IHttpClientFactory (see OlxApiServiceExtensions.AddOlxHttpClients), each wrapped in the
    /// standard Polly resilience pipeline. Services resolve their client by name instead of
    /// calling `new HttpClient()` directly.
    /// </summary>
    public static class HttpClients
    {
        public const string NewPost = "NewPost";
        public const string GoogleAuth = "GoogleAuth";
        public const string Recaptcha = "Recaptcha";
        public const string ImageDownload = "ImageDownload";
        public const string Gemini = "Gemini";
    }
}
