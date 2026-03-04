import { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import {
  useAuth,
  PASSWORD_POLICY,
  getRequiredPasswordRuleTypes,
  validatePasswordAgainstPolicy,
  formatLocalizedList,
} from '@my-many-books/shared-auth';
import { POST_LOGIN_WELCOME_STORAGE_KEY } from '@my-many-books/shared-types';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';
import { extractErrorDetails } from '@my-many-books/shared-utils';
import { API_BASE_URL } from '@/config/api';
import { authService } from '@/services/authService';

type AuthMode = 'login' | 'register';
const logoMark = require('../assets/logo-mark-primary.png');
interface GoogleStartResponse {
  authorizeUrl: string;
  state: string;
}

interface GoogleMobileStartRequest {
  redirectUri: string;
  codeVerifier: string;
}

const getFirstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const buildMobileRedirectUri = (): string => Linking.createURL('auth');
const GOOGLE_PKCE_VERIFIER_STORAGE_KEY = 'auth.google.pkce.verifier';
const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const generatePkceCodeVerifier = (): string => {
  const cryptoApi = (globalThis as unknown as {
    crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
  }).crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure random generator unavailable');
  }

  const values = new Uint8Array(64);
  cryptoApi.getRandomValues(values);
  let verifier = '';
  for (const value of values) {
    verifier += PKCE_CHARSET[value % PKCE_CHARSET.length];
  }

  return verifier;
};

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
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, register, refreshUser, loading } = useAuth();
  const params = useLocalSearchParams<{
    code?: string | string[];
    state?: string | string[];
    error?: string | string[];
  }>();

  const googleCode = getFirstParam(params.code);
  const googleState = getFirstParam(params.state);
  const googleError = getFirstParam(params.error);

  const passwordRuleLabels = getRequiredPasswordRuleTypes().map((rule) =>
    t(`common:password_rule_${rule}`)
  );

  const passwordRequirementsText = t('common:password_requirements', {
    minLength: PASSWORD_POLICY.minLength,
    requiredTypes: formatLocalizedList(passwordRuleLabels, i18n.language || 'en'),
  });

  const isBusy = loading || googleLoading;

  useEffect(() => {
    if (!googleCode && !googleError) {
      return;
    }

    let ignore = false;

    const completeGoogleLogin = async () => {
      if (googleError) {
        await AsyncStorage.removeItem(GOOGLE_PKCE_VERIFIER_STORAGE_KEY);
        if (!ignore) {
          setError(t('common:google_login_failed', 'Google login failed. Please try again.'));
        }
        return;
      }

      if (!googleCode || !googleState) {
        await AsyncStorage.removeItem(GOOGLE_PKCE_VERIFIER_STORAGE_KEY);
        if (!ignore) {
          setError(t('common:google_login_failed', 'Google login failed. Please try again.'));
        }
        return;
      }

      setGoogleLoading(true);
      setError(null);

      try {
        const storedCodeVerifier = await AsyncStorage.getItem(GOOGLE_PKCE_VERIFIER_STORAGE_KEY);
        if (!storedCodeVerifier) {
          throw new Error('Missing PKCE verifier');
        }

        await authService.loginWithGoogleCode({
          code: googleCode,
          state: googleState,
          redirectUri: buildMobileRedirectUri(),
          codeVerifier: storedCodeVerifier,
        });

        await refreshUser();

        try {
          await AsyncStorage.setItem(POST_LOGIN_WELCOME_STORAGE_KEY, '1');
        } catch {
          // Non-blocking feedback.
        }

        if (!ignore) {
          router.replace('/(tabs)');
        }
      } catch (err: unknown) {
        const details = extractErrorDetails(err);
        mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
          operation: 'google_login_callback',
          error: details.message,
          statusCode: details.status,
          source: 'auth_screen',
        });

        if (!ignore) {
          setError(t('common:google_login_failed', 'Google login failed. Please try again.'));
        }
      } finally {
        await AsyncStorage.removeItem(GOOGLE_PKCE_VERIFIER_STORAGE_KEY);
        if (!ignore) {
          setGoogleLoading(false);
        }
      }
    };

    void completeGoogleLogin();

    return () => {
      ignore = true;
    };
  }, [googleCode, googleError, googleState, refreshUser, t]);

  const handleSubmit = async () => {
    setError(null);

    try {
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

        await register({
          email,
          password,
          name,
          surname: '',
          locale: i18n.language || 'en',
        });
      } else {
        await login(email, password);
        try {
          await AsyncStorage.setItem(POST_LOGIN_WELCOME_STORAGE_KEY, '1');
        } catch {
          // Non-blocking feedback.
        }
      }

      router.replace('/(tabs)');
    } catch (err: unknown) {
      const details = extractErrorDetails(err);
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: authMode,
        error: details.message,
        statusCode: details.status,
        source: 'auth_screen',
      });
      setError(t('common:auth_failed'));
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const codeVerifier = generatePkceCodeVerifier();
      const redirectUri = buildMobileRedirectUri();
      await AsyncStorage.setItem(GOOGLE_PKCE_VERIFIER_STORAGE_KEY, codeVerifier);

      const startPayload: GoogleMobileStartRequest = {
        redirectUri,
        codeVerifier,
      };

      const response = await fetch(`${API_BASE_URL}/auth/google/mobile/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to start Google OAuth');
      }

      const data = (await response.json()) as GoogleStartResponse;
      if (!data.authorizeUrl) {
        throw new Error('Invalid Google OAuth start response');
      }

      await Linking.openURL(data.authorizeUrl);
    } catch (err: unknown) {
      await AsyncStorage.removeItem(GOOGLE_PKCE_VERIFIER_STORAGE_KEY);
      const details = extractErrorDetails(err);
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'google_login_start',
        error: details.message,
        statusCode: details.status,
        source: 'auth_screen',
      });
      setError(t('common:google_login_failed', 'Google login failed. Please try again.'));
    } finally {
      setGoogleLoading(false);
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
              />

              {error && (
                <View style={styles.errorContainer}>
                  <Text
                    variant="bodyMedium"
                    style={styles.errorText}
                    accessibilityLiveRegion="assertive"
                    nativeID="authError"
                  >
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
              />

              <TextInput
                label={t('common:password')}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={authMode === 'login' ? 'password' : 'new-password'}
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
                disabled={isBusy}
                style={styles.submitButton}
                accessibilityLabel={authMode === 'login' ? t('common:login') : t('common:create_account')}
              >
                {authMode === 'login' ? t('common:login') : t('common:create_account')}
              </Button>

              <Button
                mode="outlined"
                onPress={handleGoogleLogin}
                disabled={isBusy || authMode === 'register'}
                loading={googleLoading}
                style={styles.googleButton}
                accessibilityLabel={t('common:continue_with_google', 'Continue with Google')}
              >
                {t('common:continue_with_google', 'Continue with Google')}
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
  googleButton: {
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
