import { renderHook, act } from '@testing-library/react';
import { useISBNScanner } from '../../hooks/useISBNScanner';
import { ScanResult } from '../../hooks/../types';

// Mock ZXing library
const mockCodeReader = {
  decodeFromVideoDevice: jest.fn(),
  reset: jest.fn(),
  getVideoInputDevices: jest.fn(),
};

jest.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: jest.fn(() => mockCodeReader),
  NotFoundException: jest.fn(),
}));

// Mock navigator.mediaDevices
const mockMediaDevices = {
  enumerateDevices: jest.fn(),
  getUserMedia: jest.fn(),
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

// Mock console.error to keep tests clean
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('useISBNScanner', () => {
  let mockOnScanSuccess: jest.Mock;
  let mockOnScanError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnScanSuccess = jest.fn();
    mockOnScanError = jest.fn();

    // Default mock implementations
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Camera 2' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' },
    ]);

    mockMediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });

    mockCodeReader.getVideoInputDevices.mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Camera 2' },
    ]);
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  test('initializes with default state', () => {
    const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

    expect(result.current.isScanning).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.devices).toEqual([]);
    expect(result.current.selectedDeviceId).toBe(null);
    expect(typeof result.current.startScanning).toBe('function');
    expect(typeof result.current.stopScanning).toBe('function');
    expect(typeof result.current.switchCamera).toBe('function');
    expect(typeof result.current.requestPermission).toBe('function');
    expect(typeof result.current.setVideoElement).toBe('function');
    expect(typeof result.current.videoRef).toBe('function');
  });

  test('initializes BrowserMultiFormatReader on mount', () => {
    const { BrowserMultiFormatReader } = require('@zxing/library');
    
    renderHook(() => useISBNScanner(mockOnScanSuccess));

    expect(BrowserMultiFormatReader).toHaveBeenCalled();
  });

  test('cleans up code reader on unmount', () => {
    const { unmount } = renderHook(() => useISBNScanner(mockOnScanSuccess));

    unmount();

    expect(mockCodeReader.reset).toHaveBeenCalled();
  });

  describe('requestPermission', () => {
    test('requests camera permission successfully', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      let permissionResult: boolean = false;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
      expect(permissionResult).toBe(true);
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBe(null);
    });

    test('handles permission denied', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      let permissionResult: boolean = true;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(permissionResult).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBe('Failed to access camera. Please check your camera permissions.');
    });

    test('loads devices after getting permission', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.devices).toHaveLength(2);
      expect(result.current.devices[0].label).toBe('Camera 1');
      expect(result.current.devices[1].label).toBe('Camera 2');
    });
  });

  describe('setVideoElement', () => {
    test('sets video element reference', () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      expect(result.current.videoRef()).toBe(mockVideoElement);
    });

    test('can clear video element reference', () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      expect(result.current.videoRef()).toBe(mockVideoElement);

      act(() => {
        result.current.setVideoElement(null);
      });

      expect(result.current.videoRef()).toBe(null);
    });
  });

  describe('startScanning', () => {
    test('attempts to start scanning with permission and video element', async () => {
      mockCodeReader.decodeFromVideoDevice.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      // Setup
      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      // Start scanning
      await act(async () => {
        await result.current.startScanning();
      });

      expect(mockCodeReader.decodeFromVideoDevice).toHaveBeenCalledWith(
        'camera1', // First available camera
        mockVideoElement,
        expect.any(Function)
      );
    });

    test('does not start scanning without permission', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.isScanning).toBe(false);
      expect(result.current.error).toBe('Scanner not properly initialized');
      expect(mockCodeReader.decodeFromVideoDevice).not.toHaveBeenCalled();
    });

    test('does not start scanning without video element', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      // Get permission but don't set video element
      await act(async () => {
        await result.current.requestPermission();
      });

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.isScanning).toBe(false);
      expect(result.current.error).toBe('Scanner not properly initialized');
      expect(mockCodeReader.decodeFromVideoDevice).not.toHaveBeenCalled();
    });

    test('handles scanning errors', async () => {
      mockCodeReader.decodeFromVideoDevice.mockRejectedValue(new Error('Scanning failed'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess, mockOnScanError));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.error).toBe('Failed to start camera');
      expect(result.current.isScanning).toBe(false);
      expect(mockOnScanError).toHaveBeenCalledWith('Failed to start camera');
    });
  });

  describe('stopScanning', () => {
    test('stops scanning', () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      // Stop scanning
      act(() => {
        result.current.stopScanning();
      });

      expect(result.current.isScanning).toBe(false);
      expect(mockCodeReader.reset).toHaveBeenCalled();
    });

    test('can stop scanning even if not currently scanning', () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      act(() => {
        result.current.stopScanning();
      });

      expect(result.current.isScanning).toBe(false);
    });
  });

  describe('switchCamera', () => {
    test('switches to next available camera', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      // Setup
      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      // Start with first camera
      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.selectedDeviceId).toBe('camera1');

      // Switch camera
      await act(async () => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe('camera2');
    });

    test('cycles back to first camera after reaching the last', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      // Setup
      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Switch to second camera
      await act(async () => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe('camera2');

      // Switch again (should cycle back to first)
      await act(async () => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe('camera1');
    });

    test('does nothing if no devices available', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([]);
      mockCodeReader.getVideoInputDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe(null);
    });
  });

  describe('scan result handling', () => {
    test('calls onScanSuccess when scan is successful', async () => {
      // Using a known valid ISBN-13: 9780747532699 (Harry Potter book)
      const validISBN = '9780747532699';
      const mockScanResult: ScanResult = {
        isbn: validISBN,
        success: true,
      };

      let scanCallback: ((result: any) => void) | undefined;

      mockCodeReader.decodeFromVideoDevice.mockImplementation((deviceId, video, callback) => {
        scanCallback = callback;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Simulate successful scan
      act(() => {
        if (scanCallback) {
          scanCallback({ getText: () => validISBN }, null);
        }
      });

      expect(mockOnScanSuccess).toHaveBeenCalledWith(mockScanResult);
    });

    test('handles scan errors through callback', async () => {
      const { NotFoundException } = require('@zxing/library');
      
      let scanCallback: ((result: any, error?: any) => void) | undefined;

      mockCodeReader.decodeFromVideoDevice.mockImplementation((deviceId, video, callback) => {
        scanCallback = callback;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess, mockOnScanError));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Simulate scan error
      act(() => {
        if (scanCallback) {
          scanCallback(null, new Error('No barcode found'));
        }
      });

      expect(mockOnScanError).toHaveBeenCalledWith('Scanning error occurred');
    });
  });

  describe('error handling', () => {
    test('handles device enumeration errors', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(new Error('Device access error'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.devices).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error getting video devices:', expect.any(Error));
    });

    test('clears error when operation succeeds after failure', async () => {
      // First call fails
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      // First request fails
      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe('Failed to access camera. Please check your camera permissions.');

      // Second call succeeds
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.hasPermission).toBe(true);
    });
  });
});