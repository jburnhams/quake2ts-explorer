import { vi } from 'vitest';
// Polyfill jest global for libraries like jest-canvas-mock
(global as any).jest = vi;
