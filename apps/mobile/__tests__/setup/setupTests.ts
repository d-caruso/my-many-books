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

// Mock expo-sqlite for Jest environment (expo-sqlite requires native modules)
// This is a functional in-memory SQLite implementation for testing
jest.mock('expo-sqlite', () => {
  const databases = new Map<string, any>();

  const createMockDatabase = (dbName: string) => {
    if (!databases.has(dbName)) {
      const tables = new Map<string, any[]>();
      const autoIncrementIds = new Map<string, number>();
      let insertionCounter = 0; // Track insertion order for timestamp-based sorting

      const parseColumns = (sql: string): string[] => {
        const match = sql.match(/\(([^)]+)\)\s*VALUES/i);
        if (match) {
          return match[1].split(',').map((c: string) => c.trim());
        }
        return [];
      };

      const applyWhere = (rows: any[], sql: string, params: any[]): any[] => {
        if (!sql.toLowerCase().includes('where')) {
          return rows;
        }

        // Handle _deleted = 0
        if (sql.includes('_deleted = 0')) {
          rows = rows.filter(r => !r._deleted || r._deleted === 0);
        }

        // Handle simple equality: WHERE column = ?
        const simpleMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (simpleMatch && params.length > 0) {
          const column = simpleMatch[1];
          const value = params[0];
          rows = rows.filter(r => r[column] === value);
        }

        // Handle LIKE: WHERE column LIKE ?
        const likeMatch = sql.match(/WHERE\s+.*?\((\w+)\s+LIKE\s+\?/i);
        if (likeMatch && params.length > 0) {
          const column = likeMatch[1];
          const pattern = params[0].replace(/%/g, '.*');
          const regex = new RegExp(pattern, 'i');
          rows = rows.filter(r => r[column] && regex.test(String(r[column])));
        }

        // Handle multiple WHERE with AND
        const multiWhere = sql.match(/WHERE\s+_deleted\s*=\s*0\s+AND\s+(\w+)\s*=\s*\?/i);
        if (multiWhere && params.length > 0) {
          const column = multiWhere[1];
          const value = params[0];
          rows = rows.filter(r => (!r._deleted || r._deleted === 0) && r[column] === value);
        }

        return rows;
      };

      const applyOrderBy = (rows: any[], sql: string): any[] => {
        const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
        if (orderMatch) {
          const column = orderMatch[1];
          const direction = orderMatch[2]?.toUpperCase() || 'ASC';
          return [...rows].sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];

            if (aVal < bVal) return direction === 'ASC' ? -1 : 1;
            if (aVal > bVal) return direction === 'ASC' ? 1 : -1;

            // Tiebreaker: use insertion order
            const aOrder = a.__insertionOrder || 0;
            const bOrder = b.__insertionOrder || 0;
            return direction === 'ASC' ? aOrder - bOrder : bOrder - aOrder;
          });
        }
        return rows;
      };

      databases.set(dbName, {
        execAsync: async (sql: string) => {
          if (sql.includes('CREATE TABLE')) {
            const match = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
            if (match && !tables.has(match[1])) {
              tables.set(match[1], []);
              autoIncrementIds.set(match[1], 0);
            }
          }
          return { changes: 0, lastInsertRowId: 0 };
        },

        runAsync: async (sql: string, params: any[] = []) => {
          const lowerSql = sql.toLowerCase();

          // INSERT
          if (lowerSql.includes('insert')) {
            const tableMatch = sql.match(/INSERT INTO (\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              if (!tables.has(tableName)) tables.set(tableName, []);

              const columns = parseColumns(sql);
              const row: any = {};
              columns.forEach((col, idx) => {
                row[col] = idx < params.length ? params[idx] : null;
              });

              if (!row.id) {
                const currentId = autoIncrementIds.get(tableName) || 0;
                row.id = currentId + 1;
                autoIncrementIds.set(tableName, row.id);
              }

              // Add hidden insertion order for proper sorting
              row.__insertionOrder = insertionCounter++;

              tables.get(tableName)!.push(row);
              return { changes: 1, lastInsertRowId: row.id };
            }
          }

          // UPDATE
          if (lowerSql.includes('update')) {
            const tableMatch = sql.match(/UPDATE (\w+)/i);
            if (tableMatch) {
              const table = tables.get(tableMatch[1]) || [];
              const setMatch = sql.match(/SET(.+?)WHERE/is);
              const whereMatch = sql.match(/WHERE (\w+)\s*=\s*\?/i);

              if (whereMatch && params.length > 0) {
                const idValue = params[params.length - 1];
                const row = table.find((r: any) => r[whereMatch[1]] === idValue);
                if (row) {
                  const columns = parseColumns(`(${setMatch?.[1] || ''}) VALUES`);
                  columns.forEach((col, idx) => {
                    if (idx < params.length - 1) row[col] = params[idx];
                  });
                  return { changes: 1, lastInsertRowId: 0 };
                }
              }
            }
          }

          // DELETE
          if (lowerSql.includes('delete')) {
            const tableMatch = sql.match(/DELETE FROM (\w+)/i);
            if (tableMatch) {
              const table = tables.get(tableMatch[1]);
              if (!table) return { changes: 0, lastInsertRowId: 0 };

              if (lowerSql.includes('where')) {
                const whereMatch = sql.match(/WHERE (\w+)\s*=\s*\?/i);
                if (whereMatch && params.length > 0) {
                  const idx = table.findIndex((r: any) => r[whereMatch[1]] === params[0]);
                  if (idx >= 0) {
                    table.splice(idx, 1);
                    return { changes: 1, lastInsertRowId: 0 };
                  }
                }
              } else {
                const changes = table.length;
                tables.set(tableMatch[1], []);
                return { changes, lastInsertRowId: 0 };
              }
            }
          }

          return { changes: 0, lastInsertRowId: 0 };
        },

        getFirstAsync: async (sql: string, params: any[] = []) => {
          if (!sql.toLowerCase().includes('select')) return null;

          const tableMatch = sql.match(/FROM (\w+)/i);
          if (!tableMatch) return null;

          let rows = tables.get(tableMatch[1]) || [];
          rows = applyWhere(rows, sql, params);
          rows = applyOrderBy(rows, sql);

          return rows[0] || null;
        },

        getAllAsync: async (sql: string, params: any[] = []) => {
          if (!sql.toLowerCase().includes('select')) return [];

          const tableMatch = sql.match(/FROM (\w+)/i);
          if (!tableMatch) return [];

          let rows = tables.get(tableMatch[1]) || [];
          rows = applyWhere(rows, sql, params);
          rows = applyOrderBy(rows, sql);

          return [...rows];
        },

        closeAsync: async () => {},
      });
    }

    return databases.get(dbName);
  };

  return {
    openDatabaseAsync: async (dbName: string) => createMockDatabase(dbName),
    openDatabaseSync: (dbName: string) => createMockDatabase(dbName),
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