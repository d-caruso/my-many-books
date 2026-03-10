import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';
import {
  validatePasswordConfirmation,
  validatePasswordStrength,
} from '@my-many-books/shared-validation';
import { resolveValidationError } from '@/utils/resolveValidationError';

const getFirstParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
};

export default function ResetPasswordScreen() {
  const { t, i18n } = useTranslation();
  const { user, loading, confirmPasswordReset } = useAuth();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    email?: string | string[];
    code?: string | string[];
  }>();

  const initialEmail = useMemo(() => getFirstParam(params.email), [params.email]);
  const initialCode = useMemo(() => getFirstParam(params.code), [params.code]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/account');
    }
  }, [loading, user]);

  const handleSubmit = async (): Promise<void> => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!email.trim()) {
      setSubmitError(t('common:email_required'));
      return;
    }

    if (!code.trim()) {
      setSubmitError(t('common:enter_reset_code'));
      return;
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      setSubmitError(resolveValidationError(t, passwordValidation.i18nKey, passwordValidation.error));
      return;
    }

    const confirmationValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmationValidation.isValid) {
      setSubmitError(
        resolveValidationError(t, confirmationValidation.i18nKey, confirmationValidation.error),
      );
      return;
    }

    try {
      await confirmPasswordReset({
        email: email.trim(),
        code: code.trim(),
        newPassword,
        locale: i18n.language || 'en',
      });

      setSubmitSuccess(t('common:reset_password_success'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      if (error instanceof AuthApiError) {
        setSubmitError(t(error.i18nKey, { defaultValue: error.message }));
        return;
      }

      if (error instanceof Error) {
        setSubmitError(error.message);
        return;
      }

      setSubmitError(t('common:unexpected_error'));
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        content: { padding: 16 },
        title: { marginBottom: 8, fontWeight: '700' },
        subtitle: { marginBottom: 16, opacity: 0.8 },
        input: { marginBottom: 12 },
        errorText: { color: theme.colors.error, marginTop: 4 },
        successText: { color: theme.colors.tertiary, marginTop: 4 },
        submitButton: { marginTop: 16 },
        backButton: { marginTop: 8 },
      }),
    [theme]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {t('common:reset_password_title')}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t('common:reset_password_subtitle')}
            </Text>

            <TextInput
              label={t('common:email')}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (submitError) {
                  setSubmitError(null);
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
            />

            <TextInput
              label={t('common:reset_code')}
              value={code}
              onChangeText={(value) => {
                setCode(value);
                if (submitError) {
                  setSubmitError(null);
                }
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />

            <TextInput
              label={t('common:new_password')}
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                if (submitError) {
                  setSubmitError(null);
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              style={styles.input}
            />

            <TextInput
              label={t('common:confirm_new_password')}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (submitError) {
                  setSubmitError(null);
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              style={styles.input}
            />

            {submitError ? (
              <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
                {submitError}
              </Text>
            ) : null}
            {submitSuccess ? (
              <Text accessibilityLiveRegion="polite" style={styles.successText}>
                {submitSuccess}
              </Text>
            ) : null}

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={
                loading ||
                !email.trim() ||
                !code.trim() ||
                !newPassword.trim() ||
                !confirmPassword.trim()
              }
              style={styles.submitButton}
              accessibilityLabel={t('common:reset_password_submit')}
            >
              {loading
                ? t('common:resetting_password')
                : t('common:reset_password_submit')}
            </Button>

            <Button
              mode="text"
              onPress={() => router.replace('/auth')}
              style={styles.backButton}
              accessibilityLabel={t('common:back_to_sign_in')}
            >
              {t('common:back_to_sign_in')}
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}

