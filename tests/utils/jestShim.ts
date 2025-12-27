import { vi } from 'vitest';

// Shim jest for libraries that expect it (like jest-canvas-mock)
if (typeof globalThis.jest === 'undefined') {
  (globalThis as any).jest = vi;
}
