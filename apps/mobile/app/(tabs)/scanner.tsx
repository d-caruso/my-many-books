import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, TextInput } from 'react-native-paper';

import { BarcodeScannerPanel } from '@/components/scanner/BarcodeScannerPanel';
import { ScannerErrorBoundary } from '@/components/ScannerErrorBoundary';
import { SCANNER_COPY_STATUS } from '@/constants/scanner';
import { resolveScannedIsbnRoute } from '@/utils/isbnScannerRouting';
import { normalizeISBN, validateISBN } from '@my-many-books/shared-utils';
import { useTranslation } from 'react-i18next';

type ScannerMode = 'scan' | 'manual';

export default function ScannerScreen() {
  const { t } = useTranslation('scanner');
  const [mode, setMode] = useState<ScannerMode>('scan');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const handleResolvedIsbn = useCallback(async (rawIsbn: string) => {
    const isbn = normalizeISBN(rawIsbn);

    if (!isbn) {
      setManualError(t('isbn_required'));
      return;
    }

    if (!validateISBN(isbn).isValid) {
      setManualError(t('isbn_invalid'));
      return;
    }

    try {
      const route = await resolveScannedIsbnRoute(isbn);
      router.replace(route);
    } catch (error) {
      console.error('Failed to search book by ISBN:', error);
      router.replace({
        pathname: '/book/add',
        params: {
          isbn,
          scannerCopy: SCANNER_COPY_STATUS.FAILED,
        },
      });
    }
  }, [t]);

  const handleDetected = useCallback(async (isbn: string) => {
    await handleResolvedIsbn(isbn);
  }, [handleResolvedIsbn]);

  const handleManualSubmit = useCallback(async () => {
    setManualError(null);
    await handleResolvedIsbn(manualIsbn);
  }, [handleResolvedIsbn, manualIsbn]);

  return (
    <SafeAreaView style={styles.container}>
      <ScannerErrorBoundary>
        {mode === 'scan' ? (
          <>
            <BarcodeScannerPanel onDetected={handleDetected} />
            <View style={styles.actionContainer}>
              <Button mode="contained" onPress={() => setMode('manual')}>
                {t('enter_manually')}
              </Button>
            </View>
          </>
        ) : (
          <View style={styles.manualContainer}>
            <Text variant="headlineSmall" style={styles.manualTitle}>
              {t('enter_manually_title')}
            </Text>
            <Text variant="bodyMedium" style={styles.manualDescription}>
              {t('manual_input_description')}
            </Text>
            <TextInput
              label={t('isbn_label')}
              value={manualIsbn}
              onChangeText={(value) => {
                setManualIsbn(value);
                if (manualError) {
                  setManualError(null);
                }
              }}
              placeholder={t('isbn_placeholder')}
              autoCapitalize="characters"
              autoCorrect={false}
              error={manualError !== null}
            />
            {manualError ? (
              <Text variant="bodySmall" style={styles.manualError}>
                {manualError}
              </Text>
            ) : null}
            <View style={styles.manualActions}>
              <Button mode="outlined" onPress={() => setMode('scan')}>
                {t('back_to_scanner')}
              </Button>
              <Button mode="contained" onPress={handleManualSubmit}>
                {t('submit')}
              </Button>
            </View>
          </View>
        )}
      </ScannerErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionContainer: {
    padding: 16,
  },
  manualContainer: {
    flex: 1,
    gap: 16,
    padding: 16,
    justifyContent: 'center',
  },
  manualTitle: {
    textAlign: 'center',
  },
  manualDescription: {
    textAlign: 'center',
  },
  manualError: {
    color: '#b3261e',
  },
  manualActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
