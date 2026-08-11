// DISABLED: this module used to run a background queue that fetched a picsum.photos image
// for every advert/category id seen by the app (dynamic, non-explicit image generation). The
// app must only ever render explicit backend/seeder-provided image paths, so this has been
// gutted to a no-op. No longer imported from main.tsx — kept only so any stale import elsewhere
// fails loudly at build time rather than silently resuming background network fetches.
export {};
