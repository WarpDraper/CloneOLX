
namespace Olx.BLL.Helpers
{
    public static class FileTypes
    {
        public static string[] AllowedImageFileTypes =
        [
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "image/existing"
        ];

        // Shared upper bound for a single uploaded image (categories, adverts, users, etc.).
        // Kept in one place so backend validation, Kestrel/form limits, and any future callers
        // all agree on the same number.
        public const long MaxImageFileSizeBytes = 10 * 1024 * 1024; // 10 MB
    }
}
