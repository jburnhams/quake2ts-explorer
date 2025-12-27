import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import path from 'path';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom', // Default to jsdom for most tests (React components)
      setupFiles: ['./tests/polyfill-jest.ts', './tests/setup.ts'],
      include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'coverage/**',
          'dist/**',
          '**/[.]**',
          'packages/*/test?(s)/**',
          '**/*.d.ts',
          '**/virtual:*',
          '**/__mocks__/*',
          '**/*.test.*',
        ],
      },
      alias: {
        // Map worker imports to the worker mock
        '../workers/pakParser.worker?worker': path.resolve(__dirname, './tests/utils/workerMock.js'),
        '../workers/assetProcessor.worker?worker': path.resolve(__dirname, './tests/utils/workerMock.js'),
        '../workers/indexer.worker?worker': path.resolve(__dirname, './tests/utils/workerMock.js'),
        // Also map relative imports if needed (though Vite usually handles resolving to the above keys)
        '@/src': path.resolve(__dirname, './src'),
        '@/tests': path.resolve(__dirname, './tests'),
      },
      deps: {
        optimizer: {
          web: {
            include: ['vitest-canvas-mock'],
          },
        },
      },
    },
  })
);
