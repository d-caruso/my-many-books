# Performance Optimization Plan - My Many Books Web App

**Date:** November 11, 2025
**Status:** 🔴 CRITICAL - Immediate Action Required
**Author:** Performance Analysis Team

---

## Executive Summary

### Current Performance Metrics (CRITICAL)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **First Contentful Paint (FCP)** | 40.5s | <1.8s | 🔴 2,150% over target |
| **Largest Contentful Paint (LCP)** | 79.2s | <2.5s | 🔴 3,068% over target |
| **Total Blocking Time (TBT)** | 7,730ms | <200ms | 🔴 3,765% over target |
| **Speed Index (SI)** | 49.3s | <3.4s | 🔴 1,350% over target |

### Root Cause Analysis

The application suffers from a **single, massive JavaScript bundle (1.7MB)** with:
- ❌ No code splitting
- ❌ No lazy loading of routes
- ❌ All translations loaded synchronously
- ❌ All admin pages loaded for regular users
- ❌ Heavy dependencies loaded upfront

### Expected Impact of Fixes

Implementing critical and high-priority fixes will result in:
- **Bundle Size:** 1.7MB → 300-400KB (77-82% reduction)
- **FCP:** 40.5s → ~1.5s (96% improvement)
- **LCP:** 79.2s → ~2s (97% improvement)
- **TBT:** 7,730ms → ~150ms (98% improvement)
- **Speed Index:** 49.3s → ~2.5s (95% improvement)

**Estimated Development Time:** 4-6 hours

---

## Critical Issues (Priority 1 - Fix Immediately)

### Issue 1.1: No Code Splitting - Single 1.7MB Bundle

**Severity:** 🔴 CRITICAL
**Impact:** Primary cause of all performance issues
**File:** `apps/web-app/vite.config.ts` (lines 33-35)
**Estimated Fix Time:** 30 minutes

#### Problem

```typescript
// Current vite.config.ts
build: {
  outDir: 'build',
  // NO manualChunks configuration
  // NO code splitting strategy
},
```

**Build Output:**
```
vite v5.2.0 building for production...
✓ 1250 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-DiGlW8bH.css   37.55 kB │ gzip:  7.26 kB
dist/assets/index-CqPnVqmT.js 1,770.77 kB │ gzip: 521.85 kB

(!) Some chunks are larger than 500 KB after minification.
```

#### Solution

Add vendor chunking strategy to split large dependencies:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core (300-400KB)
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // Material UI (400-500KB)
          'vendor-mui': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          // AWS Amplify (300-400KB)
          'vendor-aws': [
            'aws-amplify',
            '@aws-amplify/auth',
            '@aws-amplify/ui-react'
          ],
          // Internationalization (100-150KB)
          'vendor-i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector'
          ],
          // Barcode scanner (200-300KB)
          'vendor-barcode': [
            '@zxing/browser',
            '@zxing/library'
          ],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
```

#### Expected Result

Bundle will be split into:
- `index.js` - Application code (~200-300KB)
- `vendor-react.js` - React libraries (~300KB)
- `vendor-mui.js` - Material UI (~400KB)
- `vendor-aws.js` - AWS Amplify (~300KB)
- `vendor-i18n.js` - Translations (~100KB)
- `vendor-barcode.js` - Scanner (~200KB)

**Total:** Same size, but parallel downloads and better caching.

---

### Issue 1.2: All Routes Loaded Synchronously

**Severity:** 🔴 CRITICAL
**Impact:** Users load admin pages they'll never access
**File:** `apps/web-app/src/App.tsx` (lines 9-16)
**Estimated Fix Time:** 45 minutes

#### Problem

```typescript
// All imports are synchronous - loaded immediately
import { AuthPage } from './pages/AuthPage';
import { BooksPage } from './pages/BooksPage';
import { BookSearchPage } from './components/Search/BookSearchPage';
import { ScannerModal } from './components/Scanner';
import { AdminDashboardPage } from './pages/Admin';
import { UserManagementPage } from './pages/Admin/UserManagementPage';
import { BookManagementPage } from './pages/Admin/BookManagementPage';
import { AdminSettingsPage } from './pages/Admin/AdminSettingsPage';
```

**Impact:**
- Regular users download admin code they can't access
- All routes loaded before any rendering
- Scanner loaded even if never used

#### Solution

Implement route-based code splitting with React.lazy:

```typescript
// App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// Lazy load all pages
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const BooksPage = React.lazy(() => import('./pages/BooksPage'));
const BookSearchPage = React.lazy(() => import('./components/Search/BookSearchPage'));
const ScannerModal = React.lazy(() => import('./components/Scanner'));

// Admin pages - only loaded for admin users
const AdminDashboardPage = React.lazy(() => import('./pages/Admin'));
const UserManagementPage = React.lazy(() => import('./pages/Admin/UserManagementPage'));
const BookManagementPage = React.lazy(() => import('./pages/Admin/BookManagementPage'));
const AdminSettingsPage = React.lazy(() => import('./pages/Admin/AdminSettingsPage'));

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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ApiProvider>
          <AuthErrorBoundary>
            <AuthProvider>
              <Router>
                <div className="min-h-screen">
                  <a href="#main-content" className="sr-only">
                    {t('accessibility:skip_to_main')}
                  </a>
                  <main id="main-content" tabIndex={-1}>
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/" element={<ProtectedRoute><BooksPage /></ProtectedRoute>} />
                        <Route path="/search" element={<ProtectedRoute><BookSearchPage /></ProtectedRoute>} />

                        {/* Admin routes */}
                        <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
                        <Route path="/admin/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
                        <Route path="/admin/books" element={<ProtectedRoute><BookManagementPage /></ProtectedRoute>} />
                        <Route path="/admin/settings" element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
                      </Routes>
                    </Suspense>
                  </main>
                </div>
              </Router>
            </AuthProvider>
          </AuthErrorBoundary>
        </ApiProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

#### Expected Result

- **Initial bundle:** Only loads AuthPage code
- **After login:** Loads BooksPage chunk
- **Admin routes:** Only loaded for admin users
- **Scanner:** Only loaded when scanning

**Bundle reduction:** ~30-40% smaller initial load

---

### Issue 1.3: Synchronous i18n Initialization Blocks Rendering

**Severity:** 🔴 CRITICAL
**Impact:** All 22 translation files loaded before render
**Files:**
- `apps/web-app/src/i18n.ts` (lines 1-79)
- `apps/web-app/src/App.tsx` (line 20)
**Estimated Fix Time:** 1 hour

#### Problem

```typescript
// i18n.ts - ALL translations imported synchronously
import enCommon from '@my-many-books/shared-i18n/src/locales/en/common.json';
import enValidation from '@my-many-books/shared-i18n/src/locales/en/validation.json';
import enErrors from '@my-many-books/shared-i18n/src/locales/en/errors.json';
import enBooks from '@my-many-books/shared-i18n/src/locales/en/books.json';
import enScanner from '@my-many-books/shared-i18n/src/locales/en/scanner.json';
import enPwa from '@my-many-books/shared-i18n/src/locales/en/pwa.json';
import enDialogs from '@my-many-books/shared-i18n/src/locales/en/dialogs.json';
import enPages from '@my-many-books/shared-i18n/src/locales/en/pages.json';
import enTheme from '@my-many-books/shared-i18n/src/locales/en/theme.json';
import enSearch from '@my-many-books/shared-i18n/src/locales/en/search.json';
import enAccessibility from '@my-many-books/shared-i18n/src/locales/en/accessibility.json';
// ... and ALL Italian translations

// App.tsx
import './i18n';  // Blocks until ALL translations loaded
```

**Impact:**
- 22 JSON files (11 namespaces × 2 languages) = ~1,176 lines
- Loads scanner translations even if never scanning
- Loads admin translations for regular users
- ~100-150KB of JSON data upfront

#### Solution - Option A: HTTP Backend (Recommended)

Install backend loader:
```bash
npm install i18next-http-backend
```

Update i18n configuration:

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)  // Enable HTTP backend
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',  // Path to translations
    },
    fallbackLng: 'en',
    ns: ['common'],  // Only load 'common' namespace initially
    defaultNS: 'common',

    // Load other namespaces on-demand
    partialBundledLanguages: true,

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,  // Use Suspense for async loading
    },
  });

export default i18n;
```

Copy translations to public folder:
```bash
# In vite.config.ts or build script
mkdir -p public/locales/en
mkdir -p public/locales/it
cp -r libs/shared-i18n/src/locales/en/* public/locales/en/
cp -r libs/shared-i18n/src/locales/it/* public/locales/it/
```

#### Solution - Option B: Dynamic Imports (Alternative)

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Create a custom backend that uses dynamic imports
const DynamicBackend = {
  type: 'backend',
  init: () => {},
  read: async (language, namespace, callback) => {
    try {
      const translation = await import(
        `@my-many-books/shared-i18n/src/locales/${language}/${namespace}.json`
      );
      callback(null, translation.default);
    } catch (error) {
      callback(error, null);
    }
  },
};

i18n
  .use(DynamicBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    ns: ['common'],  // Only 'common' loaded initially
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
```

#### Expected Result

- **Initial load:** Only `common` namespace (~10KB instead of 150KB)
- **On-demand:** Other namespaces loaded when needed
- **Caching:** Translations cached in browser after first load

**Load time reduction:** 90% for i18n initialization

---

### Issue 1.4: Scanner Always Loaded

**Severity:** 🔴 CRITICAL
**Impact:** 26MB barcode scanner library loaded upfront
**File:** `apps/web-app/src/App.tsx` (line 13)
**Estimated Fix Time:** 15 minutes

#### Problem

```typescript
// Scanner imported at top level - always loaded
import { ScannerModal } from './components/Scanner';
```

**Impact:**
- ZXing library (~26MB source) loaded immediately
- WASM/WebAssembly code parsed upfront
- Most users never scan books

#### Solution

Already included in Issue 1.2 solution (lazy loading), but emphasize:

```typescript
// Lazy load scanner only when needed
const ScannerModal = React.lazy(() => import('./components/Scanner'));

// In component that opens scanner
const [showScanner, setShowScanner] = useState(false);

<Suspense fallback={<CircularProgress />}>
  {showScanner && <ScannerModal onClose={() => setShowScanner(false)} />}
</Suspense>
```

#### Expected Result

- Scanner only loads when user clicks "Scan" button
- ~200-300KB saved from initial bundle

---

## High Priority Issues (Priority 2 - Fix Soon)

### Issue 2.1: MUI Icons Barrel Imports

**Severity:** 🟡 HIGH
**Impact:** Larger bundle due to suboptimal tree-shaking
**Files:** Multiple component files
**Estimated Fix Time:** 30 minutes

#### Problem

```typescript
// Current - barrel import
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MenuBook as BookIcon
} from '@mui/icons-material';
```

**Impact:**
- Barrel imports may include more code than needed
- Tree-shaking not always optimal

#### Solution

Use individual icon imports:

```typescript
// Optimized - direct imports
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuBookIcon from '@mui/icons-material/MenuBook';
```

#### Files to Update

Search for `@mui/icons-material` barrel imports:
```bash
grep -r "from '@mui/icons-material'" apps/web-app/src --include="*.tsx" --include="*.ts"
```

**Affected files (estimated 15-20 files):**
- BookCard.tsx
- Navbar.tsx
- AdminLayout.tsx
- BookForm.tsx
- And others...

#### Expected Result

- 5-10% reduction in MUI-related bundle size
- Better tree-shaking

---

### Issue 2.2: AWS Amplify Full Suite

**Severity:** 🟡 HIGH
**Impact:** Potentially loading unused Amplify features
**Package:** `aws-amplify` (49MB source)
**Estimated Fix Time:** 1 hour (requires testing)

#### Problem

```json
// package.json
"aws-amplify": "^6.0.0",
"@aws-amplify/auth": "^6.0.0",
"@aws-amplify/ui-react": "^6.0.0"
```

**Question:** Do you use all Amplify features or just Auth?

#### Solution Options

**Option A:** If only using Auth, remove full Amplify:
```bash
npm uninstall aws-amplify
# Keep only what's needed
npm install @aws-amplify/auth
```

**Option B:** If using multiple features, ensure tree-shaking works:
```typescript
// Use modular imports
import { Amplify } from '@aws-amplify/core';
import { Auth } from '@aws-amplify/auth';

// Instead of
import { Amplify, Auth } from 'aws-amplify';
```

#### Expected Result

- Potential 20-30% reduction in AWS-related code

---

### Issue 2.3: Amplify Config Blocks Startup

**Severity:** 🟡 HIGH
**Impact:** Configuration runs before React renders
**File:** `apps/web-app/src/index.tsx` (lines 6-9)
**Estimated Fix Time:** 20 minutes

#### Problem

```typescript
// index.tsx
import { configureAmplify } from './config/amplify';

// Configure Amplify before rendering the app
configureAmplify();  // SYNCHRONOUS - blocks render
```

#### Solution

Move configuration to async initialization:

```typescript
// index.tsx - Remove synchronous config

// AuthProvider.tsx
import { useEffect } from 'react';
import { configureAmplify } from '../config/amplify';

export const AuthProvider = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Configure asynchronously after mount
    configureAmplify();
    setIsConfigured(true);
  }, []);

  if (!isConfigured) {
    return <CircularProgress />; // Show loading while configuring
  }

  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
};
```

#### Expected Result

- React renders immediately
- Amplify configures in background
- ~50-100ms faster initial render

---

## Medium Priority Issues (Priority 3 - Optimize Later)

### Issue 3.1: No Virtualization for Book Lists

**Severity:** 🟢 MEDIUM
**Impact:** Large lists render all items at once
**File:** `apps/web-app/src/components/Book/BookList.tsx` (lines 100-127)
**Estimated Fix Time:** 2 hours

#### Current Situation

```typescript
// Renders ALL books at once
{books.map((book) => (
  <BookCard key={book.id} book={book} />
))}
```

**Current Mitigation:**
- Pagination implemented (10 items default)
- Not critical due to small page size

#### When to Implement

If users commonly:
- Load 50+ books per page
- Scroll through long lists
- Experience lag when scrolling

#### Solution

Use virtual scrolling library:

```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const BookList = ({ books }) => {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: books.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated height of BookCard
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <BookCard book={books[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### Expected Result

- Renders only visible items + buffer
- Smooth scrolling for 1000+ items
- Memory usage reduction

---

### Issue 3.2: Auth State Not Cached

**Severity:** 🟢 MEDIUM
**Impact:** Auth check on every mount adds 200-500ms
**File:** `apps/web-app/src/contexts/AuthContext.tsx` (lines 41-88)
**Estimated Fix Time:** 1 hour

#### Problem

```typescript
useEffect(() => {
  checkAuthState();  // Fetches from Cognito on every mount
}, []);
```

#### Solution

Implement auth caching:

```typescript
const AUTH_CACHE_KEY = 'auth_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const checkAuthState = async () => {
  // Check cache first
  const cached = localStorage.getItem(AUTH_CACHE_KEY);
  if (cached) {
    const { user, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      setUser(user);
      setLoading(false);
      // Refresh in background
      refreshAuthInBackground();
      return;
    }
  }

  // Fetch fresh if no cache
  const currentUser = await getCurrentUser();
  // ... fetch and update

  // Cache result
  localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
    user: currentUser,
    timestamp: Date.now()
  }));
};
```

#### Expected Result

- Instant auth state from cache
- Background refresh
- Better UX on page reload

---

### Issue 3.3: Multiple Theme Variants Loaded

**Severity:** 🟢 MEDIUM (LOW impact)
**Impact:** 7 theme definitions loaded, only 1 used
**File:** `apps/web-app/src/index.css` (536 lines)
**Estimated Fix Time:** 1 hour

#### Problem

```css
/* ALL themes loaded even though only one is used */
:root { /* Default theme */ }
[data-theme="dark"] { /* Dark theme */ }
[data-theme="bookish"] { /* Bookish theme */ }
[data-theme="forest"] { /* Forest theme */ }
[data-theme="ocean"] { /* Ocean theme */ }
[data-theme="sunset"] { /* Sunset theme */ }
[data-theme="lavender"] { /* Lavender theme */ }
```

**Impact:** 37.55 KB CSS (7.26 KB gzipped)

#### Solution

**Option A:** Use MUI theme system (already implemented!)
- Remove CSS theme variants
- Use MUI theme switching
- Smaller CSS file

**Option B:** Load themes dynamically
```typescript
const loadTheme = async (themeName: string) => {
  const theme = await import(`./themes/${themeName}.css`);
  // Apply theme
};
```

#### Expected Result

- 5-10KB smaller CSS
- Marginal improvement (gzipped)

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)

**Day 1-2: Code Splitting & Lazy Loading**
- [ ] Task 1.1: Update vite.config.ts with manualChunks (30 min)
- [ ] Task 1.2: Convert App.tsx to use React.lazy (45 min)
- [ ] Task 1.3: Add loading fallbacks (15 min)
- [ ] Task 1.4: Test build and measure bundle sizes (30 min)

**Deliverable:** Bundles split, initial load reduced by 60-70%

**Day 3: i18n Optimization**
- [ ] Task 2.1: Install i18next-http-backend (5 min)
- [ ] Task 2.2: Refactor i18n.ts for async loading (45 min)
- [ ] Task 2.3: Copy translations to public folder (10 min)
- [ ] Task 2.4: Test language switching (20 min)

**Deliverable:** Translations load on-demand, 90% faster i18n init

**Day 4: Icon Optimization**
- [ ] Task 3.1: Find all barrel imports (10 min)
- [ ] Task 3.2: Replace with individual imports (30 min)
- [ ] Task 3.3: Test and verify no regressions (15 min)

**Deliverable:** Optimized MUI icon tree-shaking

**Day 5: Testing & Measurement**
- [ ] Task 4.1: Run Lighthouse audit (15 min)
- [ ] Task 4.2: Test on slow 3G network (30 min)
- [ ] Task 4.3: Verify all routes load correctly (30 min)
- [ ] Task 4.4: Document improvements (30 min)

**Deliverable:** Performance report showing 90%+ improvement

### Phase 2: High Priority (Week 2)

**AWS Amplify Review**
- [ ] Assess if full Amplify suite needed
- [ ] Consider switching to modular imports
- [ ] Move config to async initialization

**Testing & Validation**
- [ ] Cross-browser testing
- [ ] Mobile performance testing
- [ ] Slow network simulation

### Phase 3: Medium Priority (Week 3-4)

**Virtual Scrolling** (if needed)
- [ ] Implement react-virtual for book lists
- [ ] Test with large datasets

**Auth Caching**
- [ ] Implement localStorage caching
- [ ] Background refresh strategy

**CSS Optimization**
- [ ] Review theme system
- [ ] Remove unused CSS

---

## Success Metrics

### Before Optimization

| Metric | Value | Score |
|--------|-------|-------|
| FCP | 40.5s | 0/100 |
| LCP | 79.2s | 0/100 |
| TBT | 7,730ms | 0/100 |
| SI | 49.3s | 0/100 |
| Bundle Size | 1.7MB | - |
| **Overall Performance** | **~5/100** | 🔴 |

### After Critical Fixes (Target)

| Metric | Value | Score |
|--------|-------|-------|
| FCP | <1.5s | 90-100 |
| LCP | <2.0s | 90-100 |
| TBT | <150ms | 90-100 |
| SI | <2.5s | 90-100 |
| Initial Bundle | <300KB | - |
| **Overall Performance** | **90-100/100** | 🟢 |

### Key Performance Indicators (KPIs)

- ✅ **FCP < 1.8s** - User sees content quickly
- ✅ **LCP < 2.5s** - Main content visible fast
- ✅ **TBT < 200ms** - Page interactive quickly
- ✅ **Bundle < 500KB** - Fast download on slow networks

---

## Testing Strategy

### Local Testing

```bash
# 1. Production build
npm run build

# 2. Serve production build
npx serve -s build

# 3. Run Lighthouse
npx lighthouse http://localhost:3000 --only-categories=performance --view

# 4. Check bundle sizes
ls -lh build/assets/
```

### Network Simulation

Test on various network speeds:
- Fast 3G: 1.6 Mbps
- Slow 3G: 400 Kbps
- 4G: 4 Mbps

Chrome DevTools → Network → Throttling

### Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  react(),
  visualizer({ open: true }),
],

# Build and view
npm run build
# Opens stats.html showing bundle composition
```

---

## Monitoring & Maintenance

### Continuous Monitoring

1. **Add bundle size checks to CI/CD**
   ```bash
   # In CI pipeline
   npm run build
   bundlesize=$(ls -lh build/assets/index-*.js | awk '{print $5}')
   if [ "$bundlesize" -gt 500000 ]; then
     echo "Bundle too large!"
     exit 1
   fi
   ```

2. **Regular Lighthouse audits**
   - Run monthly performance audits
   - Track metrics over time
   - Set up alerts for regressions

3. **Real User Monitoring (RUM)**
   - Consider adding performance monitoring
   - Track Core Web Vitals in production
   - Use tools like Sentry, DataDog, or New Relic

### Prevention Strategies

- ✅ Review bundle size before merging PRs
- ✅ Use dynamic imports for large features
- ✅ Keep dependencies up to date
- ✅ Avoid large UI libraries unless necessary
- ✅ Regular performance audits (monthly)

---

## References & Resources

### Documentation
- [Vite - Building for Production](https://vitejs.dev/guide/build.html)
- [React.lazy - Code Splitting](https://react.dev/reference/react/lazy)
- [i18next - Lazy Loading](https://www.i18next.com/how-to/add-or-load-translations#lazy-load-in-memory-translations)
- [Web.dev - Core Web Vitals](https://web.dev/vitals/)

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Bundle Analyzer](https://github.com/btd/rollup-plugin-visualizer)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

---

## Appendix: Quick Reference

### Critical File Locations

| File | Line | Issue | Priority |
|------|------|-------|----------|
| `vite.config.ts` | 33-35 | No code splitting | P1 |
| `App.tsx` | 9-16 | Synchronous route imports | P1 |
| `i18n.ts` | 1-79 | All translations loaded | P1 |
| `App.tsx` | 13 | Scanner always loaded | P1 |
| `BookCard.tsx` | 17-20 | Icon barrel imports | P2 |
| `index.tsx` | 6-9 | Amplify blocks startup | P2 |
| `BookList.tsx` | 100-127 | No virtualization | P3 |

### Command Cheat Sheet

```bash
# Build for production
npm run build

# Analyze bundle
npm run build -- --mode analyze

# Serve production locally
npx serve -s build

# Run Lighthouse
npx lighthouse http://localhost:3000 --only-categories=performance

# Check bundle sizes
ls -lh build/assets/

# Find large dependencies
npx bundle-phobia [package-name]
```

---

**Last Updated:** November 11, 2025
**Next Review:** After Phase 1 implementation
**Owner:** Development Team
