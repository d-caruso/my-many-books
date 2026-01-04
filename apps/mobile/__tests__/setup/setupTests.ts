import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-dom';

// Setup fake timers properly
jest.useFakeTimers();

// Define __DEV__ global for React Native
global.__DEV__ = true;

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

// Mock AsyncStorage with in-memory storage
const mockAsyncStorageData = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => Promise.resolve(mockAsyncStorageData.get(key) || null)),
  setItem: jest.fn((key, value) => {
    mockAsyncStorageData.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    mockAsyncStorageData.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockAsyncStorageData.clear();
    return Promise.resolve();
  }),
}));

// Use better-sqlite3 for testing (real SQLite engine in Node.js)
// expo-sqlite requires native modules that don't work in Jest
jest.mock('expo-sqlite', () => {
  const Database = require('better-sqlite3');

  // Shared database instance per dbName for test persistence
  let currentDb: unknown = null;

  const createDbWrapper = (db: unknown) => ({
    execAsync: async (sql: string) => {
      db.exec(sql);
      return { changes: 0, lastInsertRowId: 0 };
    },
    runAsync: async (sql: string, params: unknown[] = []) => {
      const stmt = db.prepare(sql);
      const result = params.length > 0 ? stmt.run(...params) : stmt.run();
      return {
        changes: result.changes,
        lastInsertRowId: result.lastInsertRowid
      };
    },
    getFirstAsync: async (sql: string, params: unknown[] = []) => {
      const stmt = db.prepare(sql);
      return stmt.get(...params) || null;
    },
    getAllAsync: async (sql: string, params: unknown[] = []) => {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    },
    closeAsync: async () => {
      if (currentDb) {
        currentDb.close();
        currentDb = null;
      }
    },
  });

  return {
    openDatabaseAsync: async (dbName: string) => {
      // Reuse existing DB if already open, otherwise create new one
      if (!currentDb || !currentDb.open) {
        currentDb = new Database(':memory:');
      }
      return createDbWrapper(currentDb);
    },
    openDatabaseSync: (dbName: string) => {
      if (!currentDb || !currentDb.open) {
        currentDb = new Database(':memory:');
      }
      return createDbWrapper(currentDb);
    },
  };
});

// Mock src/i18n module
jest.mock('../../src/i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string, params?: unknown) => {
      const translations: Record<string, string> = {
        'offline.errors.noConnection': "You're offline. Check your connection and try again.",
        'common.loading': 'Loading...',
        'books.my_books': 'My Books',
      };
      let result = translations[key] || key;
      if (params && typeof params === 'object') {
        Object.keys(params).forEach(param => {
          result = result.replace(`{{${param}}}`, String(params[param]));
        });
      }
      return result;
    },
    language: 'en',
    changeLanguage: jest.fn(() => Promise.resolve()),
  },
  changeLanguage: jest.fn(() => Promise.resolve()),
  saveLanguagePreference: jest.fn(() => Promise.resolve()),
}));

// Mock i18next for internationalization with actual translations
jest.mock('react-i18next', () => ({
  useTranslation: (namespace?: string) => ({
    t: (key: string, params?: unknown) => {
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
  Trans: ({ children }: { children: unknown }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', regionCode: 'US' }]),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
        ssid: 'test-wifi',
        strength: 100,
      },
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

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
  MaterialIcons: ({ name, size, color, style }: { name?: string; size?: number; color?: string; style?: unknown }) => 
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
  const View = React.forwardRef((props: unknown, ref: unknown) => {
    return React.createElement('RCTView', { ...props, ref });
  });
  View.displayName = 'View';
  
  const Text = React.forwardRef((props: unknown, ref: unknown) => {
    return React.createElement('RCTText', { ...props, ref });
  });
  Text.displayName = 'Text';
  
  const TouchableOpacity = React.forwardRef((props: unknown, ref: unknown) => {
    const { onPress, disabled, ...otherProps } = props;
    return React.createElement('RCTTouchableOpacity', { 
      ...otherProps, 
      ref,
      onPress: disabled ? undefined : onPress,
      disabled
    });
  });
  TouchableOpacity.displayName = 'TouchableOpacity';
  
  const TextInput = React.forwardRef((props: unknown, ref: unknown) => {
    const { onChangeText, value, ...otherProps } = props;
    return React.createElement('RCTTextInput', { 
      ...otherProps, 
      ref,
      onChangeText,
      value
    });
  });
  TextInput.displayName = 'TextInput';
  
  const Image = React.forwardRef((props: unknown, ref: unknown) => {
    return React.createElement('RCTImageView', { ...props, ref });
  });
  Image.displayName = 'Image';
  
  const ScrollView = React.forwardRef((props: unknown, ref: unknown) => {
    return React.createElement('RCTScrollView', { ...props, ref });
  });
  ScrollView.displayName = 'ScrollView';
  
  const ActivityIndicator = React.forwardRef((props: unknown, ref: unknown) => {
    return React.createElement('RCTActivityIndicatorView', { ...props, ref });
  });
  ActivityIndicator.displayName = 'ActivityIndicator';

  const Button = React.forwardRef((props: unknown, ref: unknown) => {
    const { onPress, title, disabled, ...otherProps } = props;
    return React.createElement('RCTButton', {
      ...otherProps,
      ref,
      onPress: disabled ? undefined : onPress,
      title,
      disabled
    });
  });
  Button.displayName = 'Button';

  return {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    ActivityIndicator,
    Button,
    StyleSheet: {
      create: (styles: unknown) => styles,
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

// Create apiUtils with real implementations for testing
const mockApiUtils = {
  isOnline: async () => {
    const NetInfo = require('@react-native-community/netinfo');
    const networkState = await NetInfo.fetch();
    return networkState.isConnected ?? false;
  },

  getAuthHeaders: () => {
    return {
      'Content-Type': 'application/json',
    };
  },

  handleOfflineError: async (error: unknown) => {
    const online = await mockApiUtils.isOnline();
    if (!online) {
      throw new Error("You're offline. Check your connection and try again.");
    }
    throw error;
  },

  isOfflineError: (error: unknown): boolean => {
    return error?.message === "You're offline. Check your connection and try again.";
  },
};

// Create mock apiClient with proper structure
const mockApiClient = {
  books: mockBookAPI,
  users: mockUserAPI,
  authors: {
    getAuthors: jest.fn(() => Promise.resolve({ authors: [] })),
    getAuthor: jest.fn(),
    createAuthor: jest.fn(),
    updateAuthor: jest.fn(),
    deleteAuthor: jest.fn(),
  },
  categories: {
    getCategories: jest.fn(() => Promise.resolve({ categories: [] })),
    getCategory: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
  admin: {
    getAdminStats: jest.fn(),
    getAdminUsers: jest.fn(),
    updateAdminUser: jest.fn(),
    deleteAdminUser: jest.fn(),
    getAdminBooks: jest.fn(),
    updateAdminBook: jest.fn(),
    deleteAdminBook: jest.fn(),
  },
};

jest.mock('@/services/api', () => ({
  bookAPI: mockBookAPI,
  userAPI: mockUserAPI,
  authorAPI: mockApiClient.authors,
  categoryAPI: mockApiClient.categories,
  apiUtils: mockApiUtils,
  apiClient: mockApiClient,
}));

jest.mock('@my-many-books/shared-api', () => ({
  bookAPI: mockBookAPI,
  userAPI: mockUserAPI,
  createApiClient: jest.fn(() => mockApiClient),
}));

// Mock our hooks
jest.mock('@/hooks/useBooks', () => ({
  useBooks: jest.fn(),
}));

jest.mock('@/hooks/useBookSearch', () => ({
  useBookSearch: jest.fn(),
}));

// Mock the useNetworkState hook specifically
jest.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: jest.fn(() => ({
    isOnline: true,
    isInternetReachable: true,
    connectionType: 'wifi',
  })),
}));