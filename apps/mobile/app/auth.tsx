import React, { useState } from 'react';
  import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
  import { Text, TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { router } from 'expo-router';

  import { useTranslation } from 'react-i18next';
  import {
    useAuth,
    PASSWORD_POLICY,
    getRequiredPasswordRuleTypes,
    validatePasswordAgainstPolicy,
    formatLocalizedList,
  } from '@my-many-books/shared-auth';
  import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

  type AuthMode = 'login' | 'register';
  const logoMark = require('../assets/logo-mark-primary.png');

  export default function AuthScreen() {
    const { t, i18n } = useTranslation();
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login, register, loading } = useAuth();
    const passwordRuleLabels = getRequiredPasswordRuleTypes().map((rule) =>
      t(`common:password_rule_${rule}`)
    );
    const passwordRequirementsText = t('common:password_requirements', {
      minLength: PASSWORD_POLICY.minLength,
      requiredTypes: formatLocalizedList(passwordRuleLabels, i18n.language || 'en'),
    });

    const handleSubmit = async () => {
      setError(null);

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
          if (!validatePasswordAgainstPolicy(password).isValid) {
            throw new Error(passwordRequirementsText);
          }
          // ← CHANGED: register signature
          await register({
            email,
            password,
            name,
            surname: '' // shared-auth requires surname
          });
        } else {
          await login(email, password);
        }

        // Navigation handled after successful auth
        router.replace('/(tabs)');
      } catch (err: Error) {
        mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
          operation: authMode,
          error: err.message,
          statusCode: err.status,
          source: 'auth_screen'
        });
        setError(t('common:auth_failed'));
      }
    };

    const resetForm = () => {
      setEmail('');
      setPassword('');
      setName('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
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
              <Image
                source={logoMark}
                style={styles.logo}
                accessibilityRole="image"
                accessibilityLabel={`${t('common:app_title')} logo`}
              />
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
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete={authMode === 'login' ? 'password' : 'new-password'}
                  accessibilityInvalid={!!error}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword((prev) => !prev)}
                      forceTextInputFocus={false}
                      accessibilityLabel={
                        showPassword
                          ? t('common:hide_password', 'Hide password')
                          : t('common:show_password', 'Show password')
                      }
                    />
                  }
                />
                <Text variant="bodySmall" style={styles.passwordHelpText}>
                  {passwordRequirementsText}
                </Text>

                {authMode === 'register' && (
                  <TextInput
                    label={t('common:confirm_password')}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={styles.input}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    accessibilityInvalid={!!error}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirmPassword((prev) => !prev)}
                        forceTextInputFocus={false}
                        accessibilityLabel={
                          showConfirmPassword
                            ? t('common:hide_password', 'Hide password')
                            : t('common:show_password', 'Show password')
                        }
                      />
                    }
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
    logo: {
      width: 64,
      height: 64,
      marginBottom: 12,
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
    passwordHelpText: {
      marginTop: -10,
      marginBottom: 12,
      opacity: 0.75,
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
