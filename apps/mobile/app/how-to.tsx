import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import {
  HOW_TO_SECTIONS,
  getTutorialCapabilities,
  getVisibleTutorialSections,
  CARD_ICON_NAMES,
} from '@/pages/HowTo/howToContent';

export default function HowToScreen() {
  const { t } = useTranslation('tutorial');
  const theme = useTheme();
  const capabilities = getTutorialCapabilities();
  const visibleSections = getVisibleTutorialSections(HOW_TO_SECTIONS, capabilities);

  return (
    <PageErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text variant="headlineMedium" accessibilityRole="header" style={styles.pageTitle}>
            {t('page_title')}
          </Text>
          <Text variant="bodyMedium" style={styles.pageDescription}>
            {t('page_description')}
          </Text>

          {visibleSections.map((section) => (
            <View key={section.id}>
              {visibleSections.length > 1 && (
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  {t(section.titleKey)}
                </Text>
              )}

              {section.items.map((item) => {
                const iconName = CARD_ICON_NAMES[item.id];
                return (
                  <Card
                    key={item.id}
                    style={styles.card}
                    testID={`how-to-card-${item.id}`}
                  >
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        {iconName ? (
                          <MaterialIcons
                            name={iconName}
                            size={20}
                            color={theme.colors.primary}
                            style={styles.cardIcon}
                          />
                        ) : null}
                        <Text
                          variant="titleLarge"
                          accessibilityRole="header"
                          style={styles.cardTitle}
                        >
                          {t(item.titleKey)}
                        </Text>
                      </View>

                      <Text variant="bodyMedium" style={styles.cardDescription}>
                        {t(item.descriptionKey)}
                      </Text>

                      <View style={styles.stepsContainer}>
                        {item.stepsKeys.map((stepKey, index) => (
                          <View
                            key={stepKey}
                            style={styles.stepRow}
                            testID={`how-to-step-${item.id}-${index}`}
                          >
                            <Text variant="bodySmall" style={styles.stepIndex}>
                              {index + 1}.
                            </Text>
                            <Text variant="bodyMedium" style={styles.stepText}>
                              {t(stepKey)}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {item.ctaPath && (
                        <View style={styles.ctaContainer} testID={`how-to-cta-container-${item.id}`}>
                          <Button
                            mode="contained"
                            onPress={() =>
                              router.push(
                                item.ctaPath as Parameters<typeof router.push>[0]
                              )
                            }
                            testID={`how-to-cta-${item.id}`}
                          >
                            {t(item.ctaLabelKey ?? 'cta_try_it_now')}
                          </Button>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          ))}

          {!visibleSections.length && (
            <Text variant="bodyMedium" style={styles.noGuides}>
              {t('no_guides_available')}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </PageErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  pageDescription: {
    opacity: 0.7,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    marginRight: 8,
  },
  cardTitle: {
    flex: 1,
    fontWeight: '600',
  },
  cardDescription: {
    opacity: 0.7,
    marginBottom: 12,
  },
  stepsContainer: {
    gap: 6,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepIndex: {
    fontWeight: '700',
    minWidth: 20,
  },
  stepText: {
    flex: 1,
  },
  ctaContainer: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  noGuides: {
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 32,
  },
});
