import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import { useAuth, AuthApiError } from '@my-many-books/shared-auth';
import { ResponsiveInput } from '../components/UI/ResponsiveInput';
import { ResponsiveButton } from '../components/UI/ResponsiveButton';
import { LanguageSelector } from '../components/Navigation/LanguageSelector';
import type { VerifyEmailNavState } from '../types/authNavState';

const VerifyEmailPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { verifyEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get('email') || '';
  const codeParam = searchParams.get('code') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(codeParam);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();
  const autoSubmitted = useRef(false);

  const redirectWithResult = (success: boolean, errorMessage?: string) => {
    const state: VerifyEmailNavState = success
      ? { success: true }
      : { success: false, errorMessage };
    navigate('/auth', { replace: true, state });
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !code) return;

    setLoading(true);

    try {
      await verifyEmail(email, code);
      redirectWithResult(true);
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        redirectWithResult(false, t(err.i18nKey, { defaultValue: err.message }));
      } else {
        redirectWithResult(false, err instanceof Error ? err.message : t('verify_email_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    return () => clearInterval(cooldownRef.current);
  }, []);

  const handleResend = async () => {
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

  useEffect(() => {
    if (!emailParam || !codeParam || autoSubmitted.current) return;
    autoSubmitted.current = true;

    const autoVerify = async () => {
      setLoading(true);
      try {
        await verifyEmail(emailParam, codeParam);
        redirectWithResult(true);
      } catch (err: unknown) {
        if (err instanceof AuthApiError) {
          redirectWithResult(false, t(err.i18nKey, { defaultValue: err.message }));
        } else {
          redirectWithResult(false, err instanceof Error ? err.message : t('verify_email_failed'));
        }
      } finally {
        setLoading(false);
      }
    };

    void autoVerify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam, codeParam, verifyEmail, t]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={{
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: { xs: 1.5, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <LanguageSelector />
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 6, md: 10 }, px: 2 }}>
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 4, py: 3, bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h5" component="h2">
                {t('verify_email_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('verify_email_subtitle')}
              </Typography>
            </Box>
            <Box component="form" onSubmit={handleVerify} sx={{ p: 4 }}>
              <Stack spacing={2}>
                <ResponsiveInput
                  type="email"
                  id="verify-email"
                  label={t('email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('enter_email')}
                  required
                  disabled={loading || !!emailParam}
                />
                <ResponsiveInput
                  type="text"
                  id="verify-code"
                  label={t('verification_code')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('enter_verification_code')}
                  required
                  disabled={loading}
                  inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <ResponsiveButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading || !email || !code}
                  loading={loading}
                  fullWidth
                >
                  {loading ? t('verifying') : t('verify_button')}
                </ResponsiveButton>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('resend_code_prompt')}
                  </Typography>
                  {cooldown > 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('resend_code_wait', { seconds: cooldown })}
                    </Typography>
                  ) : (
                    <Typography
                      variant="body2"
                      component="button"
                      type="button"
                      onClick={handleResend}
                      disabled={!email || resendStatus === 'sending'}
                      sx={{
                        background: 'none',
                        border: 'none',
                        color: 'primary.main',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        p: 0,
                        mt: 0.5,
                        '&:disabled': { color: 'text.disabled', cursor: 'default' },
                      }}
                    >
                      {resendStatus === 'sending' ? t('resending_code') : t('resend_code_click')}
                    </Typography>
                  )}
                  {resendStatus === 'sent' && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                      {t('resend_code_success')}
                    </Typography>
                  )}
                  {resendStatus === 'error' && (
                    <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                      {resendError}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default VerifyEmailPage;
