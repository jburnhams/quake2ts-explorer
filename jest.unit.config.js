import baseConfig from './jest.base.config.js';

const unitConfig = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!**/node_modules/**'],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 85,
      branches: 70,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};

export default unitConfig;
