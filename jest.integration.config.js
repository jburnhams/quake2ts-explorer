import baseConfig from './jest.base.config.js';

const integrationConfig = {
  ...baseConfig,
  displayName: 'integration',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts?(x)'],
  collectCoverage: false,
};

export default integrationConfig;
