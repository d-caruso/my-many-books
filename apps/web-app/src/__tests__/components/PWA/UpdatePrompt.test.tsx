import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { UpdatePrompt } from '../../../components/PWA/UpdatePrompt';
import { usePWAContext } from '../../../contexts/PWAContext';

// Mock the usePWAContext hook
vi.mock('../../../contexts/PWAContext', () => ({
  usePWAContext: vi.fn(),
}));

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Alert: ({ children, severity, action, variant, onClose, ...props }: any) => (
    <div data-testid={`alert-${severity}`} data-variant={variant} {...props}>
      {children}
      {action && <div data-testid="alert-action">{action}</div>}
      {onClose && <button data-testid="alert-close" onClick={onClose}>×</button>}
    </div>
  ),
  Snackbar: ({ children, open, onClose, anchorOrigin, autoHideDuration, ...props }: any) => (
    open ? (
      <div 
        data-testid="snackbar" 
        data-anchor={`${anchorOrigin?.vertical}-${anchorOrigin?.horizontal}`}
        data-auto-hide={autoHideDuration}
        {...props}
      >
        {children}
        <button data-testid="snackbar-close" onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
  Dialog: ({ children, open, onClose, maxWidth, ...props }: any) => (
    open ? (
      <div data-testid="dialog" data-maxwidth={maxWidth} {...props}>
        {children}
        <button data-testid="dialog-backdrop" onClick={onClose} />
      </div>
    ) : null
  ),
  DialogTitle: ({ children, ...props }: any) => (
    <div data-testid="dialog-title" {...props}>{children}</div>
  ),
  DialogContent: ({ children, ...props }: any) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  DialogActions: ({ children, ...props }: any) => (
    <div data-testid="dialog-actions" {...props}>{children}</div>
  ),
  Button: ({ children, onClick, variant, color, disabled, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      data-color={color}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  LinearProgress: ({ variant, value, ...props }: any) => (
    <div data-testid="linear-progress" data-variant={variant} data-value={value} {...props} />
  ),
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
}));

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
    expect(screen.getByText('App Update Available')).toBeInTheDocument();
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
    expect(screen.getByText('Update Failed')).toBeInTheDocument();
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