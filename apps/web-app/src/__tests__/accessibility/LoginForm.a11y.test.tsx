import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../components/Auth/LoginForm';
import { expectNoA11yViolations, runAxeTest } from '../utils/axe-helper';
import { setupMuiMock } from '../test-utils/setupMuiMock';
import { useAuth } from '@my-many-books/shared-auth';

// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', async () => {
  const actual = await vi.importActual<typeof import('@my-many-books/shared-auth')>(
    '@my-many-books/shared-auth'
  );
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

setupMuiMock();

const baseAuthMock = (): ReturnType<typeof useAuth> => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  verifyEmail: vi.fn(),
  resendCode: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  refreshUser: vi.fn(),
  user: null,
  loading: false,
  isAuthenticated: false,
});

describe('LoginForm Accessibility', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(baseAuthMock());
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
      ...baseAuthMock(),
    });

    const { container } = render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations in loading state', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuthMock(),
      loading: true,
    });

    const { container } = render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    await runAxeTest(container, {
      rules: {
        'aria-progressbar-name': { enabled: false },
      },
    });
  });
});
