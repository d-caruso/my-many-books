import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Dialog, Portal, Text, Button, Divider, Chip } from 'react-native-paper';
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
        style={styles.dialog}
      >
        <Dialog.Title style={styles.title}>
          {t('sync.conflicts.title')}
        </Dialog.Title>
        
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('sync.conflicts.subtitle', { title: localBook.title })}
          </Text>

          <View style={styles.timestampContainer}>
            <View style={styles.timestampItem}>
              <Chip icon="phone" style={styles.localChip}>
                {t('sync.conflicts.localVersion')}
              </Chip>
              <Text variant="bodySmall" style={styles.timestamp}>
                {formatDate(localBook.updateDate)}
              </Text>
            </View>
            
            <View style={styles.timestampItem}>
              <Chip icon="cloud" style={styles.serverChip}>
                {t('sync.conflicts.serverVersion')}
              </Chip>
              <Text variant="bodySmall" style={styles.timestamp}>
                {formatDate(serverBook.updateDate)}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.differencesContainer}>
            {differences.map((diff, index) => (
              <View key={diff.field} style={styles.differenceItem}>
                <Text variant="titleSmall" style={styles.fieldTitle}>
                  {t(`books:${diff.field}`)}
                </Text>
                
                <View style={styles.comparisonRow}>
                  <View style={styles.versionColumn}>
                    <Text variant="labelSmall" style={styles.versionLabel}>
                      {t('sync.conflicts.local')}
                    </Text>
                    <Text 
                      variant="bodyMedium" 
                      style={[styles.versionValue, styles.localValue]}
                      numberOfLines={2}
                    >
                      {diff.local}
                    </Text>
                  </View>
                  
                  <View style={styles.versionColumn}>
                    <Text variant="labelSmall" style={styles.versionLabel}>
                      {t('sync.conflicts.server')}
                    </Text>
                    <Text 
                      variant="bodyMedium" 
                      style={[styles.versionValue, styles.serverValue]}
                      numberOfLines={2}
                    >
                      {diff.server}
                    </Text>
                  </View>
                </View>
                
                {index < differences.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </ScrollView>
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          <Button 
            mode="outlined" 
            onPress={() => onResolve('local')}
            style={styles.button}
            icon="phone"
          >
            {t('sync.conflicts.keepLocal')}
          </Button>
          <Button 
            mode="contained" 
            onPress={() => onResolve('server')}
            style={styles.button}
            icon="cloud-download"
          >
            {t('sync.conflicts.useServer')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  title: {
    textAlign: 'center',
    color: '#d32f2f',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  timestampItem: {
    alignItems: 'center',
  },
  localChip: {
    backgroundColor: '#2196F3',
    marginBottom: 4,
  },
  serverChip: {
    backgroundColor: '#FF9800',
    marginBottom: 4,
  },
  timestamp: {
    opacity: 0.6,
  },
  differencesContainer: {
    maxHeight: 300,
  },
  differenceItem: {
    marginBottom: 16,
  },
  fieldTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  versionColumn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  versionLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  versionValue: {
    minHeight: 20,
  },
  localValue: {
    color: '#2196F3',
  },
  serverValue: {
    color: '#FF9800',
  },
  divider: {
    marginTop: 12,
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});