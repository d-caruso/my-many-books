const React = require('react');

const createPrimitive = (name) => {
  const component = React.forwardRef(({ children, ...props }, ref) =>
    React.createElement(name, { ...props, ref }, children)
  );
  component.displayName = name;
  return component;
};

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
export const Button = createPrimitive('Button');
export const Text = createPrimitive('Text');
export const TextInput = createPrimitive('TextInput');
export const Chip = createPrimitive('Chip');
export const IconButton = createPrimitive('IconButton');
export const ActivityIndicator = createPrimitive('ActivityIndicator');
export const Checkbox = createPrimitive('Checkbox');
export const SegmentedButtons = createPrimitive('SegmentedButtons');
export const Divider = createPrimitive('Divider');
export const Surface = createPrimitive('Surface');
export const Badge = createPrimitive('Badge');
export const Banner = createPrimitive('Banner');
export const Switch = createPrimitive('Switch');
export const Snackbar = createPrimitive('Snackbar');

export const Avatar = {
  Text: createPrimitive('AvatarText'),
};

const CardRoot = createPrimitive('Card');
export const Card = Object.assign(CardRoot, {
  Content: createPrimitive('CardContent'),
  Actions: createPrimitive('CardActions'),
  Cover: createPrimitive('CardCover'),
  Title: createPrimitive('CardTitle'),
});

const MenuRoot = createPrimitive('Menu');
export const Menu = Object.assign(MenuRoot, {
  Item: createPrimitive('MenuItem'),
});

export const Portal = ({ children }) => children;

const DialogRoot = createPrimitive('Dialog');
export const Dialog = Object.assign(DialogRoot, {
  Title: createPrimitive('DialogTitle'),
  Content: createPrimitive('DialogContent'),
  Actions: createPrimitive('DialogActions'),
});

const ListRoot = createPrimitive('List');
export const List = Object.assign(ListRoot, {
  Item: ({ right, left, children, ...props }) =>
    React.createElement('ListItem', props, children, left ? left() : null, right ? right() : null),
  Icon: createPrimitive('ListIcon'),
});

export const useTheme = () => ({
  colors: MD3LightTheme.colors,
});
