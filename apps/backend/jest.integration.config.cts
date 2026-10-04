/* eslint-disable */
// Integration tests run against a real Postgres 16 (see
// src/testing/integration/README.md). They are kept out of the default
// `test` target, which must run without a database.
module.exports = {
  displayName: 'backend-integration',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  // ts-jest instead of swc: real entities import each other circularly
  // (e.g. FactionEntity <-> FactionModifier), which only tsc's CommonJS
  // output tolerates. Unit specs avoid this by mocking entities.
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node10',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@swuniverse/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    // The shared package uses ESM-style `.js` specifiers for its TS sources.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['<rootDir>/src/**/*.int-spec.ts'],
  globalSetup: '<rootDir>/src/testing/integration/global-setup.ts',
  globalTeardown: '<rootDir>/src/testing/integration/global-teardown.ts',
  // Tests share one database; run files sequentially.
  maxWorkers: 1,
  testTimeout: 30000,
};
