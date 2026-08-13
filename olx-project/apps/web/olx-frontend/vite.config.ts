import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
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