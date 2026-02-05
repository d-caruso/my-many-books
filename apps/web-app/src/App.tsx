import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@my-many-books/shared-auth';
import { authService } from './services/authService';
import { ApiProvider } from './contexts/ApiContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { PWAProvider } from './contexts/PWAContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { AuthErrorBoundary } from './components/ErrorBoundary/AuthErrorBoundary';
import { PageErrorBoundary } from './components/ErrorBoundary/PageErrorBoundary';
import { NativeLoading } from './components/NativeLoading';
import { Box } from '@mui/material';

// Defer i18n initialization until after first render
let i18nInitialized = false;
const initI18n = async () => {
  if (!i18nInitialized) {
    await import('./i18n');
    i18nInitialized = true;
  }
};

// Lazy load MUI theme wrapper to defer 380KB MUI bundle
const ThemedApp = lazy(() => import('./components/ThemedApp').then(m => ({ default: m.ThemedApp })));

// Lazy load error fallback (only shown on errors)
const RootErrorFallback = lazy(() => import('./components/ErrorBoundary/RootErrorFallback').then(m => ({ default: m.RootErrorFallback })));

// Lazy load all pages for route-based code splitting
const AuthPage = lazy(() => import('./pages/AuthPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const BookSearchPage = lazy(() => import('./components/Search/BookSearchPage'));
const ScannerModal = lazy(() => import('./components/Scanner'));

// Lazy load Navbar (only for authenticated users)
const Navbar = lazy(() => import('./components/Navigation').then(m => ({ default: m.Navbar })));

// Lazy load PWA components (non-critical, rarely shown)
const InstallPrompt = lazy(() => import('./components/PWA').then(m => ({ default: m.InstallPrompt })));
const UpdatePrompt = lazy(() => import('./components/PWA').then(m => ({ default: m.UpdatePrompt })));
const OfflineIndicator = lazy(() => import('./components/PWA').then(m => ({ default: m.OfflineIndicator })));

// Admin pages - only loaded for admin users
const AdminDashboardPage = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminDashboardPage })));
const UserManagementPage = lazy(() => import('./pages/Admin/UserManagementPage'));
const BookManagementPage = lazy(() => import('./pages/Admin/BookManagementPage'));
const HooksPage = lazy(() =>
  import('./pages/Admin/Hooks/HooksPage').then(m => ({ default: m.HooksPage }))
);
const HookExecutionsPage = lazy(() =>
  import('./pages/Admin/Hooks/HookExecutions').then(m => ({ default: m.HookExecutions }))
);
const AdminSettingsPage = lazy(() => import('./pages/Admin/AdminSettingsPage'));
const MobileHookDashboardPage = lazy(() =>
  import('./pages/Admin/MobileHooks/MobileHookDashboardPage').then(m => ({ default: m.MobileHookDashboardPage }))
);
const HookConfigurationPage = lazy(() =>
  import('./pages/Admin/MobileHooks/HookConfigurationPage').then(m => ({ default: m.HookConfigurationPage }))
);
const HookAnalyticsPage = lazy(() =>
  import('./pages/Admin/MobileHooks/HookAnalyticsPage').then(m => ({ default: m.HookAnalyticsPage }))
);
const MobileHookTestingPage = lazy(() =>
  import('./pages/Admin/MobileHooks/MobileHookTestingPage').then(m => ({ default: m.MobileHookTestingPage }))
);
const MobileAnalyticsPage = lazy(() =>
  import('./pages/Admin/MobileAnalytics/MobileAnalyticsPage').then(m => ({ default: m.MobileAnalyticsPage }))
 );

function App() {
  const [appReady, setAppReady] = useState(false);
  const visuallyHidden = {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute' as const,
    width: 1,
  };

  useEffect(() => {
    // Initialize i18n (HTML loading screen shows during this)
    const initApp = async () => {
      await initI18n();
      setAppReady(true);
    };

    initApp();
  }, []);

  if (!appReady) {
    return <NativeLoading />;
  }

  return (
    <ErrorBoundary fallback={(error, reset) => (
      <Suspense fallback={<NativeLoading />}>
        <RootErrorFallback error={error} reset={reset} />
      </Suspense>
    )}>
      <Suspense fallback={<NativeLoading />}>
        <ThemedApp>
          <PWAProvider>
            <ApiProvider>
              <SettingsProvider>
                <AuthErrorBoundary>
                  <AuthProvider authService={authService} loadingComponent={<NativeLoading />}>
                  <Router>
                    <Box sx={{ minHeight: '100vh', position: 'relative' }}>
                      {/* Skip to main content link for keyboard navigation */}
                      <Box
                        component="a"
                        href="#main-content"
                        sx={{
                          ...visuallyHidden,
                          '&:focus-visible': {
                            left: 16,
                            top: 16,
                            width: 'auto',
                            height: 'auto',
                            padding: '8px 16px',
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                            borderRadius: 1,
                            boxShadow: 3,
                            zIndex: 1200,
                          },
                        }}
                      >
                        Skip to main content
                      </Box>

                      {/* PWA components - lazy loaded */}
                      <Suspense fallback={null}>
                        <OfflineIndicator />
                        <UpdatePrompt />
                      </Suspense>

                      <Suspense fallback={<NativeLoading />}>
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
                            path="/admin/hooks"
                            element={
                              <ProtectedRoute requireAdmin>
                                <HooksPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/hooks/:hookId/executions"
                            element={
                              <ProtectedRoute requireAdmin>
                                <HookExecutionsPage />
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
                          <Route
                            path="/admin/mobile-hooks"
                            element={
                              <ProtectedRoute requireAdmin>
                                <Navigate to="/admin/mobile-hooks/dashboard" replace />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/mobile-hooks/dashboard"
                            element={
                              <ProtectedRoute requireAdmin>
                                <MobileHookDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/mobile-hooks/configuration"
                            element={
                              <ProtectedRoute requireAdmin>
                                <HookConfigurationPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/mobile-hooks/analytics"
                            element={
                              <ProtectedRoute requireAdmin>
                                <HookAnalyticsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/mobile-hooks/testing"
                            element={
                              <ProtectedRoute requireAdmin>
                                <MobileHookTestingPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/mobile-analytics"
                            element={
                              <ProtectedRoute requireAdmin>
                                <MobileAnalyticsPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Protected routes */}
                          <Route
                            path="/*"
                            element={
                              <ProtectedRoute>
                                <Navbar />
                                <Box component="main" id="main-content" tabIndex={-1}>
                                  <Routes>
                                    <Route path="/" element={<PageErrorBoundary pageName="Books"><BooksPage /></PageErrorBoundary>} />
                                    <Route path="/search" element={<PageErrorBoundary pageName="Book Search"><BookSearchPage /></PageErrorBoundary>} />
                                    <Route path="/scanner" element={<ScannerModal isOpen={true} onClose={() => window.history.back()} onScanSuccess={() => {}} onScanError={() => {}} />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                  </Routes>
                                </Box>
                              </ProtectedRoute>
                            }
                          />
                        </Routes>
                      </Suspense>

                      {/* Lazy load Install Prompt (non-critical) */}
                      <Suspense fallback={null}>
                        <InstallPrompt />
                      </Suspense>
                    </Box>
                  </Router>
                  </AuthProvider>
                </AuthErrorBoundary>
              </SettingsProvider>
            </ApiProvider>
          </PWAProvider>
        </ThemedApp>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
