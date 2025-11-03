import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Dialog, Portal } from 'react-native-paper';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useBookSearch } from '@/hooks/useBookSearch';
import { Book } from '@my-many-books/shared-types';

export default function ScannerScreen() {
  const { t } = useTranslation('scanner');
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [foundBook, setFoundBook] = useState<Book | null>(null);

  const {
    hasPermission,
    scanned,
    scannedData,
    error,
    requestPermission,
    handleBarCodeScanned,
    resetScanner,
  } = useBarcodeScanner();

  const { searchByISBN } = useBookSearch();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (scannedData) {
      handleISBNScanned(scannedData);
    }
  }, [scannedData]);

  const handleISBNScanned = async (isbn: string) => {
    try {
      const book = await searchByISBN(isbn);
      if (book) {
        setFoundBook(book);
        setShowBookDialog(true);
      } else {
        // Book not found, navigate to add book with ISBN
        router.push(`/book/add?isbn=${isbn}`);
      }
    } catch (error) {
      console.error('Failed to search book by ISBN:', error);
      // Navigate to add book with ISBN even if search fails
      router.push(`/book/add?isbn=${isbn}`);
    }
  };

  const handleBarCodeScan = ({ data }: BarcodeScanningResult) => {
    handleBarCodeScanned(data);
  };

  const handleAddFoundBook = () => {
    setShowBookDialog(false);
    if (foundBook) {
      router.push(`/book/add?bookData=${encodeURIComponent(JSON.stringify(foundBook))}`);
    }
  };

  const handleScanAnother = () => {
    setShowBookDialog(false);
    setFoundBook(null);
    resetScanner();
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="bodyLarge">{t('requesting_camera_permission')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="headlineSmall" style={styles.errorTitle} accessibilityRole="header">
            {t('camera_access_required')}
          </Text>
          <Text variant="bodyMedium" style={styles.errorDescription}>
            {t('camera_permission_needed')}
          </Text>
          <Button mode="contained" onPress={requestPermission} style={styles.button} accessibilityLabel="Grant Camera Permission">
            {t('grant_permission')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="headlineSmall" style={styles.errorTitle} accessibilityRole="header">
            {t('scanner_error')}
          </Text>
          <Text variant="bodyMedium" style={styles.errorDescription}>
            {error}
          </Text>
          <Button mode="contained" onPress={resetScanner} style={styles.button} accessibilityLabel="Try scanning again">
            {t('try_again')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          <Button mode="outlined" onPress={resetScanner} style={styles.button} accessibilityLabel="Scan another barcode">
            {t('scan_another')}
          </Button>
        </View>
      )}

      <Portal>
        <Dialog visible={showBookDialog} onDismiss={() => setShowBookDialog(false)} accessibilityRole="alertdialog" accessibilityLabel="Book Found Dialog" accessibilityViewIsModal={true}>
          <Dialog.Title accessibilityRole="header">{t('book_found')}</Dialog.Title>
          <Dialog.Content>
            {foundBook && (
              <>
                <Text variant="titleMedium" accessibilityRole="header">{foundBook.title}</Text>
                <Text variant="bodyMedium">
                  by {foundBook.authors?.map(a => a.name).join(', ')}
                </Text>
                <Text variant="bodySmall" style={styles.isbn}>
                  {t('isbn_colon', { isbn: foundBook.isbnCode })}
                </Text>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleScanAnother} accessibilityLabel="Scan another book">{t('scan_another')}</Button>
            <Button mode="contained" onPress={handleAddFoundBook} accessibilityLabel="Add book to library">
              {t('add_to_library')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    bottom: 100,
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
  isbn: {
    opacity: 0.7,
    marginTop: 8,
  },
});