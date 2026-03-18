import { useState, useCallback } from 'react';
import { Camera } from 'expo-camera';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

interface BarcodeScannerState {
  hasPermission: boolean | null;
  scanned: boolean;
  scannedData: string | null;
  error: string | null;
}

interface BarcodeScannerActions {
  requestPermission: () => Promise<void>;
  handleBarCodeScanned: (data: string) => void;
  resetScanner: () => void;
}

export const useBarcodeScanner = (): BarcodeScannerState & BarcodeScannerActions => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    mobileHooks.emit(MOBILE_EVENTS.SCANNER.PERMISSION.REQUEST, {
      source: 'useBarcodeScanner.requestPermission',
    });

    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        mobileHooks.emit(MOBILE_EVENTS.SCANNER.PERMISSION.GRANTED, {
          source: 'useBarcodeScanner.requestPermission',
        });
        return;
      }

      mobileHooks.emit(MOBILE_EVENTS.SCANNER.PERMISSION.DENIED, {
        source: 'useBarcodeScanner.requestPermission',
        status,
      });

      setError('Camera permission is required to scan barcodes');
    } catch (err) {
      console.error('Failed to request camera permission:', err);
      mobileHooks.emit(MOBILE_EVENTS.SCANNER.PERMISSION.DENIED, {
        source: 'useBarcodeScanner.requestPermission',
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Failed to request camera permission');
    }
  }, []);

  const handleBarCodeScanned = useCallback((data: string) => {
    if (scanned) return;
    
    setScanned(true);
    setScannedData(data);
    setError(null);
  }, [scanned]);

  const resetScanner = useCallback(() => {
    setScanned(false);
    setScannedData(null);
    setError(null);
  }, []);

  return {
    hasPermission,
    scanned,
    scannedData,
    error,
    requestPermission,
    handleBarCodeScanned,
    resetScanner,
  };
};
