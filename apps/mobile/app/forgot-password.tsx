import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { user, loading, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
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

    try {
      await requestPasswordReset(email.trim());
      setSubmitSuccess(t('common:reset_request_accepted', { email: email.trim() }));
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {t('common:forgot_password_title')}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t('common:forgot_password_subtitle')}
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
              disabled={loading || !email.trim()}
              style={styles.submitButton}
              accessibilityLabel={t('common:send_reset_link')}
            >
              {loading
                ? t('common:sending_reset_link')
                : t('common:send_reset_link')}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 16,
    opacity: 0.8,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: '#b00020',
    marginTop: 4,
  },
  successText: {
    color: '#0f766e',
    marginTop: 4,
  },
  submitButton: {
    marginTop: 16,
  },
  backButton: {
    marginTop: 8,
  },
});
