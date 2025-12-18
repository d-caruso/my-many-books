import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { RegisterForm } from '../../components/Auth/RegisterForm';
import { expectNoA11yViolations } from '../utils/axe-helper';
import { setupMuiMock } from '../test-utils/setupMuiMock';
import { useAuth } from '@my-many-books/shared-auth';

// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

setupMuiMock();

describe('RegisterForm Accessibility', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      register: vi.fn(),
      user: null,
      loading: false,
      error: null,
    } as any);
  });

  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations with error state', async () => {
    vi.mocked(useAuth).mockReturnValue({
      register: vi.fn(),
      user: null,
      loading: false,
      error: 'Email already exists',
    } as any);

    const { container } = render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations in loading state', async () => {
    vi.mocked(useAuth).mockReturnValue({
      register: vi.fn(),
      user: null,
      loading: true,
      error: null,
    } as any);

    const { container } = render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    await expectNoA11yViolations(container);
  });
});
