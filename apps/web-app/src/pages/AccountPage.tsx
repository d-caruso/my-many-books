import React, { useMemo, useState } from 'react';
import { Alert, Box, Container, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';
import { validatePasswordConfirmation, validatePasswordStrength } from '@my-many-books/shared-validation';
import { ResponsiveButton } from '../components/UI/ResponsiveButton';
import { ResponsiveInput } from '../components/UI/ResponsiveInput';

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const INITIAL_FORM_STATE: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

const AccountPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'validation']);
  const { user, changePassword, loading } = useAuth();

  const [form, setForm] = useState<PasswordFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PasswordFormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return loading || !form.currentPassword || !form.newPassword || !form.confirmNewPassword;
  }, [form.confirmNewPassword, form.currentPassword, form.newPassword, loading]);

  const updateField = (field: keyof PasswordFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: Partial<Record<keyof PasswordFormState, string>> = {};

    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = t('common:password_required');
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
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        locale: i18n.language || 'en',
      });
      setSuccessMessage(t('common:password_changed_successfully'));
      setSubmitError(null);
      setFieldErrors({});
      setForm(INITIAL_FORM_STATE);
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
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Stack spacing={2} component="form" onSubmit={handleSubmit}>
          <Typography variant="h5" component="h1">
            {t('common:account_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('common:account_subtitle')}
          </Typography>

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          <ResponsiveInput
            id="account-email"
            type="email"
            label={t('common:readonly_email')}
            value={user?.email || ''}
            disabled
          />

          <ResponsiveInput
            id="current-password"
            type="password"
            label={t('common:current_password')}
            value={form.currentPassword}
            onChange={(event) => updateField('currentPassword', event.target.value)}
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
          />

          <ResponsiveInput
            id="new-password"
            type="password"
            label={t('common:new_password')}
            value={form.newPassword}
            onChange={(event) => updateField('newPassword', event.target.value)}
            error={fieldErrors.newPassword}
            autoComplete="new-password"
          />

          <ResponsiveInput
            id="confirm-new-password"
            type="password"
            label={t('common:confirm_new_password')}
            value={form.confirmNewPassword}
            onChange={(event) => updateField('confirmNewPassword', event.target.value)}
            error={fieldErrors.confirmNewPassword}
            autoComplete="new-password"
          />

          <Box>
            <ResponsiveButton
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={isSubmitDisabled}
              fullWidth
            >
              {loading ? t('common:changing_password') : t('common:change_password')}
            </ResponsiveButton>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AccountPage;
