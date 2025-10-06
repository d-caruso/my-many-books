import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineIndicator } from '../../../components/PWA/OfflineIndicator';
import { usePWA } from '../../../hooks/usePWA';

// Mock the usePWA hook
vi.mock('../../../hooks/usePWA', () => ({
  usePWA: vi.fn(),
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
  Slide: ({ children, direction, in: isIn, ...props }: any) => (
    isIn ? <div data-testid="slide" data-direction={direction} {...props}>{children}</div> : null
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
  IconButton: ({ children, onClick, size, color, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} data-size={size} data-color={color} {...props}>
      {children}
    </button>
  ),
  Chip: ({ label, color, variant, icon, onDelete, size, ...props }: any) => (
    <div data-testid="chip" data-color={color} data-variant={variant} data-size={size} {...props}>
      {icon && <span data-testid="chip-icon">{icon}</span>}
      {label}
      {onDelete && <button data-testid="chip-delete" onClick={onDelete}>×</button>}
    </div>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
}));

// Mock Material-UI icons
vi.mock('@mui/icons-material', () => ({
  WifiOff: () => <div data-testid="wifi-off-icon">Offline</div>,
  Wifi: () => <div data-testid="wifi-icon">Online</div>,
  CloudOff: () => <div data-testid="cloud-off-icon">Cloud Off</div>,
  Refresh: () => <div data-testid="refresh-icon">Refresh</div>,
  Close: () => <div data-testid="close-icon">Close</div>,
}));

const mockUsePWA = vi.mocked(usePWA);

describe('OfflineIndicator', () => {
  const mockPWAState = {
    isOffline: false,
    isInstalled: false,
    isInstallable: false,
    updateAvailable: false,
    registration: null,
    installApp: vi.fn(),
    updateApp: vi.fn(),
    dismissUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePWA.mockReturnValue(mockPWAState);
  });

  test('does not render when online', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: false,
    });

    const { container } = render(<OfflineIndicator />);

    expect(container).toBeEmptyDOMElement();
  });

  test('renders offline indicator when offline', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator />);

    expect(screen.getByTestId('alert-warning')).toBeInTheDocument();
    expect(screen.getByText('You are currently offline')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  test('shows offline message and functionality info', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator />);

    expect(screen.getByText('Some features may be limited')).toBeInTheDocument();
  });

  test('renders as snackbar variant', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator variant="snackbar" />);

    expect(screen.getByTestId('snackbar')).toBeInTheDocument();
  });

  test('shows retry button when enabled', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator showRetry={true} />);

    expect(screen.getByTestId('alert-action')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('handles retry action', () => {
    const mockOnRetry = vi.fn();
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator showRetry={true} onRetry={mockOnRetry} />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  test('shows close button when dismissible', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator dismissible={true} />);

    expect(screen.getByTestId('alert-close')).toBeInTheDocument();
  });

  test('handles dismiss action', () => {
    const mockOnDismiss = vi.fn();
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator dismissible={true} onDismiss={mockOnDismiss} />);

    const closeButton = screen.getByTestId('alert-close');
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test('shows custom offline message', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator message="Custom offline message" />);

    expect(screen.getByText('Custom offline message')).toBeInTheDocument();
  });

  test('handles network status changes', () => {
    const { rerender } = render(<OfflineIndicator />);

    // Go offline
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    rerender(<OfflineIndicator />);
    expect(screen.getByTestId('alert-warning')).toBeInTheDocument();

    // Go back online
    mockUsePWA.mockReturnValue({
      ...mockPWAState,
      isOffline: false,
    });

    rerender(<OfflineIndicator />);
    expect(screen.queryByTestId('alert-warning')).not.toBeInTheDocument();
  });
});