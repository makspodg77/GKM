import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),

    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),

    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),

    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
  ],

  build: {
    sourcemap: false,

    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          'map-vendor': ['maplibre-gl'],

          'line-timetable': ['./src/components/lineTimetable/LineTimetable'],
          'line-stop-timetable': [
            './src/components/lineStopTimetable/LineStopTimetable',
          ],
          'line-route': ['./src/components/lineRoute/LineRoute'],

          'stop-components': [
            './src/components/stopGroup/StopGroup',
            './src/components/stops/Stops',
          ],

          'map-vehicles': ['./src/components/vehicles/Vehicles'],
        },

        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'],
    },

    cssCodeSplit: true,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },

  server: {
    port: 8080,
    host: true,
  },
});
