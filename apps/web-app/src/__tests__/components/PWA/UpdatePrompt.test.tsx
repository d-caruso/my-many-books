import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { UpdatePrompt } from '../../../components/PWA/UpdatePrompt';
import { usePWAContext } from '../../../contexts/PWAContext';
import { setupMuiMock } from '../../test-utils/setupMuiMock';


// Mock the usePWAContext hook
vi.mock('../../../contexts/PWAContext', () => ({
  usePWAContext: vi.fn(),
}));

// Mock Material-UI components
setupMuiMock();

// Mock Material-UI icons
vi.mock('@mui/icons-material/SystemUpdate', () => ({
  default: () => <div data-testid="system-update-icon">Update</div>,
}));

vi.mock('@mui/icons-material/Refresh', () => ({
  default: () => <div data-testid="refresh-icon">Refresh</div>,
}));

vi.mock('@mui/icons-material/Close', () => ({
  default: () => <div data-testid="close-icon">Close</div>,
}));

vi.mock('@mui/icons-material/CheckCircle', () => ({
  default: () => <div data-testid="check-icon">Check</div>,
}));

const mockUsePWAContext = vi.mocked(usePWAContext);

describe('UpdatePrompt', () => {
  const mockUpdateApp = vi.fn();
  const mockDismissUpdate = vi.fn();

  const mockPWAState = {
    isOffline: false,
    isInstalled: false,
    isInstallable: false,
    updateAvailable: false,
    registration: null,
    installApp: vi.fn(),
    updateApp: mockUpdateApp,
    dismissUpdate: mockDismissUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePWAContext.mockReturnValue(mockPWAState);
  });

  test('does not render when no update available', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: false,
    });

    const { container } = render(<UpdatePrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  test('renders update prompt when update is available', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    render(<UpdatePrompt />);

    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
    expect(screen.getByText('App update available')).toBeInTheDocument();
    expect(screen.getByText('A new version is ready to install')).toBeInTheDocument();
  });

  test('shows update and dismiss buttons', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    render(<UpdatePrompt />);

    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
  });

  test('calls updateApp when update button is clicked', async () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    render(<UpdatePrompt />);

    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    expect(mockUpdateApp).toHaveBeenCalledTimes(1);
  });

  test('calls dismissUpdate when later button is clicked', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    render(<UpdatePrompt />);

    const laterButton = screen.getByText('Later');
    fireEvent.click(laterButton);

    expect(mockDismissUpdate).toHaveBeenCalledTimes(1);
  });

  test('renders as dialog variant', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    render(<UpdatePrompt variant="dialog" />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-actions')).toBeInTheDocument();
  });

  test('renders as snackbar variant', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    render(<UpdatePrompt variant="snackbar" />);

    expect(screen.getByTestId('snackbar')).toBeInTheDocument();
  });

  test('shows loading state during update', async () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    // Mock updateApp to return a promise that doesn't resolve immediately
    mockUpdateApp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<UpdatePrompt />);

    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByTestId('linear-progress')).toBeInTheDocument();
  });

  test('handles update errors', async () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    mockUpdateApp.mockRejectedValue(new Error('Update failed'));

    render(<UpdatePrompt />);

    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Update failed')).toBeInTheDocument();
  });

  test('shows custom update message', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    render(<UpdatePrompt message="New features are available!" />);

    expect(screen.getByText('New features are available!')).toBeInTheDocument();
  });

  test('handles component unmount during update', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      updateAvailable: true,
    });

    mockUpdateApp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    const { unmount } = render(<UpdatePrompt />);
    
    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    expect(() => unmount()).not.toThrow();
  });
});
