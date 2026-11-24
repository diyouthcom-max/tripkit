import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            // Leave html2canvas / jspdf / dompurify to Vite's default dynamic chunks.
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-is') ||
              id.includes('node_modules/react-i18next') ||
              id.includes('node_modules/i18next/') ||
              id.includes('node_modules/i18next\\') ||
              /node_modules[/\\]i18next[/\\]/.test(id) ||
              /node_modules[/\\]react[/\\]/.test(id)
            ) {
              return 'react-vendor';
            }
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'firebase-vendor';
            }
            if (
              id.includes('@vis.gl/react-google-maps') ||
              id.includes('@googlemaps')
            ) {
              return 'maps-vendor';
            }
            if (
              id.includes('recharts') ||
              id.includes('victory-vendor') ||
              /node_modules[/\\]d3-/.test(id)
            ) {
              return 'charts-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
          },
        },
      },
    },
  };
});
