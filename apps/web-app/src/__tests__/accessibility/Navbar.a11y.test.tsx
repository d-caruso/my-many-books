import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Navbar } from '../../components/Navigation/Navbar';
import { expectNoA11yViolations } from '../utils/axe-helper';

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock React Router hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/books' }),
}));

// Mock Material-UI components with proper accessibility
vi.mock('@mui/material', () => ({
  AppBar: ({ children, position, ...props }: any) => (
    <header data-testid="app-bar" data-position={position} {...props}>{children}</header>
  ),
  Toolbar: ({ children, ...props }: any) => (
    <div data-testid="toolbar" role="toolbar" {...props}>{children}</div>
  ),
  Typography: ({ children, variant, component, ...props }: any) => {
    const Component = component || 'div';
    return <Component data-testid={`typography-${variant}`} {...props}>{children}</Component>;
  },
  Button: ({ children, onClick, 'aria-label': ariaLabel, ...props }: any) => (
    <button data-testid="nav-button" onClick={onClick} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  ),
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, 'aria-expanded': ariaExpanded, 'aria-haspopup': ariaHaspopup, ...props }: any) => (
    <button
      data-testid="icon-button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      {...props}
    >
      {children}
    </button>
  ),
  Menu: ({ children, open, anchorEl, onClose, ...props }: any) => {
    return open ? (
      <ul data-testid="menu" role="menu" {...props}>{children}</ul>
    ) : null;
  },
  MenuItem: ({ children, onClick, value, ...props }: any) => {
    // For menu items in Menu component
    if (onClick) {
      return (
        <li data-testid="menu-item" role="menuitem" onClick={onClick} {...props}>
          {children}
        </li>
      );
    }
    // For select options
    return (
      <option data-testid="menu-item" value={value} {...props}>
        {children}
      </option>
    );
  },
  Box: ({ children, sx, component, ...props }: any) => {
    const Component = component || 'div';
    return <Component data-testid="box" style={sx} {...props}>{children}</Component>;
  },
  Avatar: ({ children, alt, ...props }: any) => {
    const label = alt || 'User avatar';
    return (
      <div data-testid="avatar" role="img" aria-label={label} {...props}>{children}</div>
    );
  },
  Select: ({ children, value, onChange, 'aria-label': ariaLabel, ...props }: any) => {
    const label = ariaLabel || 'Select language';
    return (
      <select
        data-testid="language-select"
        value={value}
        onChange={onChange}
        aria-label={label}
        {...props}
      >
        {children}
      </select>
    );
  },
}));

vi.mock('@mui/icons-material', () => ({
  MenuBook: () => <span data-testid="menu-book-icon" aria-hidden="true">📚</span>,
  Menu: () => <span data-testid="menu-icon" aria-hidden="true">☰</span>,
  ExpandMore: () => <span data-testid="expand-more-icon" aria-hidden="true">▼</span>,
  Language: () => <span data-testid="language-icon" aria-hidden="true">🌐</span>,
}));

import { useAuth } from '../../contexts/AuthContext';

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'books'],
  defaultNS: 'common',
  resources: {
    en: {
      common: {
        app_name: 'My Many Books',
        search: 'Search',
        scanner: 'Scanner',
        sign_out: 'Sign out',
      },
      books: {
        my_books: 'My Books',
      },
      accessibility: {
        user_avatar: 'User avatar',
        select_language: 'Select language',
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

describe('Navbar Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not have any accessibility violations when user is not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    } as any);

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations when user is authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
      },
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    } as any);

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations when user is admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        surname: 'User',
        role: 'admin',
      },
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    } as any);

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });
});
