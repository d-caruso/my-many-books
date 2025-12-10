import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineIndicator } from '../../../components/PWA/OfflineIndicator';
import { usePWAContext } from '../../../contexts/PWAContext';
import { setupMuiMock } from '../../test-utils/setupMuiMock';


// Mock the usePWAContext hook
vi.mock('../../../contexts/PWAContext', () => ({
  usePWAContext: vi.fn(),
}));

// Mock Material-UI components
setupMuiMock();

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

    const alert = screen.getByTestId('alert-warning');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('You are currently offline');
  });

  test('shows offline message and functionality info', () => {
    mockUsePWAContext.mockReturnValue({
      ...mockPWAState,
      isOffline: true,
    });

    render(<OfflineIndicator />);

    expect(screen.getByTestId('alert-warning')).toHaveTextContent('Some features may be limited');
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

    expect(screen.getByTestId('alert-warning')).toHaveTextContent('Custom offline message');
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
