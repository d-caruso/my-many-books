import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { ScanResult } from '../types';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize the barcode reader
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
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
      if (preferredDevice && !selectedDeviceId) {
        setSelectedDeviceId(preferredDevice.deviceId);
      }
      
      return videoDevices;
    } catch (err) {
      console.error('Error getting video devices:', err);
      setError('Failed to access camera devices');
      return [];
    }
  }, [selectedDeviceId]);

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
    } catch (err: any) {
      console.error('Camera permission denied:', err);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please enable camera permissions in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. Please check your camera permissions.');
      }
      
      onScanError?.(error || 'Camera permission denied');
      return false;
    }
  }, [error, getVideoDevices, onScanError]);

  // Validate ISBN format - moved to useCallback for dependency management
  const validateISBN10 = useCallback((isbn: string): boolean => {
    if (isbn.length !== 10) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }
    
    const lastChar = isbn[9];
    const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
    if (isNaN(checkDigit) && lastChar !== 'X') return false;
    
    sum += checkDigit;
    return sum % 11 === 0;
  }, []);

  const validateISBN13 = useCallback((isbn: string): boolean => {
    if (isbn.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = parseInt(isbn[12]);
    if (isNaN(checkDigit)) return false;
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }, []);

  const validateISBN = useCallback((code: string): boolean => {
    // Remove any non-digit characters except X
    const cleanCode = code.replace(/[^0-9X]/gi, '');
    
    // Check if it's ISBN-10 or ISBN-13
    if (cleanCode.length === 10) {
      return validateISBN10(cleanCode);
    } else if (cleanCode.length === 13) {
      return validateISBN13(cleanCode);
    }
    
    return false;
  }, [validateISBN10, validateISBN13]);

  // Start scanning
  const startScanning = useCallback(async (): Promise<void> => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (!codeReader.current || !videoRef.current) {
      setError('Scanner not properly initialized');
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      const deviceId = selectedDeviceId || devices[0]?.deviceId;
      if (!deviceId) {
        setError('No camera device available');
        return;
      }

      await codeReader.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const scannedText = result.getText();
            
            if (validateISBN(scannedText)) {
              const scanResult: ScanResult = {
                isbn: scannedText.replace(/[^0-9X]/gi, ''),
                success: true
              };
              
              onScanSuccess(scanResult);
              stopScanning();
            }
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.warn('Scan error:', error);
            setError('Scanning error occurred');
            onScanError?.('Scanning error occurred');
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to start scanning:', err);
      setError('Failed to start camera');
      setIsScanning(false);
      onScanError?.('Failed to start camera');
    }
  }, [hasPermission, requestPermission, selectedDeviceId, devices, onScanSuccess, onScanError, validateISBN]);

  // Stop scanning
  const stopScanning = useCallback((): void => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
  }, []);

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