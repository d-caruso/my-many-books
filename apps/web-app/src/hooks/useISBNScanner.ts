import { useState, useEffect, useRef, useCallback } from 'react';
import type { ScanResult } from '@my-many-books/shared-types';
import { validateISBN } from '@my-many-books/shared-utils';
import type { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result, Exception } from '@zxing/library';
import { logger } from '../utils/logger';

interface ScannerControls {
  stop: () => void;
}

interface ScannerState {
  isScanning: boolean;
  hasPermission: boolean;
  error: string | null;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
}

interface ScannerActions {
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  switchCamera: () => void;
  requestPermission: () => Promise<boolean>;
  setVideoElement: (element: HTMLVideoElement | null) => void;
  videoRef: () => HTMLVideoElement | null;
}

export const useISBNScanner = (
  onScanSuccess: (result: ScanResult) => void,
  onScanError?: (error: string) => void
): ScannerState & ScannerActions => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControls = useRef<ScannerControls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isInitializing = useRef(false);

  // Stable refs for callback props — prevents startScanning recreation on parent re-render
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);

  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onScanErrorRef.current = onScanError; }, [onScanError]);

  // Stable refs for state values — lets startScanning read latest values without depending on them
  const hasPermissionRef = useRef(hasPermission);
  hasPermissionRef.current = hasPermission;

  const selectedDeviceIdRef = useRef<string | null>(selectedDeviceId);
  selectedDeviceIdRef.current = selectedDeviceId;

  const devicesRef = useRef<MediaDeviceInfo[]>(devices);
  devicesRef.current = devices;

  // Dynamically import and initialize the barcode reader
  const initializeReader = useCallback(async () => {
    if (codeReader.current || isInitializing.current) {
      return codeReader.current;
    }

    try {
      isInitializing.current = true;
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]);

      codeReader.current = new BrowserMultiFormatReader(hints);
      logger.debug('[ISBNScanner] Reader initialized with EAN-13/EAN-8 hints');
      return codeReader.current;
    } catch (err) {
      logger.error('Failed to initialize barcode reader:', err);
      setError('Failed to initialize scanner');
      return null;
    } finally {
      isInitializing.current = false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerControls.current) {
        scannerControls.current.stop();
        scannerControls.current = null;
      }
    };
  }, []);

  // Get available video devices
  const getVideoDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Prefer back camera on mobile devices
      const backCamera = videoDevices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );

      const preferredDevice = backCamera || videoDevices[0];
      if (preferredDevice && !selectedDeviceIdRef.current) {
        setSelectedDeviceId(preferredDevice.deviceId);
      }

      return videoDevices;
    } catch (err) {
      logger.error('Error getting video devices:', err);
      setError('Failed to access camera devices');
      return [];
    }
  }, []);

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      setHasPermission(true);
      setError(null);
      await getVideoDevices();
      return true;
    } catch (err: unknown) {
      logger.error('Camera permission denied:', err);
      setHasPermission(false);

      const name = err instanceof Error ? (err as DOMException).name : '';
      if (name === 'NotAllowedError') {
        setError('Camera access denied. Please enable camera permissions in your browser settings.');
      } else if (name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. Please check your camera permissions.');
      }

      onScanErrorRef.current?.('Camera permission denied');
      return false;
    }
  }, [getVideoDevices]);

  // Ref for requestPermission — keeps startScanning stable
  const requestPermissionRef = useRef(requestPermission);
  requestPermissionRef.current = requestPermission;

  // Stop scanning
  const stopScanning = useCallback((): void => {
    if (scannerControls.current) {
      scannerControls.current.stop();
      scannerControls.current = null;
    }
    setIsScanning(false);
  }, []);

  // Start scanning — stable deps: only depends on functions with [] deps
  // Reads volatile state (hasPermission, selectedDeviceId, devices) via refs
  const startScanning = useCallback(async (): Promise<void> => {
    if (!hasPermissionRef.current) {
      const granted = await requestPermissionRef.current();
      if (!granted) return;
    }

    const reader = await initializeReader();
    if (!reader || !videoRef.current) {
      setError('Scanner not properly initialized');
      return;
    }

    try {
      setError(null);

      const deviceId = selectedDeviceIdRef.current || devicesRef.current[0]?.deviceId;

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      setIsScanning(true);
      logger.debug('[ISBNScanner] Starting scan', { deviceId: deviceId || 'environment' });

      const { NotFoundException } = await import('@zxing/library');

      const controls = await reader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result: Result | undefined, error: Exception | undefined) => {
          if (result) {
            const scannedText = result.getText();
            const format = result.getBarcodeFormat?.() ?? 'unknown';
            logger.debug('[ISBNScanner] Barcode decoded', { format, text: scannedText });

            if (validateISBN(scannedText).isValid) {
              logger.debug('[ISBNScanner] Valid ISBN detected:', scannedText);
              const scanResult: ScanResult = {
                isbn: scannedText.replace(/[^0-9X]/gi, ''),
                success: true
              };

              onScanSuccessRef.current(scanResult);
              stopScanning();
            } else {
              logger.debug('[ISBNScanner] Decoded but not valid ISBN:', scannedText);
            }
          }

          // Only log non-NotFoundException errors; don't set error state
          // as it would hide the video element and break scanning
          if (error && !(error instanceof NotFoundException)) {
            logger.warn('Scan error:', error);
          }
        }
      );

      scannerControls.current = controls;
    } catch (err: unknown) {
      logger.error('Failed to start scanning:', err);
      setError('Failed to start camera');
      setIsScanning(false);
      onScanErrorRef.current?.('Failed to start camera');
    }
  }, [initializeReader, stopScanning]);

  // Switch camera
  const switchCamera = useCallback((): void => {
    if (devices.length <= 1) return;

    const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];

    setSelectedDeviceId(nextDevice.deviceId);

    if (isScanning) {
      stopScanning();
      // Restart scanning with new device after a short delay
      setTimeout(() => {
        startScanning();
      }, 100);
    }
  }, [devices, selectedDeviceId, isScanning, stopScanning, startScanning]);

  // Expose video ref for external use
  const getVideoRef = useCallback(() => videoRef.current, []);
  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  return {
    isScanning,
    hasPermission,
    error,
    devices,
    selectedDeviceId,
    startScanning,
    stopScanning,
    switchCamera,
    requestPermission,
    videoRef: getVideoRef,
    setVideoElement,
  };
};
