/// <reference types="react" />
/// <reference types="react-native" />

// React Native environment declarations
declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean;
  // eslint-disable-next-line no-var
  var __EXPO_ENV__: 'development' | 'test' | 'production';
}