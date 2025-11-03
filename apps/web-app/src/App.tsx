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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ApiProvider>
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
                path="/admin/*"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboardPage />
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
                        <Route path="/" element={<BooksPage />} />
                        <Route path="/search" element={<BookSearchPage />} />
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
      </ApiProvider>
    </ThemeProvider>
  );
}

export default App;