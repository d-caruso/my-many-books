import { useState, useCallback } from 'react';
import { Camera } from 'expo-camera';

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
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        setError('Camera permission is required to scan barcodes');
      }
    } catch (err) {
      console.error('Failed to request camera permission:', err);
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