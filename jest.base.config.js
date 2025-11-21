const baseConfig = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/utils/styleMock.js',
    'quake2ts': '<rootDir>/node_modules/quake2ts/packages/engine/dist/esm/index.js',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(quake2ts|@wasm-audio-decoders|codec-parser|@eshaz|ogg-opus-decoder|mpg123-decoder|ogg-vorbis-decoder)/)'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.ts'],
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
};

export default baseConfig;
