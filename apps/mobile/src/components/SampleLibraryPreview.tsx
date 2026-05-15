import * as React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SAMPLE_BOOKS } from '@/constants/sampleBooks';

interface SampleLibraryPreviewProps {
  onDismiss: () => void;
}

export const SampleLibraryPreview: React.FC<SampleLibraryPreviewProps> = ({ onDismiss }) => {
  const { t } = useTranslation('books');
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.banner, { backgroundColor: theme.colors.secondaryContainer }]}>
        <Text
          variant="titleMedium"
          style={[styles.bannerTitle, { color: theme.colors.onSecondaryContainer }]}
          accessibilityRole="header"
        >
          {t('preview_banner_title')}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.bannerDescription, { color: theme.colors.onSecondaryContainer }]}
        >
          {t('preview_banner_description')}
        </Text>
        <Button
          mode="contained"
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityLabel={t('preview_banner_dismiss')}
        >
          {t('preview_banner_dismiss')}
        </Button>
      </View>

      <ScrollView scrollEnabled={false}>
        {SAMPLE_BOOKS.map((book) => (
          <Card key={book.id} style={[styles.card, { opacity: 0.6 }]} mode="outlined">
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardText}>
                <Text variant="titleSmall">{book.title}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {book.authorName}
                </Text>
              </View>
              <Chip compact>{t(`preview_badge`)}</Chip>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bannerTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerDescription: {
    marginBottom: 12,
    opacity: 0.85,
  },
  dismissButton: {
    alignSelf: 'flex-start',
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
    marginRight: 8,
  },
});
