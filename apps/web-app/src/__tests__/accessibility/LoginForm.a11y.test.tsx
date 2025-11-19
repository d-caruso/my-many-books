import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../components/Auth/LoginForm';
import { expectNoA11yViolations } from '../utils/axe-helper';

import { useAuth } from '@my-many-books/shared-auth';

// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Paper: ({ children, elevation, ...props }: any) => (
    <div data-testid="paper" data-elevation={elevation} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  TextField: ({ label, value, onChange, error, helperText, type, id, ...props }: any) => (
    <div data-testid="text-field-container">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        data-testid="text-field"
        data-label={label}
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        {...props}
      />
      {error && <div id={`${id}-error`} role="alert">{error}</div>}
      {helperText && <div id={`${id}-helper`}>{helperText}</div>}
    </div>
  ),
  Button: ({ children, onClick, variant, disabled, loading, type, ...props }: any) => (
    <button
      type={type || 'button'}
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
  Link: ({ children, onClick, href, ...props }: any) => (
    <a href={href || '#'} onClick={onClick} {...props}>{children}</a>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div role="alert" data-severity={severity} {...props}>{children}</div>
  ),
}));

describe('LoginForm Accessibility', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      user: null,
      loading: false,
      error: null,
    } as any);
  });

  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations with error state', async () => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      user: null,
      loading: false,
      error: 'Invalid credentials',
    } as any);

    const { container } = render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations in loading state', async () => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      user: null,
      loading: true,
      error: null,
    } as any);

    const { container } = render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    await expectNoA11yViolations(container);
  });
});
