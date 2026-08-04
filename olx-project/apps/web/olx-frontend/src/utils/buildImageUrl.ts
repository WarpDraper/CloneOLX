import { APP_ENV } from "../env";

// Бекенд віддає статику з /images/{size}_{name}, розміри визначені в appsettings.json -> ImageSizes.
export const IMAGE_SIZES = {
    avatarSmall: 100,
    avatarLarge: 400,
    thumbnail: 200,
    card: 400,
    gallery: 1200,
} as const;

// Seed fixtures sometimes ship a bare, non-seeded picsum URL ("https://picsum.photos/800/600")
// on every single advert/category — picsum resolves that exact URL to the same photo every
// time, so trusting it as `src` would render one identical image across the entire feed.
// Treat it as "no image" so callers fall through to FallbackImage's per-id prefetch instead.
const GENERIC_PICSUM_URL = /^https:\/\/picsum\.photos\/\d+\/\d+\/?(\?.*)?$/i;

export const buildImageUrl = (name: string | null | undefined, size: number = IMAGE_SIZES.card): string | null => {
    if (!name) return null;
    if (name.startsWith("http")) return GENERIC_PICSUM_URL.test(name) ? null : name;
    return `${APP_ENV.API_BASE_URL}/images/${size}_${name}`;
};
