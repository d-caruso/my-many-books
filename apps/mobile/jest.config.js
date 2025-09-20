module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/__tests__/setup/timers.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/setupTests.ts'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-paper|@expo|expo-.*|@react-navigation)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@my-many-books/shared-types$': '<rootDir>/../../libs/shared-types/src',
    '^@my-many-books/shared-api$': '<rootDir>/../../libs/shared-api/src',
    '^@my-many-books/shared-utils$': '<rootDir>/../../libs/shared-utils/src',
    '^@my-many-books/shared-business$': '<rootDir>/../../libs/shared-business/src',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-paper$': '<rootDir>/__mocks__/react-native-paper.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^expo-camera$': '<rootDir>/__mocks__/expo-camera.js',
    '^expo-barcode-scanner$': '<rootDir>/__mocks__/expo-barcode-scanner.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
    // Remove testing library mocks - use real library with proper setup
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/', 
    '/android/', 
    '/ios/',
    '__tests__/setup/'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  testEnvironment: 'jsdom',
};