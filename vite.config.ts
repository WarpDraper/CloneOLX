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
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
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