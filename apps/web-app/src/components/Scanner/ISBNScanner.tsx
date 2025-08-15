import React, { useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Alert,
  CircularProgress,
  Container,
  Stack,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  SwapHoriz as SwapIcon,
  Edit as EditIcon,
  Camera as CameraIcon,
  Warning as WarningIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
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
    if (isOpen && !hasPermission) {
      requestPermission();
    } else if (isOpen && hasPermission) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, hasPermission]);

  if (!isOpen) {
    return null;
  }

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
        justifyContent: 'center'
      }}
    >
      <Container maxWidth="sm" sx={{ height: '100vh', position: 'relative', p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
            p: 2
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight="600" color="white">
              Scan ISBN Barcode
            </Typography>
            <IconButton
              onClick={onClose}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Video Stream Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          {hasPermission && !error ? (
            <>
              <Box
                component="video"
                ref={videoRef}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 2
                }}
                playsInline
                muted
                autoPlay
              />
              
              {/* Scanning Overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}
              >
                {/* Scanning Frame */}
                <Box
                  sx={{
                    width: 280,
                    height: 140,
                    border: '3px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: 2,
                    position: 'relative',
                    mb: 3
                  }}
                >
                  {/* Corner indicators */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      width: 24,
                      height: 24,
                      borderTop: '4px solid',
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      borderRadius: '8px 0 0 0'
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 24,
                      height: 24,
                      borderTop: '4px solid',
                      borderRight: '4px solid',
                      borderColor: 'primary.main',
                      borderRadius: '0 8px 0 0'
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      left: -2,
                      width: 24,
                      height: 24,
                      borderBottom: '4px solid',
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      borderRadius: '0 0 0 8px'
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 24,
                      height: 24,
                      borderBottom: '4px solid',
                      borderRight: '4px solid',
                      borderColor: 'primary.main',
                      borderRadius: '0 0 8px 0'
                    }}
                  />
                  
                  {/* Scanning line animation */}
                  {isScanning && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: 2,
                        bgcolor: 'primary.main',
                        animation: 'pulse 2s infinite',
                        transform: 'translateY(-50%)'
                      }}
                    />
                  )}
                </Box>
                
                {/* Instructions */}
                <Paper
                  elevation={3}
                  sx={{
                    px: 3,
                    py: 1.5,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <Typography variant="body2" color="white" textAlign="center">
                    Position the ISBN barcode within the frame
                  </Typography>
                </Paper>
              </Box>
            </>
          ) : (
            /* Permission/Error State */
            <Paper
              elevation={6}
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                maxWidth: 400,
                mx: 'auto'
              }}
            >
              {error ? (
                <Stack spacing={3} alignItems="center">
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      bgcolor: 'error.light',
                      color: 'error.contrastText'
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 32 }} />
                  </Box>
                  
                  <Box>
                    <Typography variant="h6" fontWeight="600" gutterBottom>
                      Camera Access Required
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      {error}
                    </Typography>
                  </Box>
                  
                  <IconButton
                    onClick={requestPermission}
                    size="large"
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      px: 3,
                      py: 1
                    }}
                  >
                    <CameraIcon sx={{ mr: 1 }} />
                    <Typography variant="button">Request Access</Typography>
                  </IconButton>
                </Stack>
              ) : (
                <Stack spacing={3} alignItems="center">
                  <CircularProgress size={64} thickness={4} />
                  
                  <Box>
                    <Typography variant="h6" fontWeight="600" gutterBottom>
                      Initializing Camera
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please wait while we prepare the scanner...
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Paper>
          )}
        </Box>

        {/* Controls */}
        {hasPermission && !error && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              p: 3
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={3}>
              {/* Switch Camera Button */}
              {devices.length > 1 && (
                <IconButton
                  onClick={switchCamera}
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                    p: 2
                  }}
                  title="Switch Camera"
                >
                  <SwapIcon />
                </IconButton>
              )}

              {/* Status Indicator */}
              <Chip
                icon={isScanning ? <TimerIcon /> : <CameraIcon />}
                label={isScanning ? 'Scanning...' : 'Ready'}
                variant="filled"
                sx={{
                  bgcolor: isScanning ? 'success.main' : 'grey.600',
                  color: 'white',
                  fontWeight: 500,
                  animation: isScanning ? 'pulse 2s infinite' : 'none'
                }}
              />

              {/* Manual Input Button */}
              <IconButton
                onClick={() => {
                  console.log('Manual input not implemented yet');
                }}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                  p: 2
                }}
                title="Enter ISBN Manually"
              >
                <EditIcon />
              </IconButton>
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
};