import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { useBookSearch } from '@/hooks/useBookSearch';
import { BarcodeScannerPanel } from '@/components/scanner/BarcodeScannerPanel';
import { ScannerErrorBoundary } from '@/components/ScannerErrorBoundary';
import { SCANNER_COPY_STATUS, ScannerCopyStatus } from '@/constants/scanner';

export default function ScannerScreen() {
  const { searchByISBN } = useBookSearch();

  const handleDetected = useCallback(async (isbn: string) => {
    let copyStatus: ScannerCopyStatus = SCANNER_COPY_STATUS.FAILED;

    try {
      await Clipboard.setStringAsync(isbn);
      copyStatus = SCANNER_COPY_STATUS.SUCCESS;
    } catch {
      copyStatus = SCANNER_COPY_STATUS.FAILED;
    }

    try {
      const book = await searchByISBN(isbn);
      if (book) {
        router.push({
          pathname: '/(tabs)/search',
          params: { scannedIsbn: isbn, scannerCopy: copyStatus },
        });
        return;
      }
    } catch (error) {
      console.error('Failed to search book by ISBN:', error);
    }

    router.push({
      pathname: '/book/add',
      params: { isbn, scannerCopy: copyStatus },
    });
  }, [searchByISBN]);

  return (
    <SafeAreaView style={styles.container}>
      <ScannerErrorBoundary>
        <BarcodeScannerPanel onDetected={handleDetected} />
      </ScannerErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
