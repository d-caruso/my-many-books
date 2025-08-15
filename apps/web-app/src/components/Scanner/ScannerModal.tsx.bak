import React, { useState } from 'react';
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
    <>
      {mode === 'scan' ? (
        <>
          <ISBNScanner
            isOpen={isOpen}
            onScanSuccess={handleScanSuccess}
            onScanError={onScanError}
            onClose={handleClose}
          />
          
          {/* Manual Input Button Overlay */}
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={() => handleModeSwitch('manual')}
              className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-opacity-30 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Enter Manually</span>
            </button>
          </div>
        </>
      ) : (
        <ManualISBNInput
          isOpen={mode === 'manual'}
          onSubmit={handleManualSubmit}
          onCancel={() => handleModeSwitch('scan')}
        />
      )}
    </>
  );
};