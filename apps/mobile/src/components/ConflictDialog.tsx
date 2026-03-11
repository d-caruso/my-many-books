import React from 'react';
import { View, ScrollView } from 'react-native';
import { Dialog, Portal, Text, Button, Divider, Chip, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Book } from '@/types';

interface ConflictDialogProps {
  visible: boolean;
  localBook: Book;
  serverBook: Book;
  onResolve: (choice: 'local' | 'server') => void;
  onDismiss: () => void;
}

/**
 * Dialog for resolving sync conflicts between local and server versions
 */
export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  visible,
  localBook,
  serverBook,
  onResolve,
  onDismiss,
}) => {
  const { t } = useTranslation('offline');
  const theme = useTheme();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFieldDifferences = () => {
    const differences: {field: string, local: string, server: string}[] = [];

    if (localBook.title !== serverBook.title) {
      differences.push({
        field: 'title',
        local: localBook.title ?? '',
        server: serverBook.title ?? '',
      });
    }

    if (localBook.status !== serverBook.status) {
      differences.push({
        field: 'status',
        local: localBook.status ?? '',
        server: serverBook.status ?? '',
      });
    }

    if (localBook.notes !== serverBook.notes) {
      differences.push({
        field: 'notes',
        local: localBook.notes || t('books:no_notes'),
        server: serverBook.notes || t('books:no_notes'),
      });
    }

    return differences;
  };

  const differences = getFieldDifferences();

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={{ maxHeight: '80%' }}
      >
        <Dialog.Title style={{ textAlign: 'center', color: theme.colors.error }}>
          {t('sync.conflicts.title')}
        </Dialog.Title>

        <Dialog.Content>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16, opacity: 0.7 }}>
            {t('sync.conflicts.subtitle', { title: localBook.title })}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 }}>
            <View style={{ alignItems: 'center' }}>
              <Chip
                icon="phone"
                style={{ backgroundColor: theme.colors.primary, marginBottom: 4 }}
              >
                {t('sync.conflicts.localVersion')}
              </Chip>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                {formatDate(localBook.updateDate)}
              </Text>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Chip
                icon="cloud"
                style={{ backgroundColor: theme.colors.secondary, marginBottom: 4 }}
              >
                {t('sync.conflicts.serverVersion')}
              </Chip>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                {formatDate(serverBook.updateDate)}
              </Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 300 }}>
            {differences.map((diff, index) => (
              <View key={diff.field} style={{ marginBottom: 16 }}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8, textTransform: 'capitalize' }}>
                  {t(`books:${diff.field}`)}
                </Text>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{
                    flex: 1,
                    backgroundColor: theme.colors.surfaceVariant,
                    padding: 12,
                    borderRadius: 8,
                  }}>
                    <Text variant="labelSmall" style={{ fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' }}>
                      {t('sync.conflicts.local')}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ minHeight: 20, color: theme.colors.primary }}
                      numberOfLines={2}
                    >
                      {diff.local}
                    </Text>
                  </View>

                  <View style={{
                    flex: 1,
                    backgroundColor: theme.colors.surfaceVariant,
                    padding: 12,
                    borderRadius: 8,
                  }}>
                    <Text variant="labelSmall" style={{ fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' }}>
                      {t('sync.conflicts.server')}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ minHeight: 20, color: theme.colors.secondary }}
                      numberOfLines={2}
                    >
                      {diff.server}
                    </Text>
                  </View>
                </View>

                {index < differences.length - 1 && <Divider style={{ marginTop: 12 }} />}
              </View>
            ))}
          </ScrollView>
        </Dialog.Content>

        <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <Button
            mode="outlined"
            onPress={() => onResolve('local')}
            style={{ flex: 1, marginHorizontal: 4 }}
            icon="phone"
          >
            {t('sync.conflicts.keepLocal')}
          </Button>
          <Button
            mode="contained"
            onPress={() => onResolve('server')}
            style={{ flex: 1, marginHorizontal: 4 }}
            icon="cloud-download"
          >
            {t('sync.conflicts.useServer')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};
