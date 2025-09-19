module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-paper|@expo|expo-.*|@react-navigation)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@my-many-books/shared-types$': '<rootDir>/../../libs/shared-types/src',
    '^@my-many-books/shared-api$': '<rootDir>/../../libs/shared-api/src',
    '^@my-many-books/shared-utils$': '<rootDir>/../../libs/shared-utils/src',
    '^@my-many-books/shared-business$': '<rootDir>/../../libs/shared-business/src',
  },
  testEnvironment: 'jsdom',
};