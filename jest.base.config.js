const baseConfig = {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/utils/styleMock.js',
    '\\?raw$': '<rootDir>/tests/utils/fileMock.js',
    '^quake2ts$': '<rootDir>/node_modules/quake2ts/packages/engine/dist/esm/index.js',
    '^quake2ts/engine$': '<rootDir>/node_modules/quake2ts/packages/engine/dist/esm/index.js',
    '^quake2ts/game$': '<rootDir>/node_modules/quake2ts/packages/game/dist/esm/index.js',
    '^quake2ts/client$': '<rootDir>/node_modules/quake2ts/packages/client/dist/esm/index.js',
    '^quake2ts/server$': '<rootDir>/node_modules/quake2ts/packages/server/dist/esm/index.js',
    '^quake2ts/shared$': '<rootDir>/node_modules/quake2ts/packages/shared/dist/esm/index.js',
    // Aliases for internal resolution within quake2ts packages (matches vite.config.ts)
    '^@quake2ts/cgame$': '<rootDir>/node_modules/quake2ts/packages/cgame/dist/index.js',
    '^@quake2ts/game$': '<rootDir>/node_modules/quake2ts/packages/game/dist/esm/index.js',
    '^@quake2ts/client$': '<rootDir>/node_modules/quake2ts/packages/client/dist/esm/index.js',
    '^@quake2ts/engine$': '<rootDir>/node_modules/quake2ts/packages/engine/dist/esm/index.js',
    '^@quake2ts/shared$': '<rootDir>/node_modules/quake2ts/packages/shared/dist/esm/index.js',
    '^@quake2ts/server$': '<rootDir>/node_modules/quake2ts/packages/server/dist/esm/index.js',
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
