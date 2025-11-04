import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navigation';
import { InstallPrompt, UpdatePrompt, OfflineIndicator } from './components/PWA';
import { AuthPage } from './pages/AuthPage';
import { BooksPage } from './pages/BooksPage';
import { BookSearchPage } from './components/Search/BookSearchPage';
import { ScannerModal } from './components/Scanner';
import { AdminDashboardPage } from './pages/Admin';
import { UserManagementPage } from './pages/Admin/UserManagementPage';
import { BookManagementPage } from './pages/Admin/BookManagementPage';
import { AdminSettingsPage } from './pages/Admin/AdminSettingsPage';
import { ErrorBoundary, AuthErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary';
import { RootErrorFallback } from './components/ErrorBoundary/RootErrorFallback';
import './i18n';

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#64748b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
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
            <OfflineIndicator />
            <UpdatePrompt />
            
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
                    <main>
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