# @my-many-books/shared-auth

Shared authentication library for My Many Books web and mobile applications.

## Features

- Platform-agnostic authentication logic
- Hybrid token storage (access token in memory, refresh token in HttpOnly cookie)
- Automatic token refresh
- React hooks and context provider
- TypeScript support
- Storage adapters for web (in-memory) and mobile (SecureStore)

## Installation

```bash
npm install @my-many-books/shared-auth
```

For mobile apps, also install:
```bash
npm install expo-secure-store
```

## Usage

### Web Application

```typescript
import { AuthService, WebStorageAdapter, AuthProvider } from '@my-many-books/shared-auth';

// Create auth service
const authService = new AuthService({
  storage: new WebStorageAdapter(),
  apiUrl: 'https://api.yourapp.com/api/v1',
  onAuthStateChange: (user) => {
    console.log('Auth state changed:', user);
  },
});

// Wrap your app with AuthProvider
function App() {
  return (
    <AuthProvider authService={authService}>
      <YourApp />
    </AuthProvider>
  );
}

// Use in components
function LoginPage() {
  const { login, loading } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
  };

  return <LoginForm onSubmit={handleLogin} loading={loading} />;
}
```

### Mobile Application

```typescript
import { AuthService, MobileStorageAdapter, AuthProvider } from '@my-many-books/shared-auth';

const authService = new AuthService({
  storage: new MobileStorageAdapter(),
  apiUrl: 'https://api.yourapp.com/api/v1',
});

export default function App() {
  return (
    <AuthProvider authService={authService} loadingComponent={<SplashScreen />}>
      <NavigationContainer>
        {/* Your navigation */}
      </NavigationContainer>
    </AuthProvider>
  );
}
```

## API

### AuthService

- `login(email, password)` - Authenticate user
- `register(userData)` - Register new user
- `logout()` - Log out and clear tokens
- `getAuthState()` - Get current authentication state
- `silentRefresh()` - Refresh access token
- `getIdToken()` - Get current ID token (auto-refresh if expired)
- `getAccessToken()` - Get current access token (auto-refresh if expired)

### useAuth Hook

- `user` - Current user object or null
- `loading` - Loading state
- `isAuthenticated` - Boolean authentication status
- `login(email, password)` - Login function
- `register(userData)` - Register function
- `logout()` - Logout function
- `refreshUser()` - Refresh user data

## Security

This library implements industry-standard security practices:

- Access tokens stored in memory (XSS-safe)
- Refresh tokens in HttpOnly cookies (XSS-safe, CSRF-protected)
- Automatic token refresh
- SameSite=Strict cookie policy
- Secure flag in production

## License

MIT
