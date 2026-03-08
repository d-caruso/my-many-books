import React, { useState } from 'react';
import { Alert, Box, Container, Link, Paper, Stack, Typography } from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';
import { buildUrl } from '@my-many-books/shared-navigation';
import { ResponsiveButton } from '../components/UI/ResponsiveButton';
import { ResponsiveInput } from '../components/UI/ResponsiveInput';
import { LanguageSelector } from '../components/Navigation/LanguageSelector';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { user, requestPasswordReset, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  if (user) {
    return <Navigate to={buildUrl('account')} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      setSubmitError(t('email_required'));
      return;
    }

    try {
      await requestPasswordReset(email.trim());
      setSubmitError(null);
      setSubmittedEmail(email.trim());
    } catch (error: unknown) {
      if (error instanceof AuthApiError) {
        setSubmitError(t(error.i18nKey, { defaultValue: error.message }));
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError(t('unexpected_error'));
      }
    }
  };

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
          <Paper elevation={3} sx={{ p: 4 }}>
            <Stack spacing={2} component="form" onSubmit={handleSubmit}>
              <Typography variant="h5" component="h1">
                {t('forgot_password_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('forgot_password_subtitle')}
              </Typography>

              {submitError ? <Alert severity="error">{submitError}</Alert> : null}
              {submittedEmail ? (
                <Alert severity="success">
                  {t('reset_request_accepted', { email: submittedEmail })}
                </Alert>
              ) : null}

              <ResponsiveInput
                id="forgot-password-email"
                type="email"
                label={t('email')}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (submitError) {
                    setSubmitError(null);
                  }
                }}
                disabled={loading}
                autoComplete="email"
                placeholder={t('enter_email')}
              />

              <ResponsiveButton
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading || !email.trim()}
                fullWidth
              >
                {loading ? t('sending_reset_link') : t('send_reset_link')}
              </ResponsiveButton>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                <Link
                  component="button"
                  type="button"
                  onClick={() => navigate(buildUrl('auth'))}
                  underline="hover"
                >
                  {t('back_to_sign_in')}
                </Link>
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default ForgotPasswordPage;
