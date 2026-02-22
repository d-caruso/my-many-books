import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { Text, Button, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface BarcodeScannerPanelProps {
  onDetected: (isbn: string) => void | Promise<void>;
  onClose?: () => void;
  active?: boolean;
}

export function BarcodeScannerPanel({
  onDetected,
  onClose,
  active = true,
}: BarcodeScannerPanelProps) {
  const { t } = useTranslation('scanner');
  const handlingDetectionRef = useRef(false);

  const {
    hasPermission,
    scanned,
    scannedData,
    error,
    requestPermission,
    handleBarCodeScanned,
    resetScanner,
  } = useBarcodeScanner();

  useEffect(() => {
    if (!active) {
      return;
    }
    requestPermission();
  }, [active, requestPermission]);

  useEffect(() => {
    if (!active || !scannedData || handlingDetectionRef.current) {
      return;
    }

    handlingDetectionRef.current = true;
    Promise.resolve(onDetected(scannedData)).finally(() => {
      handlingDetectionRef.current = false;
    });
  }, [active, onDetected, scannedData]);

  const handleBarCodeScan = ({ data }: BarcodeScanningResult) => {
    handleBarCodeScanned(data);
  };

  if (!active) {
    return null;
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="bodyLarge">{t('requesting_camera_permission')}</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          {onClose && (
            <View style={styles.topRightClose}>
              <IconButton icon="close" onPress={onClose} accessibilityLabel={t('cancel')} />
            </View>
          )}
          <Text variant="headlineSmall" style={styles.errorTitle} accessibilityRole="header">
            {t('camera_access_required')}
          </Text>
          <Text variant="bodyMedium" style={styles.errorDescription}>
            {t('camera_permission_needed')}
          </Text>
          <Button mode="contained" onPress={requestPermission} style={styles.button}>
            {t('grant_permission')}
          </Button>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          {onClose && (
            <View style={styles.topRightClose}>
              <IconButton icon="close" onPress={onClose} accessibilityLabel={t('cancel')} />
            </View>
          )}
          <Text variant="headlineSmall" style={styles.errorTitle} accessibilityRole="header">
            {t('scanner_error')}
          </Text>
          <Text variant="bodyMedium" style={styles.errorDescription}>
            {error}
          </Text>
          <Button mode="contained" onPress={resetScanner} style={styles.button}>
            {t('try_again')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {onClose && (
        <View style={styles.floatingClose}>
          <IconButton
            icon="close"
            mode="contained"
            containerColor="rgba(0,0,0,0.5)"
            iconColor="#fff"
            onPress={onClose}
            accessibilityLabel={t('cancel')}
          />
        </View>
      )}

      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScan}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        style={styles.scanner}
        accessibilityLabel="Camera view for scanning barcodes"
      />

      <View style={styles.overlay}>
        <View style={styles.scanArea} accessible={false} />
        <Text variant="titleMedium" style={styles.instructionText} accessibilityLiveRegion="polite">
          {t('point_camera_at_barcode')}
        </Text>
      </View>

      {scanned && (
        <View style={styles.scannedContainer}>
          <Text variant="bodyLarge" style={styles.scannedText} accessibilityLiveRegion="polite">
            {t('barcode_scanned', { isbn: scannedData })}
          </Text>
          <Button mode="outlined" onPress={resetScanner} style={styles.button}>
            {t('scan_another')}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 420,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  scannedContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  scannedText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDescription: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    marginTop: 16,
  },
  floatingClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  topRightClose: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});

export default BarcodeScannerPanel;
