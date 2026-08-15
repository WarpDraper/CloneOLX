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
        /// Resizes/pads (max 1200x1200, white background for opaque images, transparent
        /// background + lossless WebP for images with an alpha channel) and re-encodes an image
        /// without persisting it, so callers that write to their own destination path get the
        /// same quality/transparency handling as <see cref="SaveImageAsync(byte[])"/>.
        /// </summary>
        Task<(byte[] Bytes, string Extension)> ProcessImageAsync(byte[] bytes);
        Task<List<string>> SaveImagesAsync(IEnumerable<byte[]> bytesArrays);
        Task<List<string>> SaveImagesAsync(IEnumerable<IFormFile> images);
        Task<byte[]> LoadBytesAsync(string name);
        void DeleteImage(string nameWithFormat);
        void DeleteImageIfExists(string nameWithFormat);
        void DeleteImages(IEnumerable<string> images);
        void DeleteImagesIfExists(IEnumerable<string> images);
    }
}
