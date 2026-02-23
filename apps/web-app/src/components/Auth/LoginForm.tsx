import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAuth,
  PASSWORD_POLICY,
  getRequiredPasswordRuleTypes,
  validatePasswordAgainstPolicy,
  formatLocalizedList,
} from '@my-many-books/shared-auth';
import { POST_LOGIN_WELCOME_STORAGE_KEY } from '@my-many-books/shared-types';
import {
  Paper,
  Box,
  Typography,
  Alert,
  Divider,
  Button as MuiButton,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ResponsiveInput } from '../UI/ResponsiveInput';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { t, i18n } = useTranslation(['common']);
  const { login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{email?: string; password?: string}>({});
  const [showPassword, setShowPassword] = useState(false);

  const isLoading = authLoading || loading;
  const passwordRuleLabels = getRequiredPasswordRuleTypes().map((rule) =>
    t(`common:password_rule_${rule}`)
  );
  const passwordRequirementsText = t('common:password_requirements', {
    minLength: PASSWORD_POLICY.minLength,
    requiredTypes: formatLocalizedList(passwordRuleLabels, i18n.language || 'en'),
  });

  const validateForm = (): boolean => {
    const errors: {email?: string; password?: string} = {};

    if (!formData.email) {
      errors.email = t('common:email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('common:email_invalid');
    }

    if (!formData.password) {
      errors.password = t('common:password_required');
    } else if (!validatePasswordAgainstPolicy(formData.password).isValid) {
      errors.password = passwordRequirementsText;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(formData.email, formData.password);
      try {
        window.sessionStorage.setItem(POST_LOGIN_WELCOME_STORAGE_KEY, '1');
      } catch {
        // ignore storage failures; login flow must continue
      }
      // Authentication success will be handled by AuthContext
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : t('common:login_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 480,
        margin: '0 auto',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 4, py: 3, bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" component="h2">
          {t('common:sign_in')}
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit} noValidate aria-label="Login form" sx={{ p: 4 }}>
        <Stack spacing={2}>
          {error && (
            <Alert
              severity="error"
              data-testid="alert-error"
              role="alert"
            >
              {error}
            </Alert>
          )}

          <div>
            <ResponsiveInput
              type="email"
              id="email"
              label={t('common:email')}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder={t('common:enter_email')}
              disabled={isLoading}
              aria-invalid={!!validationErrors.email}
              aria-describedby={validationErrors.email ? 'email-error' : undefined}
            />
            {validationErrors.email && (
              <Typography id="email-error" color="error" variant="caption" component="p" role="alert" sx={{ mt: 0.5 }}>
                {validationErrors.email}
              </Typography>
            )}
          </div>

          <div>
            <ResponsiveInput
              type={showPassword ? 'text' : 'password'}
              id="password"
              label={t('common:password')}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e as any);
                }
              }}
              placeholder={t('common:enter_password')}
              disabled={isLoading}
              aria-invalid={!!validationErrors.password}
              aria-describedby={
                validationErrors.password
                  ? 'password-error password-format-help'
                  : 'password-format-help'
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowPassword(prev => !prev)}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={
                        showPassword
                          ? t('common:hide_password', 'Hide password')
                          : t('common:show_password', 'Show password')
                      }
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {validationErrors.password && (
              <Typography id="password-error" color="error" variant="caption" component="p" role="alert" sx={{ mt: 0.5 }}>
                {validationErrors.password}
              </Typography>
            )}
            <Typography
              id="password-format-help"
              color="text.secondary"
              variant="caption"
              component="p"
              sx={{ mt: 0.5 }}
            >
              {passwordRequirementsText}
            </Typography>
          </div>

          <ResponsiveButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            loading={isLoading}
            fullWidth
          >
            {isLoading ? t('common:signing_in') : t('common:sign_in')}
          </ResponsiveButton>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t('common:dont_have_account')}{' '}
          <MuiButton
            type="button"
            onClick={onSwitchToRegister}
            disabled={isLoading}
            variant="text"
            size="small"
          >
            {t('common:sign_up')}
          </MuiButton>
        </Typography>
      </Box>
    </Paper>
  );
};
