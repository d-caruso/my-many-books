import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineIndicator } from '../../../components/PWA/OfflineIndicator';
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
vi.mock('@mui/icons-material/WifiOff', () => ({
  default: () => <div data-testid="wifi-off-icon">Offline</div>,
}));

vi.mock('@mui/icons-material/Wifi', () => ({
  default: () => <div data-testid="wifi-icon">Online</div>,
}));

vi.mock('@mui/icons-material/CloudOff', () => ({
  default: () => <div data-testid="cloud-off-icon">Cloud Off</div>,
}));

vi.mock('@mui/icons-material/Refresh', () => ({
  default: () => <div data-testid="refresh-icon">Refresh</div>,
}));

vi.mock('@mui/icons-material/Close', () => ({
  default: () => <div data-testid="close-icon">Close</div>,
}));

const mockUsePWAContext = vi.mocked(usePWAContext);

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
    mockUsePWAContext.mockReturnValue(mockPWAState);
  });

  test('does not render when online', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: false,
    });

    const { container } = render(<OfflineIndicator />);

    expect(container).toBeEmptyDOMElement();
  });

  test('renders offline indicator when offline', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator />);

    expect(screen.getByTestId('alert-warning')).toBeInTheDocument();
    expect(screen.getByText('You are currently offline')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  test('shows offline message and functionality info', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator />);

    expect(screen.getByText('Some features may be limited')).toBeInTheDocument();
  });

  test('renders as snackbar variant', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator variant="snackbar" />);

    expect(screen.getByTestId('snackbar')).toBeInTheDocument();
  });

  test('shows retry button when enabled', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator showRetry={true} />);

    expect(screen.getByTestId('alert-action')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('handles retry action', () => {
    const mockOnRetry = vi.fn();
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator showRetry={true} onRetry={mockOnRetry} />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  test('shows close button when dismissible', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator dismissible={true} />);

    expect(screen.getByTestId('alert-close')).toBeInTheDocument();
  });

  test('handles dismiss action', () => {
    const mockOnDismiss = vi.fn();
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator dismissible={true} onDismiss={mockOnDismiss} />);

    const closeButton = screen.getByTestId('alert-close');
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test('shows custom offline message', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator message="Custom offline message" />);

    expect(screen.getByText('Custom offline message')).toBeInTheDocument();
  });

  test('handles network status changes', () => {
    const { rerender } = render(<OfflineIndicator />);

    // Go offline
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    rerender(<OfflineIndicator />);
    expect(screen.getByTestId('alert-warning')).toBeInTheDocument();

    // Go back online
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: false,
    });

    rerender(<OfflineIndicator />);
    expect(screen.queryByTestId('alert-warning')).not.toBeInTheDocument();
  });
});