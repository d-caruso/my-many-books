// Industry standard React Native testing setup

import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-dom';

// Setup fake timers properly
jest.useFakeTimers();

// Mock React Native core modules that cause issues
// Note: These mocks are commented out as the modules don't exist in the current React Native version
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({
//   default: {
//     addWhitelistedStyleProp: jest.fn(),
//     addWhitelistedTransformProp: jest.fn(),
//     validateStyles: jest.fn(),
//     validateTransform: jest.fn(),
//   },
// }));

// jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock global fetch
global.fetch = jest.fn();

// Silence console noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock AsyncStorage properly
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock i18next for internationalization with actual translations
jest.mock('react-i18next', () => ({
  useTranslation: (namespace?: string) => ({
    t: (key: string, params?: any) => {
      // Map of translation keys to actual English translations for testing
      const translations: Record<string, string> = {
        // Common
        'loading': 'Loading...',
        'save': 'Save',
        'cancel': 'Cancel',
        'delete': 'Delete',
        'search': 'Search',
        'settings': 'Settings',
        'ok': 'OK',
        'logout': 'Logout',
        'profile': 'Profile',
        'user': 'User',
        'scan': 'Scan',
        'dark_mode': 'Dark Mode',
        'toggle_dark_theme': 'Toggle dark theme',
        'language': 'Language',
        'language_changed_successfully': 'Language changed successfully',
        // Books namespace
        'books:my_books': 'My Books',
        'books:add_book': 'Add Book',
        'books:search_books': 'Search Books',
        'books:no_books_found': 'No books found',
        'books:unknown_author': 'Unknown Author',
        'books:reading': 'Reading',
        'books:completed': 'Completed',
        'books:want_to_read': 'Want to Read',
        // Scanner namespace
        'scanner:scan_barcode': 'Scan ISBN Barcode',
        'scanner:book_found': 'Book Found!',
      };

      // Handle namespace prefix (e.g., 'books:my_books')
      let translationKey = key;
      if (namespace && !key.includes(':')) {
        translationKey = `${namespace}:${key}`;
      }

      let result = translations[translationKey] || key;

      // Interpolate params if provided
      if (params && typeof params === 'object') {
        Object.keys(params).forEach(param => {
          result = result.replace(`{{${param}}}`, String(params[param]));
        });
      }

      return result;
    },
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', regionCode: 'US' }]),
}));

// Mock React Native Paper with proper React components compatible with Testing Library
jest.mock('react-native-paper', () => {
  const React = require('react');
  
  // Use React Native components that will be properly mocked
  const mockView = (props: any) => React.createElement('RCTView', props);
  const mockText = (props: any) => React.createElement('RCTText', props);
  const mockTouchableOpacity = (props: any) => React.createElement('RCTTouchableOpacity', props);
  const mockTextInput = (props: any) => React.createElement('RCTTextInput', props);
  
  const Card = React.forwardRef((props: any, ref: any) => {
    const { children, onPress, style, testID } = props;
    return React.createElement('RCTView', { 
      ref, onPress, style, testID: testID || 'book-card' 
    }, children);
  });
  Card.displayName = 'Card';
  
  const CardContent = React.forwardRef((props: any, ref: any) => {
    const { children, style } = props;
    return React.createElement('RCTView', { ref, style }, children);
  });
  CardContent.displayName = 'Card.Content';
  
  Card.Content = CardContent;
  
  const PaperText = React.forwardRef((props: any, ref: any) => {
    const { children, testID, ...otherProps } = props;
    return React.createElement('RCTText', { ref, testID, ...otherProps }, children);
  });
  PaperText.displayName = 'Text';
  
  const Button = React.forwardRef((props: any, ref: any) => {
    const { children, onPress, testID, mode, disabled } = props;
    return React.createElement('RCTTouchableOpacity', { 
      ref,
      onPress: disabled ? undefined : onPress, 
      testID: testID || `button-${children?.toLowerCase().replace(/\\s+/g, '-')}`,
      disabled
    }, React.createElement('RCTText', {}, children));
  });
  Button.displayName = 'Button';
  
  const PaperTextInput = React.forwardRef((props: any, ref: any) => {
    const { onChangeText, testID, label, value, ...otherProps } = props;
    return React.createElement('RCTTextInput', { 
      ref,
      onChangeText, 
      testID: testID || `input-${label?.toLowerCase().replace(/\\s+/g, '-')}`,
      value,
      placeholder: label,
      ...otherProps 
    });
  });
  PaperTextInput.displayName = 'TextInput';
  
  const ActivityIndicator = React.forwardRef((props: any, ref: any) => {
    const { testID, ...otherProps } = props;
    return React.createElement('RCTActivityIndicatorView', { ref, testID: testID || 'loading', ...otherProps });
  });
  ActivityIndicator.displayName = 'ActivityIndicator';
  
  const Searchbar = React.forwardRef((props: any, ref: any) => {
    const { onChangeText, testID, value, placeholder } = props;
    return React.createElement('RCTTextInput', { 
      ref,
      onChangeText, 
      testID: testID || 'searchbar',
      value,
      placeholder
    });
  });
  Searchbar.displayName = 'Searchbar';
  
  const FAB = React.forwardRef((props: any, ref: any) => {
    const { onPress, testID, icon } = props;
    return React.createElement('RCTTouchableOpacity', { 
      ref,
      onPress, 
      testID: testID || 'fab'
    }, React.createElement('RCTText', {}, 'FAB'));
  });
  FAB.displayName = 'FAB';
  
  const Chip = React.forwardRef((props: any, ref: any) => {
    const { children, onPress, testID, ...otherProps } = props;
    return React.createElement('RCTTouchableOpacity', { 
      ref, onPress, testID, ...otherProps 
    }, React.createElement('RCTText', {}, children));
  });
  Chip.displayName = 'Chip';
  
  const IconButton = React.forwardRef((props: any, ref: any) => {
    const { onPress, testID, icon } = props;
    return React.createElement('RCTTouchableOpacity', { 
      ref, onPress, testID: testID || 'book-menu-button' 
    }, React.createElement('RCTText', {}, `Icon-${icon}`));
  });
  IconButton.displayName = 'IconButton';
  
  const SegmentedButtons = React.forwardRef((props: any, ref: any) => {
    const { value, onValueChange, buttons, testID } = props;
    return React.createElement('RCTView', { ref, testID: testID || 'segmented-buttons' }, 
      buttons?.map((button: any) => 
        React.createElement('RCTTouchableOpacity', {
          key: button.value,
          onPress: () => onValueChange?.(button.value),
          testID: `segment-${button.value}`
        }, React.createElement('RCTText', {}, button.label))
      )
    );
  });
  SegmentedButtons.displayName = 'SegmentedButtons';
  
  const Menu = React.forwardRef((props: any, ref: any) => {
    const { children, visible, onDismiss, anchor, testID } = props;
    return React.createElement('RCTView', { ref, testID: testID || 'menu' }, [
      anchor, 
      ...(visible ? [children] : [])
    ]);
  });
  Menu.displayName = 'Menu';
  
  const MenuItem = React.forwardRef((props: any, ref: any) => {
    const { onPress, title, titleStyle, testID } = props;
    return React.createElement('RCTTouchableOpacity', { 
      ref, onPress, testID 
    }, React.createElement('RCTText', { style: titleStyle }, title));
  });
  MenuItem.displayName = 'Menu.Item';
  
  Menu.Item = MenuItem;
  
  return {
    Provider: ({ children }: any) => children,
    DefaultTheme: {
      colors: {
        primary: '#2196F3',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        error: '#F44336',
      },
    },
    Card,
    Text: PaperText,
    Button,
    TextInput: PaperTextInput,
    ActivityIndicator,
    Searchbar,
    FAB,
    Chip,
    IconButton,
    SegmentedButtons,
    Menu,
  };
});

// Mock Expo modules
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
  CameraView: jest.fn(({ children }) => children),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name, size, color, style }: any) => 
    require('react').createElement('Text', { style }, `Icon-${name}`),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
}));

// Mock React Native core with proper component definitions compatible with Testing Library
jest.mock('react-native', () => {
  const React = require('react');
  
  // Create proper React Native component mocks with displayName for Testing Library compatibility
  const View = React.forwardRef((props: any, ref: any) => {
    return React.createElement('RCTView', { ...props, ref });
  });
  View.displayName = 'View';
  
  const Text = React.forwardRef((props: any, ref: any) => {
    return React.createElement('RCTText', { ...props, ref });
  });
  Text.displayName = 'Text';
  
  const TouchableOpacity = React.forwardRef((props: any, ref: any) => {
    const { onPress, disabled, ...otherProps } = props;
    return React.createElement('RCTTouchableOpacity', { 
      ...otherProps, 
      ref,
      onPress: disabled ? undefined : onPress,
      disabled
    });
  });
  TouchableOpacity.displayName = 'TouchableOpacity';
  
  const TextInput = React.forwardRef((props: any, ref: any) => {
    const { onChangeText, value, ...otherProps } = props;
    return React.createElement('RCTTextInput', { 
      ...otherProps, 
      ref,
      onChangeText,
      value
    });
  });
  TextInput.displayName = 'TextInput';
  
  const Image = React.forwardRef((props: any, ref: any) => {
    return React.createElement('RCTImageView', { ...props, ref });
  });
  Image.displayName = 'Image';
  
  const ScrollView = React.forwardRef((props: any, ref: any) => {
    return React.createElement('RCTScrollView', { ...props, ref });
  });
  ScrollView.displayName = 'ScrollView';
  
  const ActivityIndicator = React.forwardRef((props: any, ref: any) => {
    return React.createElement('RCTActivityIndicatorView', { ...props, ref });
  });
  ActivityIndicator.displayName = 'ActivityIndicator';
  
  return {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    ActivityIndicator,
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
  };
});

// Mock our API services
const mockBookAPI = {
  getBooks: jest.fn(() => Promise.resolve({ books: [] })),
  createBook: jest.fn(),
  updateBook: jest.fn(),
  deleteBook: jest.fn(),
  searchBooks: jest.fn(() => Promise.resolve({ books: [], totalCount: 0, hasMore: false })),
  searchByIsbn: jest.fn(() => Promise.resolve({ book: null })),
  setBaseURL: jest.fn(),
};

const mockUserAPI = {
  login: jest.fn(),
  register: jest.fn(),
  getCurrentUser: jest.fn(),
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
  setBaseURL: jest.fn(),
};

jest.mock('@/services/api', () => ({
  bookAPI: mockBookAPI,
  userAPI: mockUserAPI,
}));

jest.mock('@my-many-books/shared-api', () => ({
  bookAPI: mockBookAPI,
  userAPI: mockUserAPI,
}));

// Mock our hooks
jest.mock('@/hooks/useBooks', () => ({
  useBooks: jest.fn(),
}));

jest.mock('@/hooks/useBookSearch', () => ({
  useBookSearch: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));