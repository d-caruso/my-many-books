import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock react-native-paper's PaperProvider
const MockPaperProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement('view', { testID: 'paper-provider' }, children);
};

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <MockPaperProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MockPaperProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };

// Common test utilities
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockBook = (overrides = {}) => ({
  id: 1,
  title: 'Test Book',
  isbnCode: '1234567890',
  status: 'reading' as const,
  authors: [{ id: 1, name: 'Test Author' }],
  categories: [{ id: 1, name: 'Test Category' }],
  notes: 'Test notes',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  ...overrides,
});

export const mockNavigationPush = jest.fn();
export const mockNavigationBack = jest.fn();
export const mockNavigationReplace = jest.fn();

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: mockNavigationPush,
    back: mockNavigationBack,
    replace: mockNavigationReplace,
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({
    push: mockNavigationPush,
    back: mockNavigationBack,
    replace: mockNavigationReplace,
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const React = require('react');
  
  return {
    PaperProvider: MockPaperProvider,
    Text: ({ children, ...props }: any) => 
      React.createElement('text', props, children),
    Button: ({ children, onPress, testID, mode, loading, disabled }: any) => 
      React.createElement('text', { 
        onPress: disabled ? undefined : onPress, 
        testID: testID || `button-${children?.toLowerCase().replace(/\s+/g, '-')}`,
        'data-mode': mode,
        'data-loading': loading,
        'data-disabled': disabled
      }, children),
    TextInput: ({ onChangeText, testID, label, value, ...props }: any) => 
      React.createElement('textInput', { 
        onChangeText, 
        testID: testID || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`,
        value,
        placeholder: label,
        ...props 
      }),
    Card: {
      Content: ({ children }: any) => React.createElement('view', {}, children),
    },
    ActivityIndicator: ({ testID }: any) => 
      React.createElement('view', { testID: testID || 'loading' }),
    Searchbar: ({ onChangeText, testID, value, placeholder }: any) => 
      React.createElement('textInput', { 
        onChangeText, 
        testID: testID || 'searchbar',
        value,
        placeholder
      }),
    FAB: ({ onPress, testID, icon }: any) => 
      React.createElement('text', { 
        onPress, 
        testID: testID || 'fab',
        'data-icon': icon
      }, 'FAB'),
    Chip: ({ children, onPress, testID, ...props }: any) => 
      React.createElement('text', { onPress, testID, ...props }, children),
    IconButton: ({ onPress, testID, icon }: any) => 
      React.createElement('text', { onPress, testID, 'data-icon': icon }),
    SegmentedButtons: ({ value, onValueChange, buttons, testID }: any) => 
      React.createElement('view', { testID: testID || 'segmented-buttons' }, 
        buttons.map((button: any) => 
          React.createElement('text', {
            key: button.value,
            onPress: () => onValueChange(button.value),
            testID: `segment-${button.value}`,
            'data-selected': value === button.value
          }, button.label)
        )
      ),
  };
});

// Mock Expo modules
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => 
      Promise.resolve({ status: 'granted' })
    ),
  },
}));

jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: {
    requestPermissionsAsync: jest.fn(() => 
      Promise.resolve({ status: 'granted' })
    ),
  },
}));

// Mock our API services
jest.mock('@/services/api', () => ({
  bookAPI: {
    getBooks: jest.fn(),
    createBook: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
    searchBooks: jest.fn(),
    setBaseURL: jest.fn(),
  },
  userAPI: {
    login: jest.fn(),
    register: jest.fn(),
    getCurrentUser: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  },
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

jest.mock('@/hooks/useTheme', () => ({
  useTheme: jest.fn(),
}));
