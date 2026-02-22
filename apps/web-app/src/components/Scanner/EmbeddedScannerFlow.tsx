import React, { useEffect, useState } from 'react';
import { Box, Container } from '@mui/material';
import { ISBNScanner } from './ISBNScanner';
import { ManualISBNInput } from './ManualISBNInput';
import type { ScanResult } from '@my-many-books/shared-types';

interface EmbeddedScannerFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (result: ScanResult) => void;
  onScanError?: (error: string) => void;
}

type ScannerMode = 'scan' | 'manual';

export const EmbeddedScannerFlow: React.FC<EmbeddedScannerFlowProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onScanError,
}) => {
  const [mode, setMode] = useState<ScannerMode>('scan');

  useEffect(() => {
    if (!isOpen) {
      setMode('scan');
    }
  }, [isOpen]);

  const handleClose = () => {
    setMode('scan');
    onClose();
  };

  const handleSubmit = (result: ScanResult) => {
    setMode('scan');
    onScanSuccess(result);
  };

  if (!isOpen) {
    return null;
  }

  if (mode === 'manual') {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1300,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <ManualISBNInput
            isOpen
            onSubmit={handleSubmit}
            onCancel={() => setMode('scan')}
          />
        </Container>
      </Box>
    );
  }

  return (
    <ISBNScanner
      isOpen={isOpen}
      onClose={handleClose}
      onScanSuccess={handleSubmit}
      onScanError={onScanError}
      onManualEntryRequest={() => setMode('manual')}
    />
  );
};

export default EmbeddedScannerFlow;
