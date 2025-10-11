import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }),
    tsconfigPaths()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@floating-ui/react', '@tanstack/react-table'],
          charts: ['chart.js'],
          maps: ['maplibre-gl'],
          utils: ['date-fns', 'clsx']
        }
      }
    },
    target: 'esnext',
    assetsInlineLimit: 4096
  },
  server: {
    port: 5173,
    host: true,
    cors: true
  },
  preview: {
    port: 4173,
    host: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@floating-ui/react',
      '@tanstack/react-table',
      'chart.js',
      'maplibre-gl',
      'date-fns',
      'clsx'
    ]
  }
});
