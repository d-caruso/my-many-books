import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { InstallPrompt } from '../../../components/PWA/InstallPrompt';
import { usePWAContext } from '../../../contexts/PWAContext';
import { setupMuiMock } from '../../test-utils/setupMuiMock';

vi.mock('../../../contexts/PWAContext', () => ({
  usePWAContext: vi.fn(),
}));

setupMuiMock();

vi.mock('@mui/icons-material/GetApp', () => ({
  default: () => <div data-testid="install-icon">Install</div>,
}));

vi.mock('@mui/icons-material/Close', () => ({
  default: () => <div data-testid="close-icon">Close</div>,
}));

const mockUsePWAContext = vi.mocked(usePWAContext);

describe('InstallPrompt', () => {
  const mockInstallApp = vi.fn();
  const mockPWAState = {
    isOffline: false,
    isInstalled: false,
    isInstallable: true,
    updateAvailable: false,
    registration: null,
    installApp: mockInstallApp,
    updateApp: vi.fn(),
    dismissUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    window.sessionStorage.clear();
    mockUsePWAContext.mockReturnValue(mockPWAState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders install prompt when installable', () => {
    render(<InstallPrompt />);

    expect(screen.getByText('Install App')).toBeInTheDocument();
    expect(screen.getByText(/Add/i)).toBeInTheDocument();
    expect(screen.getByText('My Many Books')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
  });

  test('can be dismissed and stays hidden for the session', () => {
    const { container, rerender } = render(<InstallPrompt />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(container).toBeEmptyDOMElement();
    expect(window.sessionStorage.getItem('pwa-install-prompt-dismissed')).toBe('1');

    rerender(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  test('calls installApp when install button is clicked', () => {
    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole('button', { name: /install/i }));
    expect(mockInstallApp).toHaveBeenCalledTimes(1);
  });

  test('does not render when already installed', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isInstalled: true,
    });

    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });
});
