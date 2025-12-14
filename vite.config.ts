import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@quake2ts/cgame': path.resolve(__dirname, 'node_modules/quake2ts/packages/cgame/dist/index.js'),
      '@quake2ts/game': path.resolve(__dirname, 'node_modules/quake2ts/packages/game/dist/esm/index.js'),
      '@quake2ts/client': path.resolve(__dirname, 'node_modules/quake2ts/packages/client/dist/esm/index.js'),
      '@quake2ts/engine': path.resolve(__dirname, 'node_modules/quake2ts/packages/engine/dist/esm/index.js'),
      '@quake2ts/shared': path.resolve(__dirname, 'node_modules/quake2ts/packages/shared/dist/esm/index.js'),
      '@quake2ts/server': path.resolve(__dirname, 'node_modules/quake2ts/packages/server/dist/esm/index.js'),
    }
  }
});
