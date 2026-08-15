using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Olx.BLL.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Olx.BLL.Services
{
    /// <summary>
    /// Decodes every uploaded image with ImageSharp, resizes it to fit within
    /// <see cref="MaxDimension"/>x<see cref="MaxDimension"/> using <see cref="ResizeMode.Pad"/>
    /// (so aspect ratio is always preserved instead of being cropped or stretched), and
    /// re-encodes it at a high quality setting.
    ///
    /// Images that carry an alpha channel (transparent PNGs, WebP, ...) are padded with a fully
    /// transparent background and saved as lossless WebP so the transparency survives. Padding
    /// those with an opaque color used to turn every transparent PNG into a solid black square,
    /// because ImageSharp's default pad/background color is black when none is specified.
    /// Everything else (JPEG, opaque PNG, ...) is padded with a white background and saved as a
    /// high-quality JPEG, which avoids the black-bar artifacts entirely.
    /// </summary>
    public class ImageService(IConfiguration config) : IImageService
    {
        private readonly string _imgPath = Path.Combine(config["ImagesDir"]!);

        // Upper bound on both dimensions after padding/resizing. Large enough to avoid visible
        // pixelation on modern displays while still keeping file sizes reasonable.
        private const int MaxDimension = 1200;
        private const int JpegQuality = 90;
        private const int WebpQuality = 90;

        public async Task<string> SaveImageAsync(IFormFile image)
        {
            using MemoryStream ms = new();
            await image.CopyToAsync(ms);
            return await SaveImageAsync(ms.ToArray());
        }

        public async Task<List<string>> SaveImagesAsync(IEnumerable<IFormFile> images) =>
            [.. await Task.WhenAll(images.Select(SaveImageAsync))];

        public async Task<string> SaveImageAsync(string base64)
        {
            if (base64.Contains(',')) base64 = base64.Split(',')[1];
            return await SaveImageAsync(Convert.FromBase64String(base64));
        }

        public async Task<string> SaveImageAsync(byte[] bytes)
        {
            Directory.CreateDirectory(_imgPath);
            var (processedBytes, extension) = await ProcessImageAsync(bytes);
            var imageName = $"{Path.GetRandomFileName()}{extension}";
            await File.WriteAllBytesAsync(Path.Combine(_imgPath, imageName), processedBytes);
            return imageName;
        }

        /// <summary>
        /// Resizes/pads and re-encodes an image without writing it anywhere, so callers that
        /// manage their own destination path (e.g. DbSeeder copying fixture photos into
        /// wwwroot/images/products/) still get the same quality/transparency handling as
        /// everything uploaded through the API.
        /// </summary>
        public async Task<(byte[] Bytes, string Extension)> ProcessImageAsync(byte[] bytes)
        {
            using var image = Image.Load(bytes);
            var hasAlpha = image.PixelType.AlphaRepresentation is not (null or PixelAlphaRepresentation.None);

            image.Mutate(ctx => ctx.Resize(new ResizeOptions
            {
                Mode = ResizeMode.Pad,
                Size = new Size(MaxDimension, MaxDimension),
                Sampler = KnownResamplers.Lanczos3,
                // Explicit pad color is the whole fix: ImageSharp pads with transparent black
                // (0,0,0,0) by default, which composites as solid black once anything downstream
                // flattens the alpha channel (e.g. rendering onto a non-transparent <canvas>).
                PadColor = hasAlpha ? Color.Transparent : Color.White
            }));

            IImageEncoder encoder = hasAlpha
                ? new WebpEncoder { Quality = WebpQuality, FileFormat = WebpFileFormatType.Lossless }
                : new JpegEncoder { Quality = JpegQuality };
            var extension = hasAlpha ? ".webp" : ".jpg";

            using var output = new MemoryStream();
            await image.SaveAsync(output, encoder);
            return (output.ToArray(), extension);
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
