import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Text, Avatar, Button, Card, Switch, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { changeLanguage } from '@/i18n';
import LanguageSelector from '@/components/LanguageSelector';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { i18n } = useTranslation();
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
      const message = languageCode === 'en'
        ? 'Language changed successfully'
        : 'Lingua cambiata con successo';
      setSnackbarMessage(message);
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
              accessibilityLabel={`User profile picture for ${user?.name || 'User'}`}
            />
            <Text variant="headlineSmall" style={styles.userName} accessibilityRole="header">
              {user?.name || 'User'}
            </Text>
            <Text variant="bodyMedium" style={styles.userEmail}>
              {user?.email}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.settingsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
              Settings
            </Text>
            
            <List.Item
              title="Dark Mode"
              description="Toggle dark theme"
              left={() => <List.Icon icon="theme-light-dark" accessible={false} />}
              right={() => (
                <Switch
                  value={isDark}
                  onValueChange={handleThemeToggle}
                  accessibilityLabel="Toggle dark theme"
                />
              )}
              accessibilityRole="menuitem"
            />
            
            <List.Item
              title="Notifications"
              description="Push notification settings"
              left={() => <List.Icon icon="bell" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Notifications, Push notification settings"
            />
            
            <List.Item
              title="Storage"
              description="Manage offline data"
              left={() => <List.Icon icon="database" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Storage, Manage offline data"
            />
            
            <List.Item
              title="Export Data"
              description="Export your book collection"
              left={() => <List.Icon icon="export" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Export Data, Export your book collection"
            />
          </Card.Content>
        </Card>

        <Card style={styles.languageCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
              Language / Lingua
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
              About
            </Text>
            
            <List.Item
              title="Help & Support"
              description="Get help and contact support"
              left={() => <List.Icon icon="help-circle" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Help & Support, Get help and contact support"
            />
            
            <List.Item
              title="Privacy Policy"
              description="Read our privacy policy"
              left={() => <List.Icon icon="shield-account" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Privacy Policy, Read our privacy policy"
            />
            
            <List.Item
              title="Terms of Service"
              description="Read our terms of service"
              left={() => <List.Icon icon="file-document" accessible={false} />}
              right={() => <List.Icon icon="chevron-right" accessible={false} />}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Terms of Service, Read our terms of service"
            />
            
            <List.Item
              title="App Version"
              description="1.0.0"
              left={() => <List.Icon icon="information" accessible={false} />}
              accessible={true}
              accessibilityLabel="App Version 1.0.0"
            />
          </Card.Content>
        </Card>

        <View style={styles.logoutContainer}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            icon="logout"
            style={styles.logoutButton}
            accessibilityLabel="Logout"
          >
            Logout
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
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