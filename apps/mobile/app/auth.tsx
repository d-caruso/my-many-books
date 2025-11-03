import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const { t } = useTranslation();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuth();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        throw new Error(t('common:email_password_required'));
      }

      if (authMode === 'register') {
        if (!name) {
          throw new Error(t('common:name_required'));
        }
        if (password !== confirmPassword) {
          throw new Error(t('common:passwords_no_match'));
        }
        if (password.length < 6) {
          throw new Error(t('common:password_min_length', { length: 6 }));
        }
        await register(email, password, name);
      } else {
        await login(email, password);
      }

      // Navigation is handled by the auth context
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || t('common:auth_failed'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError(null);
  };

  const handleModeChange = (mode: string) => {
    setAuthMode(mode as AuthMode);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text variant="displaySmall" style={styles.title} accessibilityRole="header">
              {t('common:app_title')}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {t('common:app_subtitle')}
            </Text>
          </View>

          <Card style={styles.authCard}>
            <Card.Content>
              <SegmentedButtons
                value={authMode}
                onValueChange={handleModeChange}
                buttons={[
                  { value: 'login', label: t('common:login') },
                  { value: 'register', label: t('common:register') },
                ]}
                style={styles.segmentedButtons}
                accessibilityLabel={t('common:select_auth_mode')}
              />

              {error && (
                <View style={styles.errorContainer}>
                  <Text variant="bodyMedium" style={styles.errorText} accessibilityLiveRegion="assertive" nativeID="authError">
                    {error}
                  </Text>
                </View>
              )}

              {authMode === 'register' && (
                <TextInput
                  label={t('common:name')}
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoCapitalize="words"
                  autoComplete="name"
                  accessibilityInvalid={!!error}
                />
              )}

              <TextInput
                label={t('common:email')}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityInvalid={!!error}
              />

              <TextInput
                label={t('common:password')}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={authMode === 'login' ? 'password' : 'new-password'}
                accessibilityInvalid={!!error}
              />

              {authMode === 'register' && (
                <TextInput
                  label={t('common:confirm_password')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  accessibilityInvalid={!!error}
                />
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                accessibilityLabel={authMode === 'login' ? t('common:login') : t('common:create_account')}
              >
                {authMode === 'login' ? t('common:login') : t('common:create_account')}
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              {t('common:terms_of_service')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  authCard: {
    marginBottom: 32,
  },
  segmentedButtons: {
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});