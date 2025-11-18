const React = require('react');

// Define mock components that React Native Testing Library can detect
const View = React.forwardRef(({ children, ...props }, ref) => 
  React.createElement('View', { ...props, ref }, children));
const Text = React.forwardRef(({ children, ...props }, ref) => 
  React.createElement('Text', { ...props, ref }, children));
const Image = React.forwardRef((props, ref) => 
  React.createElement('Image', { ...props, ref }));
const ScrollView = React.forwardRef(({ children, ...props }, ref) => 
  React.createElement('ScrollView', { ...props, ref }, children));
const TouchableOpacity = React.forwardRef(({ children, onPress, ...props }, ref) => 
  React.createElement('TouchableOpacity', { onPress, ...props, ref }, children));
const Pressable = React.forwardRef(({ children, onPress, ...props }, ref) => 
  React.createElement('Pressable', { onPress, ...props, ref }, children));
const TextInput = React.forwardRef((props, ref) => 
  React.createElement('TextInput', { ...props, ref }));
const SafeAreaView = React.forwardRef(({ children, ...props }, ref) => 
  React.createElement('SafeAreaView', { ...props, ref }, children));
const FlatList = React.forwardRef(({ data, renderItem, keyExtractor: _keyExtractor, ...props }, ref) =>
  React.createElement('FlatList', { ...props, ref },
    data?.map((item, index) => renderItem({ item, index }))
  ));

// Set displayName for React Dev Tools
View.displayName = 'View';
Text.displayName = 'Text';
Image.displayName = 'Image';
ScrollView.displayName = 'ScrollView';
TouchableOpacity.displayName = 'TouchableOpacity';
Pressable.displayName = 'Pressable';
TextInput.displayName = 'TextInput';
SafeAreaView.displayName = 'SafeAreaView';
FlatList.displayName = 'FlatList';

export { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Pressable, 
  TextInput, 
  SafeAreaView, 
  FlatList 
};

export const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Platform = {
  OS: 'ios',
  Version: '16.0',
  select: jest.fn((obj) => obj.ios || obj.default),
};

export const Alert = {
  alert: jest.fn(),
};

export const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

export const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Animated = {
  View: ({ children, ...props }) => React.createElement('animatedview', props, children),
  Text: ({ children, ...props }) => React.createElement('animatedtext', props, children),
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    interpolate: jest.fn(),
  })),
  timing: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
  spring: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createAnimatedComponent: jest.fn((component) => component),
};