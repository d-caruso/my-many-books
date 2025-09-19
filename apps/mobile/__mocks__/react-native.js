export const View = 'View';
export const Text = 'Text';
export const Image = 'Image';
export const ScrollView = 'ScrollView';
export const TouchableOpacity = 'TouchableOpacity';
export const Pressable = 'Pressable';
export const TextInput = 'TextInput';

export const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
};

export const Dimensions = {
  get: () => ({ width: 375, height: 667, scale: 2, fontScale: 1 }),
};

export const Platform = {
  OS: 'ios',
  Version: '16.0',
  select: (obj) => obj.ios || obj.default,
};