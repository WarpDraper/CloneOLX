using Microsoft.AspNetCore.Http;

namespace Olx.BLL.Interfaces
{
    public interface IImageService
    {
        Task<string> SaveImageAsync(byte[] bytes);
        Task<string> SaveImageAsync(IFormFile image);
        Task<string> SaveImageAsync(string base64);
        Task<string> SaveImageFromUrlAsync(string imageUrl);
        /// <summary>
        /// Resizes (max 1200x1200, aspect ratio preserved, no canvas padding) and re-encodes an
        /// image without persisting it — lossless WebP for images with an alpha channel, high
        /// quality JPEG otherwise — so callers that write to their own destination path get the
        /// same quality/transparency handling as <see cref="SaveImageAsync(byte[])"/>.
        /// </summary>
        Task<(byte[] Bytes, string Extension)> ProcessImageAsync(byte[] bytes);
        /// <summary>
        /// Same pipeline as <see cref="ProcessImageAsync(byte[])"/>, but first trims any uniform
        /// solid-color border from the source image before resizing/encoding. One-time cleanup
        /// tool for images that were saved by an older build that used <c>ResizeMode.Pad</c> and
        /// baked a white (or black) letterbox border into the file itself — a border CSS/frontend
        /// cropping can never remove because it's part of the saved pixels, not empty space.
        /// Images with no uniform border (nothing to trim) pass through unchanged.
        /// </summary>
        Task<(byte[] Bytes, string Extension)> ReprocessImageAsync(byte[] bytes);
        /// <summary>
        /// Loads an already-saved image by name, runs it through <see cref="ReprocessImageAsync(byte[])"/>,
        /// and overwrites it on disk. Returns the (possibly changed, e.g. .jpg -&gt; .webp) file name,
        /// or null if no file with that name exists.
        /// </summary>
        Task<string?> ReprocessStoredImageAsync(string name);
        Task<List<string>> SaveImagesAsync(IEnumerable<byte[]> bytesArrays);
        Task<List<string>> SaveImagesAsync(IEnumerable<IFormFile> images);
        Task<byte[]> LoadBytesAsync(string name);
        void DeleteImage(string nameWithFormat);
        void DeleteImageIfExists(string nameWithFormat);
        void DeleteImages(IEnumerable<string> images);
        void DeleteImagesIfExists(IEnumerable<string> images);
    }
}
