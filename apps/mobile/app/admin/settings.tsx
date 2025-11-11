import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function AdminSettings() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Card
        style={styles.card}
        accessible={true}
        accessibilityLabel={t('accessibility:settings_placeholder', 'Settings. Configuration coming soon.')}
        accessibilityRole="text"
      >
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            {t('pages:admin.settings.page_title', 'Settings')}
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {t('pages:admin.settings.coming_soon', 'Settings configuration coming soon...')}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginTop: 16,
  },
  title: {
    marginBottom: 16,
  },
  message: {
    color: '#666',
  },
});
