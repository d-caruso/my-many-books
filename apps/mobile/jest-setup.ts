// Jest setup file for React Native with TypeScript
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  MD3LightTheme: {},
  MD3DarkTheme: {},
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo modules
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));