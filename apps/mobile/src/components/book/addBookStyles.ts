import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export const useAddBookStyles = () => {
  const theme = useTheme();
  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        keyboardAvoidingView: {
          flex: 1,
        },
        scrollView: {
          flex: 1,
          padding: 16,
        },
        card: {
          marginBottom: 16,
        },
        title: {
          fontWeight: 'bold',
          marginBottom: 24,
          textAlign: 'center',
        },
        errorContainer: {
          backgroundColor: theme.colors.errorContainer,
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        },
        errorText: {
          color: theme.colors.error,
          textAlign: 'center',
        },
        scannerNoticeContainer: {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 16,
        },
        scannerNoticeText: {
          color: theme.colors.onPrimaryContainer,
          textAlign: 'center',
          fontWeight: '500',
        },
        isbnSection: {
          marginBottom: 16,
        },
        isbnInput: {
          marginBottom: 8,
        },
        isbnActionButtons: {
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: 8,
        },
        duplicateWarningContainer: {
          backgroundColor: theme.colors.secondaryContainer,
          borderColor: theme.colors.secondary,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 16,
        },
        duplicateWarningText: {
          color: theme.colors.onSecondaryContainer,
          textAlign: 'center',
          fontWeight: '500',
        },
        input: {
          marginBottom: 16,
        },
        lookupButton: {
          flex: 1,
          marginTop: 0,
          marginBottom: 0,
        },
        scanButton: {
          flex: 1,
          marginTop: 0,
          marginBottom: 0,
        },
        sectionTitle: {
          fontWeight: 'bold',
          marginBottom: 8,
          marginTop: 8,
        },
        segmentedButtons: {
          marginBottom: 16,
        },
        offlineHint: {
          color: theme.colors.onSurfaceVariant,
          textAlign: 'center',
          marginTop: 8,
        },
        buttonContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 24,
        },
        button: {
          flex: 1,
          marginHorizontal: 8,
        },
        scannerModalContainer: {
          flex: 1,
          backgroundColor: theme.colors.onBackground,
        },
        sectionHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          marginBottom: 8,
        },
        sectionActionsRow: {
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
        },
        sectionActionButton: {
          marginVertical: 0,
        },
        selectedChipsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
        },
        emptyHint: {
          color: theme.colors.onSurfaceVariant,
          marginBottom: 16,
        },
        categoriesLoadingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        },
      }),
    [theme]
  );
};

export default useAddBookStyles;
