import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Proxy API calls to local functions during development
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'stream', 'util', 'http', 'https', 'url', 'zlib', 'process', 'path'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    define: {
      // SECURITY: Never inject real API keys into production bundles.
      // Keys are only available at runtime in development (for convenience with .env).
      // In production, users must provide their own key via the UI (BYOK) or through a secure proxy.
      'process.env.API_KEY': mode === 'development' ? JSON.stringify(env.GEMINI_API_KEY || '') : JSON.stringify(''),
      'process.env.GEMINI_API_KEY': mode === 'development' ? JSON.stringify(env.GEMINI_API_KEY || '') : JSON.stringify(''),
      'process.env.IS_PROD_BUILD': JSON.stringify(mode === 'production'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
