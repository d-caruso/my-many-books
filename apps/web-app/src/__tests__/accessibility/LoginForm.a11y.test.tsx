import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../components/Auth/LoginForm';
import { expectNoA11yViolations } from '../utils/axe-helper';
import { setupMuiMock } from '../test-utils/setupMuiMock';
import { useAuth } from '@my-many-books/shared-auth';

// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

setupMuiMock();

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
