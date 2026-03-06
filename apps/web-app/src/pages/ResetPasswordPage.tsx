import React, { useMemo, useState } from 'react';
import { Alert, Box, Container, Link, Paper, Stack, Typography } from '@mui/material';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';
import { buildUrl } from '@my-many-books/shared-navigation';
import { validatePasswordConfirmation, validatePasswordStrength } from '@my-many-books/shared-validation';
import { ResponsiveButton } from '../components/UI/ResponsiveButton';
import { ResponsiveInput } from '../components/UI/ResponsiveInput';
import { LanguageSelector } from '../components/Navigation/LanguageSelector';

interface ResetFormState {
  email: string;
  code: string;
  newPassword: string;
  confirmNewPassword: string;
}

const ResetPasswordPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'validation']);
  const { user, confirmPasswordReset, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get('email') || '';
  const initialCode = searchParams.get('code') || '';

  const [form, setForm] = useState<ResetFormState>({
    email: initialEmail,
    code: initialCode,
    newPassword: '',
    confirmNewPassword: '',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ResetFormState, string>>>({});

  if (user) {
    return <Navigate to={buildUrl('account')} replace />;
  }

  const isSubmitDisabled = useMemo(() => {
    return (
      loading ||
      !form.email.trim() ||
      !form.code.trim() ||
      !form.newPassword ||
      !form.confirmNewPassword
    );
  }, [form.code, form.confirmNewPassword, form.email, form.newPassword, loading]);

  const updateField = (field: keyof ResetFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: Partial<Record<keyof ResetFormState, string>> = {};

    if (!form.email.trim()) {
      nextErrors.email = t('common:email_required');
    }

    if (!form.code.trim()) {
      nextErrors.code = t('common:required');
    }

    const strengthResult = validatePasswordStrength(form.newPassword);
    if (!strengthResult.isValid) {
      nextErrors.newPassword = t(strengthResult.i18nKey || 'common:invalid_data', {
        defaultValue: strengthResult.error || t('common:invalid_data'),
      });
    }

    const confirmationResult = validatePasswordConfirmation(form.newPassword, form.confirmNewPassword);
    if (!confirmationResult.isValid) {
      nextErrors.confirmNewPassword = t(confirmationResult.i18nKey || 'common:passwords_no_match', {
        defaultValue: confirmationResult.error || t('common:passwords_no_match'),
      });
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await confirmPasswordReset({
        email: form.email.trim(),
        code: form.code.trim(),
        newPassword: form.newPassword,
        locale: i18n.language || 'en',
      });
      setSubmitError(null);
      setSuccessMessage(t('common:reset_password_success'));
      setFieldErrors({});
      setForm((previous) => ({
        ...previous,
        newPassword: '',
        confirmNewPassword: '',
      }));
    } catch (error: unknown) {
      if (error instanceof AuthApiError) {
        setSubmitError(t(error.i18nKey, { defaultValue: error.message }));
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError(t('common:unexpected_error'));
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
                {t('common:reset_password_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('common:reset_password_subtitle')}
              </Typography>

              {submitError ? <Alert severity="error">{submitError}</Alert> : null}
              {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

              <ResponsiveInput
                id="reset-email"
                type="email"
                label={t('common:email')}
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                error={fieldErrors.email}
                autoComplete="email"
                disabled={loading || Boolean(initialEmail)}
              />

              <ResponsiveInput
                id="reset-code"
                type="text"
                label={t('common:reset_code')}
                value={form.code}
                onChange={(event) => updateField('code', event.target.value)}
                error={fieldErrors.code}
                disabled={loading || Boolean(initialCode)}
                placeholder={t('common:enter_reset_code')}
              />

              <ResponsiveInput
                id="reset-new-password"
                type="password"
                label={t('common:new_password')}
                value={form.newPassword}
                onChange={(event) => updateField('newPassword', event.target.value)}
                error={fieldErrors.newPassword}
                autoComplete="new-password"
              />

              <ResponsiveInput
                id="reset-confirm-new-password"
                type="password"
                label={t('common:confirm_new_password')}
                value={form.confirmNewPassword}
                onChange={(event) => updateField('confirmNewPassword', event.target.value)}
                error={fieldErrors.confirmNewPassword}
                autoComplete="new-password"
              />

              <ResponsiveButton
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={isSubmitDisabled}
                fullWidth
              >
                {loading ? t('common:resetting_password') : t('common:reset_password_submit')}
              </ResponsiveButton>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                <Link
                  component="button"
                  type="button"
                  onClick={() => navigate(buildUrl('auth'))}
                  underline="hover"
                >
                  {t('common:back_to_sign_in')}
                </Link>
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default ResetPasswordPage;
