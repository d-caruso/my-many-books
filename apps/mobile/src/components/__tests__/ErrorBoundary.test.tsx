import { ErrorBoundary } from '../ErrorBoundary';
// ErrorTrackingService is mocked below, no direct import needed

// Mock the error tracking service
jest.mock('../../services/errors/ErrorTrackingService', () => ({
  errorTrackingService: {
    trackError: jest.fn(),
    recordUserAction: jest.fn(),
    trackErrorRecovery: jest.fn(),
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock React Native components 
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text', 
  TouchableOpacity: 'TouchableOpacity',
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Button: 'Button',
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export ErrorBoundary component', () => {
    expect(ErrorBoundary).toBeDefined();
    expect(typeof ErrorBoundary).toBe('function');
  });

  it('should be a React component class', () => {
    // Test that it's a proper React Component class
    expect(ErrorBoundary.prototype).toBeDefined();
    expect(typeof ErrorBoundary.prototype.render).toBe('function');
    expect(typeof ErrorBoundary.prototype.componentDidCatch).toBe('function');
  });

  it('should have static getDerivedStateFromError method', () => {
    expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
  });

  it('should initialize with no error state', () => {
    // Test the initial state
    const initialState = { hasError: false, error: null, errorInfo: null, errorId: null };
    const component = new ErrorBoundary({} as ConstructorParameters<typeof ErrorBoundary>[0]);
    expect(component.state).toEqual(initialState);
  });

  it('should update state when getDerivedStateFromError is called', () => {
    const testError = new Error('Test error');
    const newState = ErrorBoundary.getDerivedStateFromError(testError);
    
    expect(newState).toEqual({
      hasError: true,
      error: testError,
    });
  });
});