/// <reference types="react" />
/// <reference types="react-native" />

// React Native environment declarations
declare global {
  var __DEV__: boolean;
  var __EXPO_ENV__: 'development' | 'test' | 'production';
}

// Module augmentation for React to ensure proper imports
declare module 'react' {
  // Re-export everything from React
  export * from 'react';
  
  // Ensure default export
  import React from 'react';
  export default React;
}