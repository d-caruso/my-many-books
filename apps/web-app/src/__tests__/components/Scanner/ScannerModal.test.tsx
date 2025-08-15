import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScannerModal } from '../../../components/Scanner/ScannerModal';

// Mock child components
jest.mock('../../../components/Scanner/ISBNScanner', () => ({
  ISBNScanner: ({ onScan, onClose, open }: any) => (
    open ? (
      <div data-testid="isbn-scanner">
        <button data-testid="scanner-scan-button" onClick={() => onScan({ isbn: '9780747532699', success: true })}>
          Simulate Scan
        </button>
        <button data-testid="scanner-close-button" onClick={onClose}>Close Scanner</button>
      </div>
    ) : null
  ),
}));

jest.mock('../../../components/Scanner/ManualISBNInput', () => ({
  ManualISBNInput: ({ onSubmit, onClose, open }: any) => (
    open ? (
      <div data-testid="manual-isbn-input">
        <button data-testid="manual-submit-button" onClick={() => onSubmit('9780747532699')}>
          Submit Manual
        </button>
        <button data-testid="manual-close-button" onClick={onClose}>Close Manual</button>
      </div>
    ) : null
  ),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Dialog: ({ children, open, onClose, maxWidth, fullScreen, ...props }: any) => (
    open ? (
      <div data-testid="dialog" data-maxwidth={maxWidth} data-fullscreen={fullScreen} {...props}>
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
  Button: ({ children, onClick, variant, color, fullWidth, startIcon, endIcon, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      data-color={color}
      data-fullwidth={fullWidth}
      {...props}
    >
      {startIcon && <span data-testid="start-icon">{startIcon}</span>}
      {children}
      {endIcon && <span data-testid="end-icon">{endIcon}</span>}
    </button>
  ),
  IconButton: ({ children, onClick, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} {...props}>{children}</button>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Divider: (props: any) => (
    <hr data-testid="divider" {...props} />
  ),
}));

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => ({
  Close: () => <div data-testid="close-icon">Close</div>,
  CameraAlt: () => <div data-testid="camera-icon">Camera</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
}));

describe('ScannerModal', () => {
  const mockOnScanComplete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders scanner modal when open', () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Scan Book')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    const { container } = render(
      <ScannerModal
        open={false}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('shows camera scanning option by default', () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('isbn-scanner')).toBeInTheDocument();
    expect(screen.queryByTestId('manual-isbn-input')).not.toBeInTheDocument();
  });

  test('shows manual input option when switch to manual is clicked', () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    const manualButton = screen.getByText('Enter Manually');
    fireEvent.click(manualButton);

    expect(screen.getByTestId('manual-isbn-input')).toBeInTheDocument();
    expect(screen.queryByTestId('isbn-scanner')).not.toBeInTheDocument();
  });

  test('handles successful camera scan', async () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    const scanButton = screen.getByTestId('scanner-scan-button');
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(mockOnScanComplete).toHaveBeenCalledWith('9780747532699');
    });
  });

  test('handles successful manual input', async () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    // Switch to manual mode
    const manualButton = screen.getByText('Enter Manually');
    fireEvent.click(manualButton);

    const submitButton = screen.getByTestId('manual-submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnScanComplete).toHaveBeenCalledWith('9780747532699');
    });
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByTestId('close-icon').parentElement;
    fireEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('shows mode toggle buttons', () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Use Camera')).toBeInTheDocument();
    expect(screen.getByText('Enter Manually')).toBeInTheDocument();
    expect(screen.getByTestId('camera-icon')).toBeInTheDocument();
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });

  test('has proper dialog structure', () => {
    render(
      <ScannerModal
        open={true}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-actions')).toBeInTheDocument();
  });
});