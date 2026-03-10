import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';

export default function VerifyEmailScreen() {
  const { t } = useTranslation('common');
  const { verifyEmail, resendCode } = useAuth();
  const theme = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    return () => clearInterval(cooldownRef.current);
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(30);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleVerify = async (): Promise<void> => {
    if (!email || !code) return;

    setLoading(true);
    setError(null);

    try {
      await verifyEmail(email, code);
      router.replace('/auth');
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        setError(t(err.i18nKey, { defaultValue: err.message }));
      } else {
        setError(err instanceof Error ? err.message : t('verify_email_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!email || resendStatus === 'sending' || cooldown > 0) return;

    setResendStatus('sending');
    setResendError('');

    try {
      await resendCode(email);
      setResendStatus('sent');
      startCooldown();
    } catch (err: unknown) {
      setResendStatus('error');
      if (err instanceof AuthApiError) {
        setResendError(t(err.i18nKey, { defaultValue: err.message }));
      } else {
        setResendError(t('resend_code_failed'));
      }
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
        submitButton: { marginTop: 8 },
        resendContainer: { marginTop: 16, alignItems: 'center' },
        resendPrompt: { opacity: 0.7 },
        cooldownText: { opacity: 0.6, marginTop: 4 },
        successText: { color: theme.colors.tertiary, marginTop: 4 },
        errorText: { color: theme.colors.error, marginTop: 4 },
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
              {t('verify_email_title')}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t('verify_email_subtitle')}
            </Text>

            <TextInput
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              disabled={loading || !!params.email}
              style={styles.input}
            />

            <TextInput
              label={t('verification_code')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              disabled={loading}
              style={styles.input}
              placeholder={t('enter_verification_code')}
            />

            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                style={styles.errorText}
              >
                {error}
              </Text>
            ) : null}

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              disabled={loading || !email || !code}
              style={styles.submitButton}
              accessibilityLabel={t('verify_button')}
            >
              {loading ? t('verifying') : t('verify_button')}
            </Button>

            <View style={styles.resendContainer}>
              <Text variant="bodySmall" style={styles.resendPrompt}>
                {t('resend_code_prompt')}
              </Text>

              {cooldown > 0 ? (
                <Text variant="bodySmall" style={styles.cooldownText}>
                  {t('resend_code_wait', { seconds: cooldown })}
                </Text>
              ) : (
                <Button
                  mode="text"
                  onPress={handleResend}
                  disabled={!email || resendStatus === 'sending'}
                  loading={resendStatus === 'sending'}
                  compact
                  accessibilityLabel={t('resend_code')}
                >
                  {resendStatus === 'sending' ? t('resending_code') : t('resend_code_click')}
                </Button>
              )}

              {resendStatus === 'sent' ? (
                <Text
                  variant="bodySmall"
                  accessibilityLiveRegion="polite"
                  style={styles.successText}
                >
                  {t('resend_code_success')}
                </Text>
              ) : null}

              {resendStatus === 'error' ? (
                <Text
                  variant="bodySmall"
                  accessibilityLiveRegion="assertive"
                  style={styles.errorText}
                >
                  {resendError}
                </Text>
              ) : null}
            </View>

            <Button
              mode="text"
              onPress={() => router.replace('/auth')}
              style={styles.backButton}
              accessibilityLabel={t('back_to_sign_in')}
            >
              {t('back_to_sign_in')}
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}

