module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/performance/**/*.test.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@my-many-books/shared-auth$': '<rootDir>/../../libs/shared-auth/src/authorization/index.ts',
    '^@my-many-books/shared-i18n$': '<rootDir>/../../libs/shared-i18n/src/index.ts',
    '^@my-many-books/shared-logging$': '<rootDir>/../../libs/shared-logging/src/index.ts',
    '^@my-many-books/shared-types$': '<rootDir>/../../libs/shared-types/src/index.ts',
    '^@my-many-books/shared-utils$': '<rootDir>/../../libs/shared-utils/src/index.ts',
    '^@my-many-books/shared-validation$': '<rootDir>/../../libs/shared-validation/src/index.ts',
    '^@my-many-books/hookey$': '<rootDir>/../../libs/hookey/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@my-many-books)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  // Integration tests need longer timeout
  testTimeout: 30000,
};
