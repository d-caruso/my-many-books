export const MD3LightTheme = {
  colors: {
    primary: '#2196F3',
    secondary: '#FF9800',
    tertiary: '#4CAF50',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    error: '#F44336',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onTertiary: '#FFFFFF',
    onSurface: '#000000',
    onBackground: '#000000',
    onError: '#FFFFFF',
  },
  fonts: {
    regular: { fontFamily: 'System' },
    medium: { fontFamily: 'System' },
    light: { fontFamily: 'System' },
    thin: { fontFamily: 'System' },
  },
};

export const MD3DarkTheme = {
  colors: {
    primary: '#2196F3',
    secondary: '#FF9800',
    tertiary: '#4CAF50',
    surface: '#121212',
    background: '#000000',
    error: '#F44336',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onTertiary: '#FFFFFF',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    onError: '#FFFFFF',
  },
  fonts: {
    regular: { fontFamily: 'System' },
    medium: { fontFamily: 'System' },
    light: { fontFamily: 'System' },
    thin: { fontFamily: 'System' },
  },
};
export const Provider = ({ children }) => children;
export const Button = 'Button';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const Card = Object.assign('Card', {
  Content: 'CardContent',
  Actions: 'CardActions',
  Cover: 'CardCover',
  Title: 'CardTitle',
});
export const Chip = 'Chip';
export const IconButton = 'IconButton';
export const Menu = Object.assign('Menu', {
  Item: 'MenuItem',
});
export const ActivityIndicator = 'ActivityIndicator';