import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navigation';
import { InstallPrompt, UpdatePrompt, OfflineIndicator } from './components/PWA';
import { ErrorBoundary, AuthErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary';
import { RootErrorFallback } from './components/ErrorBoundary/RootErrorFallback';
import './i18n';

// Lazy load all pages for route-based code splitting
const AuthPage = lazy(() => import('./pages/AuthPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const BookSearchPage = lazy(() => import('./components/Search/BookSearchPage'));
const ScannerModal = lazy(() => import('./components/Scanner'));

// Admin pages - only loaded for admin users
const AdminDashboardPage = lazy(() => import('./pages/Admin'));
const UserManagementPage = lazy(() => import('./pages/Admin/UserManagementPage'));
const BookManagementPage = lazy(() => import('./pages/Admin/BookManagementPage'));
const AdminSettingsPage = lazy(() => import('./pages/Admin/AdminSettingsPage'));

// Loading fallback component
const LoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0369a1', // Darker blue for better contrast (WCAG AA compliant)
    },
    secondary: {
      main: '#64748b',
    },
    warning: {
      main: '#BA580D', // Darker orange for better contrast (WCAG AA compliant)
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      disabled: '#6b7280', // Darker than default for WCAG AA compliance
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiChip: {
      styleOverrides: {
        colorWarning: {
          backgroundColor: '#BA580D', // Dark amber for WCAG AA compliance
          color: '#ffffff', // White text for maximum contrast
          '&:hover': {
            backgroundColor: '#92400e', // Darker on hover
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ErrorBoundary fallback={(error, reset) => <RootErrorFallback error={error} reset={reset} />}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ApiProvider>
          <AuthErrorBoundary>
            <AuthProvider>
              <Router>
          <div className="min-h-screen">
            {/* Skip to main content link for keyboard navigation */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded focus:shadow-lg"
            >
              Skip to main content
            </a>

            <OfflineIndicator />
            <UpdatePrompt />

            <Suspense fallback={<LoadingFallback />}>
              <Routes>
              {/* Public route */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Admin routes - require admin role */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/books"
                element={
                  <ProtectedRoute requireAdmin>
                    <BookManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <main id="main-content" tabIndex={-1}>
                      <Routes>
                        <Route path="/" element={<PageErrorBoundary pageName="Books"><BooksPage /></PageErrorBoundary>} />
                        <Route path="/search" element={<PageErrorBoundary pageName="Book Search"><BookSearchPage /></PageErrorBoundary>} />
                        <Route path="/scanner" element={<ScannerModal isOpen={true} onClose={() => window.history.back()} onScanSuccess={() => {}} onScanError={() => {}} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                  </ProtectedRoute>
                }
              />
            </Routes>
            </Suspense>

            <InstallPrompt />
          </div>
          </Router>
            </AuthProvider>
          </AuthErrorBoundary>
      </ApiProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;