import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScannerModal } from '../../../components/Scanner/ScannerModal';

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Box: ({ children, sx, mb, mt, display, alignItems, justifyContent, textAlign, ...props }: any) => (
    <div 
      data-testid="box" 
      style={sx}
      data-mb={mb}
      data-mt={mt}
      data-display={display}
      data-alignitems={alignItems}
      data-justifycontent={justifyContent}
      data-textalign={textAlign}
      {...props}
    >
      {children}
    </div>
  ),
  Typography: ({ children, variant, fontWeight, ...props }: any) => (
    <div data-testid={`typography-${variant}`} data-fontweight={fontWeight} {...props}>
      {children}
    </div>
  ),
  Button: ({ children, onClick, startIcon, variant, size, ...props }: any) => (
    <button 
      data-testid={`button-${variant || 'default'}`} 
      onClick={onClick} 
      data-size={size}
      {...props}
    >
      {startIcon && <span data-testid="button-icon">{startIcon}</span>}
      {children}
    </button>
  ),
  Container: ({ children, maxWidth, sx, ...props }: any) => (
    <div data-testid="container" data-maxwidth={maxWidth} style={sx} {...props}>
      {children}
    </div>
  ),
}));

// Mock Material-UI icons
vi.mock('@mui/icons-material/Edit', () => ({
  default: () => <span data-testid="edit-icon">Edit</span>,
}));

vi.mock('@mui/icons-material/ArrowBack', () => ({
  default: () => <span data-testid="arrow-back-icon">ArrowBack</span>,
}));

// Mock child components
vi.mock('../../../components/Scanner/ISBNScanner', () => ({
  ISBNScanner: ({ isOpen, onScanSuccess, onScanError, onClose }: any) => (
    <div data-testid="isbn-scanner" data-is-open={isOpen}>
      <button data-testid="scan-success-trigger" onClick={() => onScanSuccess({ isbn: '1234567890', success: true })}>
        Trigger Scan Success
      </button>
      <button data-testid="scan-error-trigger" onClick={() => onScanError?.('Test error')}>
        Trigger Scan Error
      </button>
      <button data-testid="scanner-close-trigger" onClick={onClose}>
        Close Scanner
      </button>
    </div>
  )
}));

vi.mock('../../../components/Scanner/ManualISBNInput', () => ({
  ManualISBNInput: ({ isOpen, onSubmit, onCancel }: any) => (
    <div data-testid="manual-isbn-input" data-is-open={isOpen}>
      <button data-testid="manual-submit-trigger" onClick={() => onSubmit({ isbn: '9876543210', success: true })}>
        Submit Manual
      </button>
      <button data-testid="manual-cancel-trigger" onClick={onCancel}>
        Cancel Manual
      </button>
    </div>
  )
}));

describe('ScannerModal', () => {
  const mockOnScanSuccess = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnScanError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders scanner modal when open', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('container')).toBeInTheDocument();
    expect(screen.getByText('ISBN Scanner')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    const { container } = render(
      <ScannerModal
        isOpen={false}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('shows camera scanning option by default', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('isbn-scanner')).toBeInTheDocument();
    expect(screen.queryByTestId('manual-isbn-input')).not.toBeInTheDocument();
    expect(screen.getByText('Enter Manually')).toBeInTheDocument();
  });

  test('switches to manual input mode', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    const manualButton = screen.getByText('Enter Manually');
    fireEvent.click(manualButton);

    expect(screen.getByTestId('manual-isbn-input')).toBeInTheDocument();
    expect(screen.queryByTestId('isbn-scanner')).not.toBeInTheDocument();
    expect(screen.getByText('Enter ISBN Manually')).toBeInTheDocument();
  });

  test('switches back to scanner mode from manual', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    // Switch to manual
    fireEvent.click(screen.getByText('Enter Manually'));
    
    // Switch back to scanner
    const backButton = screen.getByText('Back to Scanner');
    fireEvent.click(backButton);

    expect(screen.getByTestId('isbn-scanner')).toBeInTheDocument();
    expect(screen.queryByTestId('manual-isbn-input')).not.toBeInTheDocument();
  });

  test('handles successful camera scan', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    const scanSuccessButton = screen.getByTestId('scan-success-trigger');
    fireEvent.click(scanSuccessButton);

    expect(mockOnScanSuccess).toHaveBeenCalledWith({ isbn: '1234567890', success: true });
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('handles successful manual input', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    // Switch to manual mode
    fireEvent.click(screen.getByText('Enter Manually'));
    
    // Submit manual input
    const manualSubmitButton = screen.getByTestId('manual-submit-trigger');
    fireEvent.click(manualSubmitButton);

    expect(mockOnScanSuccess).toHaveBeenCalledWith({ isbn: '9876543210', success: true });
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onClose when back button is clicked', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('resets mode to scan when closed', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    // Switch to manual mode
    fireEvent.click(screen.getByText('Enter Manually'));
    expect(screen.getByTestId('manual-isbn-input')).toBeInTheDocument();

    // Close the modal
    const backButton = screen.getByText('Back to Scanner');
    fireEvent.click(backButton);

    // Should be back in scan mode
    expect(screen.getByTestId('isbn-scanner')).toBeInTheDocument();
  });

  test('passes onScanError to ISBNScanner', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
        onScanError={mockOnScanError}
      />
    );

    const scanErrorButton = screen.getByTestId('scan-error-trigger');
    fireEvent.click(scanErrorButton);

    expect(mockOnScanError).toHaveBeenCalledWith('Test error');
  });

  test('handles manual input cancellation', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    // Switch to manual mode
    fireEvent.click(screen.getByText('Enter Manually'));
    
    // Cancel manual input
    const cancelButton = screen.getByTestId('manual-cancel-trigger');
    fireEvent.click(cancelButton);

    // Should be back in scan mode
    expect(screen.getByTestId('isbn-scanner')).toBeInTheDocument();
    expect(screen.queryByTestId('manual-isbn-input')).not.toBeInTheDocument();
  });

  test('shows correct button icons', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('arrow-back-icon')).toBeInTheDocument();
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });

  test('passes correct props to child components', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    const isbnScanner = screen.getByTestId('isbn-scanner');
    expect(isbnScanner).toHaveAttribute('data-is-open', 'true');

    // Switch to manual and check props
    fireEvent.click(screen.getByText('Enter Manually'));
    
    const manualInput = screen.getByTestId('manual-isbn-input');
    expect(manualInput).toHaveAttribute('data-is-open', 'true');
  });

  test('handles scanner close button', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    const scannerCloseButton = screen.getByTestId('scanner-close-trigger');
    fireEvent.click(scannerCloseButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('renders with correct container props', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    const container = screen.getByTestId('container');
    expect(container).toHaveAttribute('data-maxwidth', 'md');
  });

  test('shows different headers for different modes', () => {
    render(
      <ScannerModal
        isOpen={true}
        onScanSuccess={mockOnScanSuccess}
        onClose={mockOnClose}
      />
    );

    // Scanner mode header
    expect(screen.getByText('ISBN Scanner')).toBeInTheDocument();

    // Switch to manual mode
    fireEvent.click(screen.getByText('Enter Manually'));

    // Manual mode header
    expect(screen.getByText('Enter ISBN Manually')).toBeInTheDocument();
    expect(screen.queryByText('ISBN Scanner')).not.toBeInTheDocument();
  });
});