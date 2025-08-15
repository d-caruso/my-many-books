import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ISBNScanner } from '../../../components/Scanner/ISBNScanner';
import { useISBNScanner } from '../../../hooks/useISBNScanner';

// Mock the useISBNScanner hook
jest.mock('../../../hooks/useISBNScanner', () => ({
  useISBNScanner: jest.fn(),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Paper: ({ children, elevation, ...props }: any) => (
    <div data-testid="paper" data-elevation={elevation} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, color, ...props }: any) => (
    <div data-testid={`typography-${variant}`} data-color={color} {...props}>{children}</div>
  ),
  Button: ({ children, onClick, variant, disabled, color, fullWidth, startIcon, endIcon, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled}
      data-color={color}
      data-fullwidth={fullWidth}
      {...props}
    >
      {startIcon && <span data-testid="start-icon">{startIcon}</span>}
      {children}
      {endIcon && <span data-testid="end-icon">{endIcon}</span>}
    </button>
  ),
  IconButton: ({ children, onClick, color, disabled, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} disabled={disabled} data-color={color} {...props}>
      {children}
    </button>
  ),
  Alert: ({ children, severity, action, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>
      {children}
      {action && <div data-testid="alert-action">{action}</div>}
    </div>
  ),
  LinearProgress: ({ variant, value, ...props }: any) => (
    <div data-testid="linear-progress" data-variant={variant} data-value={value} {...props} />
  ),
  Chip: ({ label, color, variant, onDelete, ...props }: any) => (
    <div data-testid="chip" data-color={color} data-variant={variant} {...props}>
      {label}
      {onDelete && <button data-testid="chip-delete" onClick={onDelete}>×</button>}
    </div>
  ),
}));

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => ({
  CameraAlt: () => <div data-testid="camera-icon">Camera</div>,
  FlipCameraAndroid: () => <div data-testid="flip-camera-icon">Flip</div>,
  Close: () => <div data-testid="close-icon">Close</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  Error: () => <div data-testid="error-icon">Error</div>,
  Refresh: () => <div data-testid="refresh-icon">Refresh</div>,
}));

const mockUseISBNScanner = useISBNScanner as jest.MockedFunction<typeof useISBNScanner>;

describe('ISBNScanner', () => {
  const mockOnScan = jest.fn();
  const mockOnClose = jest.fn();

  const mockScannerState = {
    isScanning: false,
    hasPermission: false,
    error: null,
    devices: [],
    selectedDeviceId: null,
    startScanning: jest.fn(),
    stopScanning: jest.fn(),
    switchCamera: jest.fn(),
    requestPermission: jest.fn(),
    setVideoElement: jest.fn(),
    videoRef: jest.fn(() => null),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseISBNScanner.mockReturnValue(mockScannerState);
  });

  test('renders scanner interface', () => {
    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByText('ISBN Scanner')).toBeInTheDocument();
    expect(screen.getByText('Position a book barcode in the camera view')).toBeInTheDocument();
    expect(screen.getByTestId('close-icon')).toBeInTheDocument();
  });

  test('shows permission request when no permission', () => {
    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByText('Camera Permission Required')).toBeInTheDocument();
    expect(screen.getByText('Allow camera access to scan book barcodes')).toBeInTheDocument();
    expect(screen.getByTestId('button-contained')).toBeInTheDocument();
    expect(screen.getByText('Grant Permission')).toBeInTheDocument();
  });

  test('requests permission when grant permission button is clicked', async () => {
    const mockRequestPermission = jest.fn().mockResolvedValue(true);
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      requestPermission: mockRequestPermission,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    const grantButton = screen.getByText('Grant Permission');
    fireEvent.click(grantButton);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  test('shows video element when permission granted', () => {
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    const videoElement = screen.getByTestId('scanner-video');
    expect(videoElement).toBeInTheDocument();
  });

  test('starts scanning when permission is granted and video is loaded', async () => {
    const mockStartScanning = jest.fn();
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
      startScanning: mockStartScanning,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    const videoElement = screen.getByTestId('scanner-video');
    fireEvent.loadedData(videoElement);

    await waitFor(() => {
      expect(mockStartScanning).toHaveBeenCalledTimes(1);
    });
  });

  test('shows scanning indicator when scanning', () => {
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
      isScanning: true,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    expect(screen.getByTestId('linear-progress')).toBeInTheDocument();
  });

  test('shows switch camera button when multiple devices available', () => {
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
      devices: [
        { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
        { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' },
      ],
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByTestId('flip-camera-icon')).toBeInTheDocument();
  });

  test('switches camera when flip camera button is clicked', () => {
    const mockSwitchCamera = jest.fn();
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
      devices: [
        { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
        { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' },
      ],
      switchCamera: mockSwitchCamera,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    const flipButton = screen.getByTestId('icon-button');
    fireEvent.click(flipButton);

    expect(mockSwitchCamera).toHaveBeenCalledTimes(1);
  });

  test('displays error message when error occurs', () => {
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      error: 'Camera not accessible',
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(screen.getByText('Camera not accessible')).toBeInTheDocument();
  });

  test('shows retry button when error occurs', () => {
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      error: 'Camera not accessible',
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('retries permission request when retry button is clicked', () => {
    const mockRequestPermission = jest.fn();
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      error: 'Permission denied',
      requestPermission: mockRequestPermission,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    const closeButton = screen.getByTestId('close-icon').parentElement;
    fireEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('stops scanning when component unmounts', () => {
    const mockStopScanning = jest.fn();
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      isScanning: true,
      stopScanning: mockStopScanning,
    });

    const { unmount } = render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    unmount();

    expect(mockStopScanning).toHaveBeenCalledTimes(1);
  });

  test('handles successful scan result', () => {
    const mockOnScan = jest.fn();
    const mockStopScanning = jest.fn();

    mockUseISBNScanner.mockImplementation((onScanSuccess) => {
      // Simulate successful scan
      setTimeout(() => {
        onScanSuccess({ isbn: '9780747532699', success: true });
      }, 100);

      return {
        ...mockScannerState,
        hasPermission: true,
        isScanning: true,
        stopScanning: mockStopScanning,
      };
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    setTimeout(() => {
      expect(mockOnScan).toHaveBeenCalledWith({ isbn: '9780747532699', success: true });
      expect(mockStopScanning).toHaveBeenCalled();
    }, 150);
  });

  test('does not render when open is false', () => {
    const { container } = render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('shows scanning guidelines', () => {
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByText('Position a book barcode in the camera view')).toBeInTheDocument();
    expect(screen.getByText('Ensure good lighting and steady hands')).toBeInTheDocument();
  });

  test('displays current device information', () => {
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
      devices: [
        { deviceId: 'camera1', kind: 'videoinput', label: 'Back Camera' },
      ],
      selectedDeviceId: 'camera1',
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(screen.getByText('Back Camera')).toBeInTheDocument();
  });

  test('handles video element setup correctly', () => {
    const mockSetVideoElement = jest.fn();
    mockUseISBNScanner.mockReturnValue({
      ...mockScannerState,
      hasPermission: true,
      setVideoElement: mockSetVideoElement,
    });

    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
      />
    );

    expect(mockSetVideoElement).toHaveBeenCalled();
  });

  test('shows success feedback when scan completes', async () => {
    render(
      <ISBNScanner
        onScan={mockOnScan}
        onClose={mockOnClose}
        open={true}
        showSuccessMessage={true}
      />
    );

    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    expect(screen.getByText('ISBN scanned successfully!')).toBeInTheDocument();
  });
});