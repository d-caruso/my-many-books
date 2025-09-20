const React = require('react');

export const SafeAreaProvider = ({ children, ...props }) => 
  React.createElement('safeareaview', props, children);

export const SafeAreaView = ({ children, ...props }) => 
  React.createElement('safeareaview', props, children);

export const useSafeAreaInsets = () => ({
  top: 44,
  right: 0,
  bottom: 34,
  left: 0,
});

export const SafeAreaConsumer = ({ children }) => children({ 
  insets: { top: 44, right: 0, bottom: 34, left: 0 } 
});

export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  SafeAreaConsumer,
};