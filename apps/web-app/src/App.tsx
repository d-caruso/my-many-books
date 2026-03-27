import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@my-many-books/shared-auth';
import { APP_ROUTES } from '@my-many-books/shared-navigation';
import { authService } from './services/authService';
import { ApiProvider, useApi } from './contexts/ApiContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { PWAProvider } from './contexts/PWAContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { AuthErrorBoundary } from './components/ErrorBoundary/AuthErrorBoundary';
import { PageErrorBoundary } from './components/ErrorBoundary/PageErrorBoundary';
import { NativeLoading } from './components/NativeLoading';
import { AboutPopupGate } from './components/About/AboutPopupGate';
import { AppShellSkeleton } from './components/AppShellSkeleton';
import { Box } from '@mui/material';
import { runFadeOut, useFadeInOnChange, useLanguageChangeFade } from './hooks/useLanguageChangeFade';
import { ViewTransitionProvider, useProtectedViewTransition } from './contexts/ViewTransitionContext';
import { VIEW_TRANSITION_FADE_IN_TIMING, VIEW_TRANSITION_FADE_OUT_LEAD_MS } from './constants/animations';

// Eager load MUI theme wrapper (always needed on landing page)
import { ThemedApp } from './components/ThemedApp';
import i18n from './i18n';

// Lazy load error fallback (only shown on errors)
const RootErrorFallback = lazy(() => import('./components/ErrorBoundary/RootErrorFallback').then(m => ({ default: m.RootErrorFallback })));

// Eager load auth page — landing page for unauthenticated users
import AuthPage from './pages/AuthPage';
import { Navbar } from './components/Navigation';

// Lazy load non-landing pages for route-based code splitting
const BooksPage = lazy(() => import('./pages/BooksPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const BookSearchPage = lazy(() => import('./components/Search/BookSearchPage'));
const ScannerModal = lazy(() => import('./components/Scanner'));

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

const ScannerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fadeOutMainContent, runMainContentTransition } = useProtectedViewTransition();
  const { bookAPI } = useApi();
  const didNavigate = useRef(false);
  const scannerParams = new URLSearchParams(location.search);
  const returnTo = scannerParams.get('returnTo');

  const handleScanSuccess = async (result: { isbn: string }) => {
    if (didNavigate.current) {
      return;
    }

    didNavigate.current = true;
    fadeOutMainContent();

    const [copyStatus, book] = await Promise.all([
      navigator.clipboard?.writeText
        ? navigator.clipboard.writeText(result.isbn).then(() => 'success' as const).catch(() => 'failed' as const)
        : Promise.resolve('failed' as const),
      bookAPI.searchByISBN(result.isbn).catch(() => null),
      new Promise<void>(resolve => setTimeout(resolve, VIEW_TRANSITION_FADE_OUT_LEAD_MS)),
    ]);

    const commonParams = { scannerSource: 'scanner', scannerCopy: copyStatus };

    if (book) {
      navigate(`/search?${new URLSearchParams({ isbn: result.isbn, ...commonParams }).toString()}`);
    } else {
      navigate(`/?${new URLSearchParams({ mode: 'add', isbn: result.isbn, ...commonParams }).toString()}`);
    }
  };

  return (
    <ScannerModal
      isOpen={true}
      onClose={() => {
        if (didNavigate.current) {
          return;
        }

        if (returnTo === 'add-book') {
          runMainContentTransition(() => {
            navigate('/?mode=add&restoreDraft=1', { replace: true });
          });
          return;
        }

        runMainContentTransition(() => {
          navigate(-1);
        });
      }}
      onScanSuccess={(result) => { void handleScanSuccess(result); }}
      onScanError={() => {}}
    />
  );
};

const ProtectedMainContent: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const routeTransitionKey = useMemo(() => {
    if (location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      const mode = params.get('mode') ?? '';
      return `${location.pathname}?mode=${mode}`;
    }

    return location.pathname;
  }, [location.pathname, location.search]);
  const languageFadeSx = useLanguageChangeFade(mainRef, { keyframePrefix: 'protectedMainLangFade' });
  const fadeSx = useFadeInOnChange(mainRef, routeTransitionKey, {
    keyframePrefix: 'protectedMainViewFade',
    fadeInTiming: VIEW_TRANSITION_FADE_IN_TIMING,
  });
  const transitionTimeoutRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
  }, []);
  const contextValue = useMemo(
    () => ({
      fadeOutMainContent: () => runFadeOut(mainRef.current, 'protectedMainViewFade'),
      runMainContentTransition: (action: () => void) => {
        runFadeOut(mainRef.current, 'protectedMainViewFade');

        if (transitionTimeoutRef.current !== null) {
          window.clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = window.setTimeout(() => {
          transitionTimeoutRef.current = null;
          action();
        }, VIEW_TRANSITION_FADE_OUT_LEAD_MS);
      },
    }),
    []
  );

  return (
    <ViewTransitionProvider value={contextValue}>
      <Box
        component="main"
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        sx={{ width: '100%', minWidth: 0, ...languageFadeSx, ...fadeSx }}
      >
        {children}
      </Box>
    </ViewTransitionProvider>
  );
};

function App() {
  // Background-load namespaces not needed on the auth page.
  // Fires after first render so auth view is not blocked, but namespaces are
  // ready in cache before the user navigates to the protected area.
  useEffect(() => {
    void i18n.loadNamespaces(['dialogs', 'categories']);
  }, []);

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

  // Hide HTML loading screen once auth has completed and real content has painted.
  // The AppShellSkeleton renders beneath the semi-transparent spinner during the wait.
  const onContentReady = useCallback((node: HTMLElement | null) => {
    if (node) {
      requestAnimationFrame(() => {
        document.body.classList.add('app-mounted');
      });
    }
  }, []);

  return (
    <ErrorBoundary fallback={(error, reset) => (
      <Suspense fallback={<NativeLoading />}>
        <RootErrorFallback error={error} reset={reset} />
      </Suspense>
    )}>
        <ThemedApp>
          <PWAProvider>
            <ApiProvider>
                  <AuthProvider authService={authService} loadingComponent={<AppShellSkeleton />}>
                  <SettingsProvider>
                  <Router>
                    <AuthErrorBoundary>
                    <Box ref={onContentReady} sx={{ minHeight: '100vh', position: 'relative' }}>
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

                      <Suspense fallback={null}>
                        <Routes>
                          {/* Public routes */}
                          <Route path={APP_ROUTES.auth.path} element={<AuthPage />} />
                          <Route path="/auth/verify" element={<VerifyEmailPage />} />
                          <Route path={APP_ROUTES['forgot-password'].path} element={<ForgotPasswordPage />} />
                          <Route path={APP_ROUTES['reset-password'].path} element={<ResetPasswordPage />} />

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
                                {/* First-access app explanation popup is user-app scoped, not admin scoped */}
                                <AboutPopupGate />
                                <Navbar />
                                <ProtectedMainContent>
                                  <Routes>
                                    <Route path={APP_ROUTES.home.path} element={<PageErrorBoundary pageName="Books"><BooksPage /></PageErrorBoundary>} />
                                    <Route path={APP_ROUTES.search.path} element={<PageErrorBoundary pageName="Book Search"><BookSearchPage /></PageErrorBoundary>} />
                                    <Route path="/scanner" element={<ScannerRoute />} />
                                    <Route path={APP_ROUTES.account.path} element={<PageErrorBoundary pageName="Account"><AccountPage /></PageErrorBoundary>} />
                                    <Route path="*" element={<Navigate to={APP_ROUTES.home.path} replace />} />
                                  </Routes>
                                </ProtectedMainContent>
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
                    </AuthErrorBoundary>
                  </Router>
                  </SettingsProvider>
                  </AuthProvider>
            </ApiProvider>
          </PWAProvider>
        </ThemedApp>
    </ErrorBoundary>
  );
}

export default App;
