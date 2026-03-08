import React, { useMemo, useState } from 'react';
import { Alert, Box, Container, IconButton, InputAdornment, Paper, Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import { AuthApiError, useAuth, PASSWORD_POLICY, getRequiredPasswordRuleTypes, formatLocalizedList } from '@my-many-books/shared-auth';
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

  const passwordRequirementsText = t('common:password_requirements', {
    minLength: PASSWORD_POLICY.minLength,
    requiredTypes: formatLocalizedList(
      getRequiredPasswordRuleTypes().map((rule) => t(`common:password_rule_${rule}`)),
      i18n.language || 'en'
    ),
  });

  const [form, setForm] = useState<PasswordFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PasswordFormState, string>>>({});
  const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null);
  const [successMessageKey, setSuccessMessageKey] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isSubmitDisabled = useMemo(() => {
    return loading || !form.currentPassword || !form.newPassword || !form.confirmNewPassword;
  }, [form.confirmNewPassword, form.currentPassword, form.newPassword, loading]);

  const updateField = (field: keyof PasswordFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    }
    if (submitErrorKey) {
      setSubmitErrorKey(null);
    }
    if (successMessageKey) {
      setSuccessMessageKey(null);
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: Partial<Record<keyof PasswordFormState, string>> = {};

    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = 'common:password_required';
    }

    if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword = 'common:new_password_same_as_current';
    }

    const strengthResult = validatePasswordStrength(form.newPassword);
    if (!strengthResult.isValid && !nextErrors.newPassword) {
      nextErrors.newPassword = strengthResult.i18nKey || 'common:invalid_data';
    }

    const confirmationResult = validatePasswordConfirmation(form.newPassword, form.confirmNewPassword);
    if (!confirmationResult.isValid) {
      nextErrors.confirmNewPassword = confirmationResult.i18nKey || 'common:passwords_no_match';
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
      setSuccessMessageKey('common:password_changed_successfully');
      setSubmitErrorKey(null);
      setFieldErrors({});
      setForm(INITIAL_FORM_STATE);
    } catch (error: unknown) {
      if (error instanceof AuthApiError) {
        setSubmitErrorKey(error.i18nKey);
      } else {
        setSubmitErrorKey('common:unexpected_error');
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

          {submitErrorKey ? <Alert severity="error">{t(submitErrorKey)}</Alert> : null}
          {successMessageKey ? <Alert severity="success">{t(successMessageKey)}</Alert> : null}

          <ResponsiveInput
            id="account-email"
            type="email"
            label={t('common:readonly_email')}
            value={user?.email || ''}
            disabled
          />

          <ResponsiveInput
            id="current-password"
            type={showCurrentPassword ? 'text' : 'password'}
            label={t('common:current_password')}
            value={form.currentPassword}
            onChange={(event) => updateField('currentPassword', event.target.value)}
            error={fieldErrors.currentPassword ? t(fieldErrors.currentPassword) : undefined}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showCurrentPassword ? t('common:hide_password', 'Hide password') : t('common:show_password', 'Show password')}
                    disabled={loading}
                  >
                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <ResponsiveInput
            id="new-password"
            type={showNewPassword ? 'text' : 'password'}
            label={t('common:new_password')}
            value={form.newPassword}
            onChange={(event) => updateField('newPassword', event.target.value)}
            error={fieldErrors.newPassword ? t(fieldErrors.newPassword) : undefined}
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showNewPassword ? t('common:hide_password', 'Hide password') : t('common:show_password', 'Show password')}
                    disabled={loading}
                  >
                    {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: -1 }}>
            {passwordRequirementsText}
          </Typography>

          <ResponsiveInput
            id="confirm-new-password"
            type={showConfirmPassword ? 'text' : 'password'}
            label={t('common:confirm_new_password')}
            value={form.confirmNewPassword}
            onChange={(event) => updateField('confirmNewPassword', event.target.value)}
            error={fieldErrors.confirmNewPassword ? t(fieldErrors.confirmNewPassword) : undefined}
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showConfirmPassword ? t('common:hide_password', 'Hide password') : t('common:show_password', 'Show password')}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
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
