import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';
import {
  validatePasswordConfirmation,
  validatePasswordStrength,
} from '@my-many-books/shared-validation';
import { resolveValidationError } from '@/utils/resolveValidationError';

export default function AccountScreen() {
  const { t, i18n } = useTranslation();
  const { user, loading, changePassword } = useAuth();
  const theme = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [loading, user]);

  const clearFeedback = (): void => {
    if (submitError) {
      setSubmitError(null);
    }
    if (submitSuccess) {
      setSubmitSuccess(null);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    clearFeedback();

    if (!currentPassword.trim()) {
      setSubmitError(t('validation:password_required'));
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
      await changePassword({
        currentPassword,
        newPassword,
        locale: i18n.language || 'en',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSubmitSuccess(t('common:password_changed_successfully'));
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

  const isSubmitDisabled =
    loading ||
    !currentPassword.trim() ||
    !newPassword.trim() ||
    !confirmPassword.trim();

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
      }),
    [theme]
  );

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {t('common:account_title')}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t('common:account_subtitle')}
            </Text>

            <TextInput
              label={t('common:readonly_email')}
              value={user.email}
              editable={false}
              disabled
              style={styles.input}
            />

            <TextInput
              label={t('common:current_password')}
              value={currentPassword}
              onChangeText={(value) => {
                setCurrentPassword(value);
                clearFeedback();
              }}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              style={styles.input}
            />

            <TextInput
              label={t('common:new_password')}
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                clearFeedback();
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
                clearFeedback();
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
              disabled={isSubmitDisabled}
              style={styles.submitButton}
              accessibilityLabel={t('common:change_password')}
            >
              {loading
                ? t('common:changing_password')
                : t('common:change_password')}
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}

