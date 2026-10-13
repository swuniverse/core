/// <reference types='vitest' />
import { resolve } from 'node:path';
import { createReadStream, statSync } from 'node:fs';
import { extname } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const ASSET_CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function rootAssetsPlugin(): Plugin {
  const assetsDirectory = resolve(import.meta.dirname, '../../assets');
  return {
    name: 'root-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        const file = resolve(assetsDirectory, `.${path}`);
        if (file === assetsDirectory || !file.startsWith(`${assetsDirectory}/`)) {
          return next();
        }
        try {
          if (!statSync(file).isFile()) return next();
          response.setHeader(
            'Content-Type',
            ASSET_CONTENT_TYPES[extname(file).toLowerCase()] ??
              'application/octet-stream',
          );
          createReadStream(file).pipe(response);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@swuniverse/shared': resolve(
        import.meta.dirname,
        '../../packages/shared/src/index.ts',
      ),
    },
  },
  plugins: [rootAssetsPlugin(), react(), tailwindcss()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'frontend',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
