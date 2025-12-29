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

// Mock AsyncStorage properly
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock expo-sqlite with in-memory storage for database tests
jest.mock('expo-sqlite', () => {
  // In-memory database storage
  const databases = new Map<string, any>();

  const createMockDatabase = (dbName: string) => {
    if (!databases.has(dbName)) {
      const tables = new Map<string, any[]>();
      const autoIncrementIds = new Map<string, number>();

      const parseInsertValues = (sql: string, params: any[]) => {
        const row: any = {};
        // Extract column names from INSERT statement
        // Format: INSERT INTO table (col1, col2, col3) VALUES (?, ?, ?)
        const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
        if (columnsMatch) {
          const columns = columnsMatch[1]
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

          columns.forEach((col, idx) => {
            if (idx < params.length) {
              row[col] = params[idx];
            }
          });
        }
        return row;
      };

      databases.set(dbName, {
        tables,
        execAsync: jest.fn(async (sql: string) => {
          // Handle CREATE TABLE
          if (sql.includes('CREATE TABLE')) {
            const match = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
            if (match) {
              const tableName = match[1];
              if (!tables.has(tableName)) {
                tables.set(tableName, []);
                autoIncrementIds.set(tableName, 0);
              }
            }
          }
          // Handle CREATE INDEX
          if (sql.includes('CREATE INDEX')) {
            // No-op for indexes in mock
          }
          return { changes: 0, lastInsertRowId: 0 };
        }),
        runAsync: jest.fn(async (sql: string, params: any[] = []) => {
          const lowerSql = sql.toLowerCase();

          // Handle INSERT
          if (lowerSql.includes('insert')) {
            const match = sql.match(/INSERT INTO (\w+)/i);
            if (match) {
              const tableName = match[1];
              if (!tables.has(tableName)) {
                tables.set(tableName, []);
              }
              const table = tables.get(tableName)!;

              // Parse column names and create row object
              const row = parseInsertValues(sql, params);

              // Generate ID if not provided
              if (!row.id) {
                const currentId = autoIncrementIds.get(tableName) || 0;
                const newId = currentId + 1;
                row.id = newId;
                autoIncrementIds.set(tableName, newId);
              }

              table.push(row);
              return { changes: 1, lastInsertRowId: row.id };
            }
          }

          // Handle UPDATE
          if (lowerSql.includes('update')) {
            const tableMatch = sql.match(/UPDATE (\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              const table = tables.get(tableName) || [];

              // Simple update: update all matching rows
              let changes = 0;
              if (lowerSql.includes('where')) {
                // Extract WHERE clause id
                const whereMatch = sql.match(/WHERE (\w+)\s*=\s*\?/i);
                if (whereMatch && params.length > 0) {
                  const idValue = params[params.length - 1];
                  const rowIndex = table.findIndex((r: any) => r.id === idValue);
                  if (rowIndex >= 0) {
                    // Update the row with new values
                    table[rowIndex] = { ...table[rowIndex], ...parseInsertValues(sql, params.slice(0, -1)) };
                    changes = 1;
                  }
                }
              }
              return { changes, lastInsertRowId: 0 };
            }
          }

          // Handle DELETE
          if (lowerSql.includes('delete')) {
            const tableMatch = sql.match(/DELETE FROM (\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              const table = tables.get(tableName);

              if (!table) {
                return { changes: 0, lastInsertRowId: 0 };
              }

              let changes = 0;
              if (lowerSql.includes('where')) {
                const whereMatch = sql.match(/WHERE (\w+)\s*=\s*\?/i);
                if (whereMatch && params.length > 0) {
                  const idValue = params[0];
                  const rowIndex = table.findIndex((r: any) => r.id === idValue);
                  if (rowIndex >= 0) {
                    table.splice(rowIndex, 1);
                    changes = 1;
                  }
                }
              } else {
                // DELETE without WHERE - clear all rows
                changes = table.length;
                tables.set(tableName, []);
              }
              return { changes, lastInsertRowId: 0 };
            }
          }

          return { changes: 0, lastInsertRowId: 0 };
        }),
        getFirstAsync: jest.fn(async (sql: string, params: any[] = []) => {
          const lowerSql = sql.toLowerCase();

          if (lowerSql.includes('select')) {
            const tableMatch = sql.match(/FROM (\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              const table = tables.get(tableName) || [];

              // Handle WHERE clause
              if (lowerSql.includes('where')) {
                const whereMatch = sql.match(/WHERE (\w+)\s*=\s*\?/i);
                if (whereMatch && params.length > 0) {
                  const column = whereMatch[1];
                  const value = params[0];
                  const row = table.find((r: any) => r[column] === value);
                  return row || null;
                }
              }

              return table[0] || null;
            }
          }

          return null;
        }),
        getAllAsync: jest.fn(async (sql: string, params: any[] = []) => {
          const lowerSql = sql.toLowerCase();

          if (lowerSql.includes('select')) {
            const tableMatch = sql.match(/FROM (\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              const table = tables.get(tableName) || [];

              // Handle WHERE clause
              if (lowerSql.includes('where')) {
                // Simple filtering based on first WHERE condition
                const whereMatch = sql.match(/WHERE (\w+)\s*=\s*\?/i);
                if (whereMatch && params.length > 0) {
                  const column = whereMatch[1];
                  const value = params[0];
                  return table.filter((r: any) => r[column] === value);
                }
              }

              return [...table];
            }
          }

          return [];
        }),
        closeAsync: jest.fn(async () => {}),
      });
    }

    return databases.get(dbName);
  };

  return {
    openDatabaseAsync: jest.fn(async (dbName: string) => {
      return createMockDatabase(dbName);
    }),
    openDatabaseSync: jest.fn((dbName: string) => {
      return createMockDatabase(dbName);
    }),
  };
});

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