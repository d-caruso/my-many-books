import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Text, Avatar, Button, Card, Switch, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { changeLanguage } from '@/i18n';
import LanguageSelector from '@/components/LanguageSelector';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { setThemeMode, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleThemeToggle = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setSnackbarMessage(t('language_changed_successfully'));
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text
              size={80}
              label={user?.name?.charAt(0).toUpperCase() || 'U'}
              style={styles.avatar}
              accessibilityLabel={`${t('user')} ${user?.name || t('user')}`}
            />
            <Text variant="headlineSmall" style={styles.userName} accessibilityRole="header">
              {user?.name || t('user')}
            </Text>
            <Text variant="bodyMedium" style={styles.userEmail}>
              {user?.email}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.settingsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
              {t('settings')}
            </Text>

            {user?.role === 'admin' && (
              <List.Item
                title={t('pages:admin.title', 'Admin Panel')}
                description={t('pages:admin.menu.access', 'Access admin features')}
                left={() => <List.Icon icon="shield-account" accessible={false} />}
                right={() => <List.Icon icon="chevron-right" accessible={false} />}
                onPress={() => router.push('/admin')}
                accessibilityRole="button"
              />
            )}

            <List.Item
              title={t('dark_mode')}
              description={t('toggle_dark_theme')}
              left={() => <List.Icon icon="theme-light-dark" accessible={false} />}
              right={() => (
                <Switch
                  value={isDark}
                  onValueChange={handleThemeToggle}
                  accessibilityLabel={t('toggle_dark_theme')}
                />
              )}
              accessibilityRole="menuitem"
            />

            <List.Item
              title={t('notifications')}
              description={t('push_notification_settings')}
              left={() => <List.Icon icon="bell" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={`${t('notifications')}, ${t('push_notification_settings')}`}
            />

            <List.Item
              title={t('storage')}
              description={t('manage_offline_data')}
              left={() => <List.Icon icon="database" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={`${t('storage')}, ${t('manage_offline_data')}`}
            />

            <List.Item
              title={t('export_data')}
              description={t('export_your_book_collection')}
              left={() => <List.Icon icon="export" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={`${t('export_data')}, ${t('export_your_book_collection')}`}
            />
          </Card.Content>
        </Card>

        <Card style={styles.languageCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
              {t('language')}
            </Text>

            <View style={styles.languageSelectorContainer}>
              <LanguageSelector
                value={i18n.language}
                onLanguageChange={handleLanguageChange}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.aboutCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
              {t('about')}
            </Text>

            <List.Item
              title={t('help_and_support')}
              description={t('get_help_and_contact_support')}
              left={() => <List.Icon icon="help-circle" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={`${t('help_and_support')}, ${t('get_help_and_contact_support')}`}
            />

            <List.Item
              title={t('privacy_policy')}
              description={t('read_our_privacy_policy')}
              left={() => <List.Icon icon="shield-account" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={`${t('privacy_policy')}, ${t('read_our_privacy_policy')}`}
            />

            <List.Item
              title={t('terms_of_service')}
              description={t('read_our_terms_of_service')}
              left={() => <List.Icon icon="file-document" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={`${t('terms_of_service')}, ${t('read_our_terms_of_service')}`}
            />

            <List.Item
              title={t('app_version')}
              description="1.0.0"
              left={() => <List.Icon icon="information" accessible={false} />}
              accessible={true}
              accessibilityLabel={`${t('app_version')} 1.0.0`}
            />
          </Card.Content>
        </Card>

        <View style={styles.logoutContainer}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            icon="logout"
            style={styles.logoutButton}
            accessibilityLabel={t('logout')}
          >
            {t('logout')}
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: t('ok'),
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    marginBottom: 8,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    opacity: 0.7,
  },
  settingsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  languageCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  aboutCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  languageSelectorContainer: {
    marginTop: 8,
  },
  logoutContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    borderColor: '#f44336',
  },
});
