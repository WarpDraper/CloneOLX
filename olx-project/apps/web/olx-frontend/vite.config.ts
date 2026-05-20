import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { lingui } from "@lingui/vite-plugin"

export default defineConfig({
    define: {
        'process.env': {}
    },
    plugins: [
        react({
            plugins: [["@lingui/swc-plugin", {}]],
        }),
        tailwindcss(),
        lingui(),
    ],
})