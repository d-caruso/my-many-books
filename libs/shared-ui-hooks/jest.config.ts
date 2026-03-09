export default {
  displayName: 'shared-ui-hooks',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@my-many-books/shared-types$': '<rootDir>/../shared-types/src/index.ts',
    '^@my-many-books/shared-utils$': '<rootDir>/../shared-utils/src/index.ts',
    '^@my-many-books/shared-validation$': '<rootDir>/../shared-validation/src/index.ts',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../../coverage/libs/shared-ui-hooks',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**/*',
    '!src/index.ts',
    '!src/setupTests.ts',
    '!src/examples/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
