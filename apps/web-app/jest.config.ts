export default {
  displayName: 'web-app',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/sw.ts',
    '!src/react-app-env.d.ts',
  ],
  coverageDirectory: '../../coverage/apps/web-app',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@my-many-books/shared-types$': '<rootDir>/../../libs/shared-types/src/index.ts',
    '^@my-many-books/shared-api$': '<rootDir>/../../libs/shared-api/src/index.ts',
    '^@my-many-books/shared-utils$': '<rootDir>/../../libs/shared-utils/src/index.ts',
    '^@my-many-books/shared-hooks$': '<rootDir>/../../libs/shared-hooks/src/index.ts',
    '^@my-many-books/shared-business$': '<rootDir>/../../libs/shared-business/src/index.ts',
    '^@my-many-books/shared-design$': '<rootDir>/../../libs/shared-design/src/index.ts',
    '^@my-many-books/shared-navigation$': '<rootDir>/../../libs/shared-navigation/src/index.ts',
    '^@my-many-books/shared-forms$': '<rootDir>/../../libs/shared-forms/src/index.ts',
    '^@my-many-books/ui-components$': '<rootDir>/../../libs/ui-components/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};