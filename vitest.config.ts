import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'node', // Default environment for logic tests
      environmentMatchGlobs: [
        ['**/*.tsx', 'jsdom'], // Use jsdom for React components
        ['**/*.test.tsx', 'jsdom'],
        ['tests/unit/components/**/*.ts', 'jsdom'], // Some component helpers might need DOM
      ],
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['tests/integration/**'], // Exclude integration tests for now or configure them separately if needed
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
      // Porting path aliases is partly handled by viteConfig, but we might need explicit vitest handling if viteConfig isn't enough.
      // Vite config already has aliases, mergeConfig should handle it.
      deps: {
        optimizer: {
          web: {
            include: ['vitest-canvas-mock'], // If we need it
          },
        },
      },
    },
  })
);
