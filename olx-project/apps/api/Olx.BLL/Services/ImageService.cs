using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Olx.BLL.Helpers;
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
    /// <see cref="MaxDimension"/>x<see cref="MaxDimension"/> using <see cref="ResizeMode.Max"/>
    /// (aspect ratio is preserved and neither dimension exceeds the bound — no canvas expansion,
    /// cropping, or stretching), and re-encodes it at a high quality setting.
    ///
    /// Previously this used <see cref="ResizeMode.Pad"/>, which forced every image onto a square
    /// canvas and baked a solid-color border into the saved pixels for any image that wasn't
    /// already square. That's what caused the white/black letterbox bars seen in the UI — visual
    /// cropping (e.g. CSS `object-cover` on the frontend) can't remove pixels the backend already
    /// wrote into the file. <see cref="ResizeMode.Max"/> never adds a background, so no color logic
    /// is needed here.
    ///
    /// Images that carry an alpha channel (transparent PNGs, WebP, ...) are saved as lossless WebP
    /// so the transparency survives. Everything else (JPEG, opaque PNG, ...) is saved as a
    /// high-quality JPEG.
    /// </summary>
    public class ImageService(IConfiguration config, IHttpClientFactory httpClientFactory) : IImageService
    {
        private readonly string _imgPath = Path.Combine(config["ImagesDir"]!);

        // Upper bound on both dimensions after resizing. Large enough to avoid visible
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
        /// Resizes and re-encodes an image without writing it anywhere, so callers that
        /// manage their own destination path (e.g. DbSeeder copying fixture photos into
        /// wwwroot/images/products/) still get the same quality/transparency handling as
        /// everything uploaded through the API.
        /// </summary>
        public async Task<(byte[] Bytes, string Extension)> ProcessImageAsync(byte[] bytes)
        {
            using var image = Image.Load(bytes);
            return await ResizeAndEncodeAsync(image);
        }

        /// <inheritdoc cref="IImageService.ReprocessImageAsync(byte[])"/>
        public async Task<(byte[] Bytes, string Extension)> ReprocessImageAsync(byte[] bytes)
        {
            using var image = Image.Load(bytes);
            TrimUniformBorder(image);
            return await ResizeAndEncodeAsync(image);
        }

        /// <inheritdoc cref="IImageService.ReprocessStoredImageAsync(string)"/>
        public async Task<string?> ReprocessStoredImageAsync(string name)
        {
            var path = Path.Combine(_imgPath, name);
            if (!File.Exists(path)) return null;

            var original = await File.ReadAllBytesAsync(path);
            var (processed, extension) = await ReprocessImageAsync(original);

            // Trimming never adds an alpha channel that wasn't already there, so the encoder
            // choice (and therefore extension) only changes in the rare case the file already had
            // the "wrong" extension for its content. Keep the same name when possible so callers
            // (e.g. Category.Image / OlxUser.Photo DB references) don't go stale.
            if (string.Equals(Path.GetExtension(name), extension, StringComparison.OrdinalIgnoreCase))
            {
                await File.WriteAllBytesAsync(path, processed);
                return name;
            }

            var newName = $"{Path.GetFileNameWithoutExtension(name)}{extension}";
            await File.WriteAllBytesAsync(Path.Combine(_imgPath, newName), processed);
            File.Delete(path);
            return newName;
        }

        private static async Task<(byte[] Bytes, string Extension)> ResizeAndEncodeAsync(Image image)
        {
            var hasAlpha = image.PixelType.AlphaRepresentation is not (null or PixelAlphaRepresentation.None);

            image.Mutate(ctx => ctx.Resize(new ResizeOptions
            {
                // Max only ever scales down to fit within Size, preserving aspect ratio. Unlike
                // Pad, it never expands the canvas or fills the gap with a background color, so no
                // letterbox bars get baked into the saved pixels. Cropping-to-fill for display is
                // left entirely to the frontend (e.g. CSS object-cover).
                Mode = ResizeMode.Max,
                Size = new Size(MaxDimension, MaxDimension),
                Sampler = KnownResamplers.Lanczos3
            }));

            // Images with an alpha channel are kept as lossless WebP (below) so real transparency
            // survives — do NOT flatten those, or the transparency we're trying to preserve gets
            // thrown away right before we save it. Everything else goes out as JPEG, which has no
            // alpha channel at all: if ImageSharp's alpha detection above ever misses genuine
            // transparency (e.g. a palette/indexed PNG with a tRNS chunk reporting no alpha
            // representation), the JPEG encoder silently discards whatever pixel data was under
            // the "transparent" area, which comes out black instead of a clean background.
            // Explicitly compositing onto white first guarantees that can never happen — and is a
            // harmless no-op for images that are genuinely fully opaque already.
            if (!hasAlpha)
            {
                image.Mutate(ctx => ctx.BackgroundColor(Color.White));
            }

            IImageEncoder encoder = hasAlpha
                ? new WebpEncoder { Quality = WebpQuality, FileFormat = WebpFileFormatType.Lossless }
                : new JpegEncoder { Quality = JpegQuality };
            var extension = hasAlpha ? ".webp" : ".jpg";

            using var output = new MemoryStream();
            await image.SaveAsync(output, encoder);
            return (output.ToArray(), extension);
        }

        /// <summary>
        /// Crops away a uniform solid-color border (the letterbox bars left behind by the old
        /// <c>ResizeMode.Pad</c> pipeline) by scanning inward from each edge until a row/column
        /// stops matching the background color sampled from the top-left corner pixel. Mutates
        /// <paramref name="image"/> in place. No-ops (leaves the image untouched) if there's no
        /// border to trim, or if trimming would remove almost the entire image — a guard against
        /// mistaking a genuinely near-uniform photo (e.g. a plain-background product shot) for a
        /// padded one.
        /// </summary>
        private static void TrimUniformBorder(Image image)
        {
            const int Tolerance = 18; // per-channel distance out of 255
            const double MinKeptFraction = 0.15; // bail out rather than trim away >85% of the image

            using var scan = image.CloneAs<Rgba32>();
            var width = scan.Width;
            var height = scan.Height;
            if (width < 4 || height < 4) return;

            var bg = scan[0, 0];
            bool IsBackground(Rgba32 p) =>
                Math.Abs(p.R - bg.R) <= Tolerance &&
                Math.Abs(p.G - bg.G) <= Tolerance &&
                Math.Abs(p.B - bg.B) <= Tolerance &&
                Math.Abs(p.A - bg.A) <= Tolerance;

            bool RowIsBackground(int y)
            {
                for (var x = 0; x < width; x++)
                    if (!IsBackground(scan[x, y])) return false;
                return true;
            }
            bool ColIsBackground(int x)
            {
                for (var y = 0; y < height; y++)
                    if (!IsBackground(scan[x, y])) return false;
                return true;
            }

            int top = 0, bottom = height - 1, left = 0, right = width - 1;
            while (top < bottom && RowIsBackground(top)) top++;
            while (bottom > top && RowIsBackground(bottom)) bottom--;
            while (left < right && ColIsBackground(left)) left++;
            while (right > left && ColIsBackground(right)) right--;

            if (top == 0 && left == 0 && bottom == height - 1 && right == width - 1) return; // nothing to trim

            var trimmedWidth = right - left + 1;
            var trimmedHeight = bottom - top + 1;
            if (trimmedWidth < width * MinKeptFraction || trimmedHeight < height * MinKeptFraction) return;

            image.Mutate(ctx => ctx.Crop(new Rectangle(left, top, trimmedWidth, trimmedHeight)));
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
            var httpClient = httpClientFactory.CreateClient(HttpClients.ImageDownload);
            return await SaveImageAsync(await httpClient.GetByteArrayAsync(imageUrl));
        }
    }
}
