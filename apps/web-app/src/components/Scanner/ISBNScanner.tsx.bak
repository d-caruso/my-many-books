import React, { useRef, useEffect } from 'react';
import { useISBNScanner } from '../../hooks/useISBNScanner';
import { ScanResult } from '../../types';

interface ISBNScannerProps {
  onScanSuccess: (result: ScanResult) => void;
  onScanError?: (error: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ISBNScanner: React.FC<ISBNScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  isOpen
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    isScanning,
    hasPermission,
    error,
    devices,
    startScanning,
    stopScanning,
    switchCamera,
    requestPermission,
    setVideoElement,
  } = useISBNScanner(onScanSuccess, onScanError);

  useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, [setVideoElement]);

  useEffect(() => {
    if (isOpen) {
      if (hasPermission) {
        startScanning();
      } else {
        requestPermission();
      }
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, hasPermission, startScanning, stopScanning, requestPermission]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full h-full max-w-lg mx-auto">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-lg font-semibold">Scan ISBN Barcode</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video Stream */}
        <div className="relative w-full h-full flex items-center justify-center">
          {hasPermission && !error ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Scanning Frame */}
                  <div className="w-64 h-32 border-2 border-white border-opacity-50 rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-400 rounded-br-lg"></div>
                    
                    {/* Scanning line animation */}
                    {isScanning && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="w-full h-0.5 bg-primary-400 animate-ping"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <p className="text-white text-center mt-4 text-sm">
                    Position the ISBN barcode within the frame
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Permission/Error State */
            <div className="text-center text-white p-8">
              {error ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 text-red-400 flex items-center justify-center">
                    <span style={{fontSize: '48px'}}>⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
                  <p className="text-sm text-gray-300 mb-4">{error}</p>
                  <button
                    onClick={requestPermission}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Request Camera Access
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 animate-pulse flex items-center justify-center">
                    <span style={{fontSize: '48px'}}>⏳</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Initializing Camera</h3>
                  <p className="text-sm text-gray-300">Please wait...</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        {hasPermission && !error && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <div className="flex items-center justify-center space-x-4">
              {/* Switch Camera Button */}
              {devices.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors text-white"
                  title="Switch Camera"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              )}

              {/* Status Indicator */}
              <div className="flex items-center space-x-2 text-white text-sm">
                <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span>{isScanning ? 'Scanning...' : 'Ready'}</span>
              </div>

              {/* Manual Input Button */}
              <button
                onClick={() => {
                  // We'll implement manual input later
                  console.log('Manual input not implemented yet');
                }}
                className="p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors text-white"
                title="Enter ISBN Manually"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};