module.exports = {
  setupFilesAfterEnv: [
    '<rootDir>/jest-setup.ts'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
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
    '^expo-camera$': '<rootDir>/__mocks__/expo-camera.js',
    '^expo-barcode-scanner$': '<rootDir>/__mocks__/expo-barcode-scanner.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
    '^@testing-library/react-native$': '<rootDir>/__mocks__/@testing-library/react-native.js',
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testEnvironment: 'node'
};