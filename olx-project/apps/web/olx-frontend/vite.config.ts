import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    build: {
        // esbuild minification (Vite's default) — fast and sufficient here; swap to 'terser'
        // only if a specific need for its extra squeeze/mangle options comes up.
        minify: 'esbuild',
        // No sourcemaps in the production bundle shipped to the browser — avoids exposing
        // original source/structure to anyone opening devtools on the deployed site.
        sourcemap: false,
        target: 'es2020',
        rollupOptions: {
            output: {
                // Split large, rarely-changing third-party deps into their own chunks so a
                // day-to-day app code change doesn't bust the browser cache for all of vendor
                // too, and so no single chunk balloons past a reasonable size.
                // Function form, not an object literal keyed by chunk name — the object-literal
                // shape isn't part of Rollup's ManualChunksFunction type, which is what
                // rollupOptions.output.manualChunks is actually typed as here, so it fails with
                // TS2769 ("'react-vendor' does not exist in type 'ManualChunksFunction'") even
                // though Rollup accepts it at runtime.
                manualChunks(id: string) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                            return 'react-vendor';
                        }
                        if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
                            return 'redux-vendor';
                        }
                    }
                },
            },
        },
        // Default (500kb) is noisy for an app this size with vendor chunking in place — raised
        // so only a genuinely oversized chunk triggers the build warning.
        chunkSizeWarningLimit: 1000,
    },
    server: {
        // Explicit host/port so the HMR client connects to a known address instead of
        // inferring one from window.location — avoids "[vite] failed to connect to
        // websocket" spam when the dev server is proxied, run in a container, or accessed
        // via a hostname that doesn't match what Vite auto-detects.
        host: true,
        port: 5173,
        strictPort: true,
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        },
        hmr: {
            protocol: 'ws',
            host: 'localhost',
            port: 5173,
            overlay: false,
        },
    },
})