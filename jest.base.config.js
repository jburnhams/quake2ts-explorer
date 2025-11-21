const baseConfig = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(your-esm-package-here)/)'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.ts'],
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
};

export default baseConfig;
