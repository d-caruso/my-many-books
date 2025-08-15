import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container
} from '@mui/material';
import { Edit as EditIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { ISBNScanner } from './ISBNScanner';
import { ManualISBNInput } from './ManualISBNInput';
import { ScanResult } from '../../types';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (result: ScanResult) => void;
  onScanError?: (error: string) => void;
}

type ScannerMode = 'scan' | 'manual';

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onScanError
}) => {
  const [mode, setMode] = useState<ScannerMode>('scan');

  const handleScanSuccess = (result: ScanResult) => {
    onScanSuccess(result);
    onClose();
  };

  const handleManualSubmit = (result: ScanResult) => {
    onScanSuccess(result);
    onClose();
  };

  const handleModeSwitch = (newMode: ScannerMode) => {
    setMode(newMode);
  };

  const handleClose = () => {
    setMode('scan'); // Reset to default mode
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {mode === 'scan' ? (
        <Box>
          {/* Page Header */}
          <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" fontWeight="600">
              ISBN Scanner
            </Typography>
            <Button
              onClick={handleClose}
              startIcon={<BackIcon />}
              variant="outlined"
            >
              Back
            </Button>
          </Box>
          
          <ISBNScanner
            isOpen={isOpen}
            onScanSuccess={handleScanSuccess}
            onScanError={onScanError}
            onClose={handleClose}
          />
          
          {/* Manual Input Button */}
          <Box mt={3} textAlign="center">
            <Button
              onClick={() => handleModeSwitch('manual')}
              variant="contained"
              startIcon={<EditIcon />}
              size="large"
            >
              Enter Manually
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          {/* Page Header */}
          <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" fontWeight="600">
              Enter ISBN Manually
            </Typography>
            <Button
              onClick={() => handleModeSwitch('scan')}
              startIcon={<BackIcon />}
              variant="outlined"
            >
              Back to Scanner
            </Button>
          </Box>
          
          <ManualISBNInput
            isOpen={mode === 'manual'}
            onSubmit={handleManualSubmit}
            onCancel={() => handleModeSwitch('scan')}
          />
        </Box>
      )}
    </Container>
  );
};