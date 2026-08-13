using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Olx.BLL.Interfaces;

namespace Olx.BLL.Services
{
    /// <summary>
    /// Stores the uploaded image as-is. No resizing, WebP conversion, or size variants are created.
    /// </summary>
    public class ImageService(IConfiguration config) : IImageService
    {
        private readonly string _imgPath = Path.Combine(config["ImagesDir"]!);

        public async Task<string> SaveImageAsync(IFormFile image)
        {
            using MemoryStream ms = new();
            await image.CopyToAsync(ms);
            var extension = Path.GetExtension(image.FileName);
            return await SaveImageAsync(ms.ToArray(), extension);
        }

        public async Task<List<string>> SaveImagesAsync(IEnumerable<IFormFile> images) =>
            [.. await Task.WhenAll(images.Select(SaveImageAsync))];

        public async Task<string> SaveImageAsync(string base64)
        {
            if (base64.Contains(',')) base64 = base64.Split(',')[1];
            return await SaveImageAsync(Convert.FromBase64String(base64));
        }

        public Task<string> SaveImageAsync(byte[] bytes) => SaveImageAsync(bytes, ".jpg");

        private async Task<string> SaveImageAsync(byte[] bytes, string? extension)
        {
            Directory.CreateDirectory(_imgPath);
            extension = string.IsNullOrWhiteSpace(extension) ? ".jpg" : extension.ToLowerInvariant();
            if (!extension.StartsWith('.')) extension = "." + extension;
            var imageName = $"{Path.GetRandomFileName()}{extension}";
            await File.WriteAllBytesAsync(Path.Combine(_imgPath, imageName), bytes);
            return imageName;
        }

        public async Task<List<string>> SaveImagesAsync(IEnumerable<byte[]> bytesArrays) =>
            [.. await Task.WhenAll(bytesArrays.Select(SaveImageAsync))];

        public Task<byte[]> LoadBytesAsync(string name) =>
            File.ReadAllBytesAsync(Path.Combine(_imgPath, name));

        public void DeleteImage(string name) =>
            File.Delete(Path.Combine(_imgPath, name));

        public void DeleteImages(IEnumerable<string> images)
        {
            foreach (var image in images) DeleteImage(image);
        }

        public void DeleteImageIfExists(string name)
        {
            var path = Path.Combine(_imgPath, name);
            if (File.Exists(path)) File.Delete(path);
        }

        public void DeleteImagesIfExists(IEnumerable<string> images)
        {
            foreach (var image in images) DeleteImageIfExists(image);
        }

        public async Task<string> SaveImageFromUrlAsync(string imageUrl)
        {
            using var httpClient = new HttpClient();
            return await SaveImageAsync(await httpClient.GetByteArrayAsync(imageUrl));
        }
    }
}
