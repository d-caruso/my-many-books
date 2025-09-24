# Mobile App Testing Guide

This guide covers how to test the React Native mobile app locally, including unit tests, integration tests, and end-to-end testing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Setup](#test-setup)
3. [Running Tests](#running-tests)
4. [Test Types](#test-types)
5. [Testing Best Practices](#testing-best-practices)
6. [Debugging Tests](#debugging-tests)
7. [CI/CD Integration](#cicd-integration)
8. [Device Testing](#device-testing)

## Prerequisites

Before running tests, ensure you have:

- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g @expo/cli`
- Android Studio (for Android testing)
- Xcode (for iOS testing, macOS only)
- Physical device or emulator/simulator

## Test Setup

### 1. Install Dependencies

```bash
cd apps/mobile
npm install
```

### 2. Environment Configuration

Create a `.env.test` file in the mobile app directory:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
NODE_ENV=test
```

### 3. Test Configuration

The mobile app uses Jest with the following configuration (in `package.json`):

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": [
      "@testing-library/jest-native/extend-expect",
      "<rootDir>/src/setupTests.ts"
    ],
    "testMatch": [
      "**/__tests__/**/*.(ts|tsx|js)",
      "**/*.(test|spec).(ts|tsx|js)"
    ],
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/**/*.stories.{ts,tsx}",
      "!src/setupTests.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- BookCard.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should render"

# Run tests for specific directory
npm test -- src/hooks/
```

### Coverage Reports

After running `npm run test:coverage`, coverage reports are generated in:
- Terminal output (summary)
- `coverage/html/index.html` (detailed HTML report)
- `coverage/lcov.info` (for CI/CD integration)

## Test Types

### 1. Unit Tests

Test individual components, hooks, and utilities in isolation.

**Example: Component Test**
```typescript
// src/__tests__/components/BookCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { BookCard } from '@/components/BookCard';

test('should render book title', () => {
  const mockBook = { title: 'Test Book', /* ... */ };
  const { getByText } = render(<BookCard book={mockBook} />);
  expect(getByText('Test Book')).toBeTruthy();
});
```

**Example: Hook Test**
```typescript
// src/__tests__/hooks/useBooks.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useBooks } from '@/hooks/useBooks';

test('should load books on mount', async () => {
  const { result } = renderHook(() => useBooks());
  
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  
  expect(result.current.books).toBeDefined();
});
```

### 2. Integration Tests

Test interactions between multiple components and services.

**Example: Authentication Flow**
```typescript
// src/__tests__/integration/AuthFlow.test.tsx
test('should complete login flow', async () => {
  const { getByTestId } = render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
  
  fireEvent.press(getByTestId('login-button'));
  
  await waitFor(() => {
    expect(getByTestId('user-info')).toBeTruthy();
  });
});
```

### 3. End-to-End Tests

Test complete user journeys across the app.

**Example: Book Management Flow**
```typescript
// src/__tests__/e2e/AppFlow.test.tsx
test('should complete book management journey', async () => {
  // 1. Login
  // 2. Navigate to books
  // 3. Add new book
  // 4. Edit book
  // 5. Delete book
});
```

### 4. Performance Tests

Test component performance with large datasets.

**Example: List Performance**
```typescript
// src/__tests__/performance/BookList.performance.test.tsx
test('should render large list efficiently', () => {
  const largeList = Array.from({ length: 1000 }, createMockBook);
  
  const startTime = performance.now();
  render(<BookList books={largeList} />);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(1000); // 1 second
});
```

## Testing Best Practices

### 1. Test Structure

Follow the AAA pattern:
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code being tested
- **Assert**: Verify the expected behavior

### 2. Descriptive Test Names

```typescript
// Good
test('should display error message when login fails')

// Bad
test('login error')
```

### 3. Mock External Dependencies

```typescript
// Mock API calls
jest.mock('@/services/api', () => ({
  bookAPI: {
    getBooks: jest.fn(() => Promise.resolve({ books: [] }))
  }
}));

// Mock navigation
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn()
  }
}));
```

### 4. Use Test Utilities

Create reusable test utilities:

```typescript
// src/__tests__/setup/testUtils.tsx
export const createMockBook = (overrides = {}) => ({
  id: 1,
  title: 'Test Book',
  status: 'reading',
  ...overrides
});

export const renderWithProviders = (ui: ReactElement) => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </ThemeProvider>
  );
};
```

### 5. Test User Interactions

```typescript
// Test user interactions, not implementation details
fireEvent.press(getByTestId('add-book-button'));
fireEvent.changeText(getByTestId('search-input'), 'gatsby');

await waitFor(() => {
  expect(getByText('Search Results')).toBeTruthy();
});
```

## Debugging Tests

### 1. Debug Individual Tests

```bash
# Run single test in debug mode
npm test -- --testNamePattern="specific test" --verbose
```

### 2. View Component Output

```typescript
import { debug } from '@testing-library/react-native';

test('debug component output', () => {
  const { debug: debugRender } = render(<MyComponent />);
  debugRender(); // Prints component tree to console
});
```

### 3. Use Jest Debugger

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### 4. Check Mock Calls

```typescript
test('should call API with correct parameters', () => {
  // ... test code ...
  
  expect(mockAPI.createBook).toHaveBeenCalledWith({
    title: 'New Book',
    status: 'reading'
  });
  
  console.log('Mock calls:', mockAPI.createBook.mock.calls);
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/mobile-tests.yml
name: Mobile Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: |
          cd apps/mobile
          npm ci
          
      - name: Run tests
        run: |
          cd apps/mobile
          npm run test:coverage
          
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: apps/mobile/coverage/lcov.info
```

## Device Testing

### 1. iOS Simulator Testing

```bash
# Start iOS simulator
npm run ios

# Run tests on simulator
npm test -- --testRunner="@testing-library/react-native"
```

### 2. Android Emulator Testing

```bash
# Start Android emulator
npm run android

# Run tests on emulator
npm test -- --testRunner="@testing-library/react-native"
```

### 3. Physical Device Testing

```bash
# Install Expo Go app on device
# Scan QR code from `npm start`
# Run tests through Expo Go
```

### 4. Detox E2E Testing (Optional)

For more comprehensive E2E testing, consider integrating Detox:

```bash
npm install --save-dev detox @config/detox
```

## Common Testing Scenarios

### 1. Testing Async Operations

```typescript
test('should handle async data loading', async () => {
  const { getByTestId } = render(<AsyncComponent />);
  
  // Wait for loading to complete
  await waitFor(() => {
    expect(getByTestId('data-content')).toBeTruthy();
  });
});
```

### 2. Testing Error States

```typescript
test('should display error when API fails', async () => {
  mockAPI.getBooks.mockRejectedValue(new Error('Network error'));
  
  const { getByText } = render(<BookList />);
  
  await waitFor(() => {
    expect(getByText('Network error')).toBeTruthy();
  });
});
```

### 3. Testing Navigation

```typescript
test('should navigate to book details', () => {
  const { getByText } = render(<BookCard book={mockBook} />);
  
  fireEvent.press(getByText('View Details'));
  
  expect(mockRouter.push).toHaveBeenCalledWith('/book/1');
});
```

### 4. Testing Form Submissions

```typescript
test('should submit book form with valid data', async () => {
  const { getByTestId } = render(<AddBookForm />);
  
  fireEvent.changeText(getByTestId('title-input'), 'New Book');
  fireEvent.press(getByTestId('submit-button'));
  
  await waitFor(() => {
    expect(mockAPI.createBook).toHaveBeenCalledWith({
      title: 'New Book'
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Metro bundler conflicts**: Reset cache with `npx expo start --clear`
2. **Mock not working**: Ensure mocks are defined before imports
3. **Async test timeouts**: Increase timeout or use proper async/await
4. **Navigation mocks**: Mock all navigation methods used in components

### Performance Issues

1. **Slow test runs**: Use `--maxWorkers=1` for debugging
2. **Memory leaks**: Ensure proper cleanup in afterEach hooks
3. **Large datasets**: Use pagination or virtualization in components

### Coverage Issues

1. **Low coverage**: Add missing test cases for edge cases
2. **Excluded files**: Check `collectCoverageFrom` configuration
3. **False positives**: Use `/* istanbul ignore next */` for unreachable code

## Conclusion

This comprehensive testing setup ensures the mobile app is reliable, maintainable, and performs well across different devices and scenarios. Regular testing helps catch issues early and maintains code quality as the app evolves.

For more specific testing questions or issues, refer to:
- [React Native Testing Library docs](https://callstack.github.io/react-native-testing-library/)
- [Jest documentation](https://jestjs.io/docs/getting-started)
- [Expo testing guide](https://docs.expo.dev/develop/unit-testing/)