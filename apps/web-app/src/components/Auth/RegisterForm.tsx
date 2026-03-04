import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAuth,
  PASSWORD_POLICY,
  getRequiredPasswordRuleTypes,
  validatePasswordAgainstPolicy,
  formatLocalizedList,
} from '@my-many-books/shared-auth';
import {
  Paper,
  Box,
  Typography,
  Alert,
  Grid,
  Button as MuiButton,
  Stack,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ResponsiveInput } from '../UI/ResponsiveInput';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { t, i18n } = useTranslation(['common', 'accessibility']);
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    surname: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordRuleLabels = getRequiredPasswordRuleTypes().map((rule) =>
    t(`common:password_rule_${rule}`)
  );
  const passwordRequirementsText = t('common:password_requirements', {
    minLength: PASSWORD_POLICY.minLength,
    requiredTypes: formatLocalizedList(passwordRuleLabels, i18n.language || 'en'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError(t('common:passwords_no_match'));
      setLoading(false);
      return;
    }

    if (!validatePasswordAgainstPolicy(formData.password).isValid) {
      setError(passwordRequirementsText);
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        surname: formData.surname,
        locale: i18n.language || 'en',
      });
      
      if (result) {
        setSuccess(result.message);
        setRequiresVerification(result.requiresVerification);
        setError(null);
        
        // Clear the form if verification is required
        if (result.requiresVerification) {
          setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            surname: ''
          });
        }
      }
      // If no result, registration success will be handled by AuthContext (auto-login)
    } catch (err: unknown) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : t('common:registration_failed'));
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 520,
        margin: '0 auto',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 4, py: 3, bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" component="h2">
          {t('common:create_account')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('common:join_app')}
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        aria-label={t('accessibility:registration_form', 'Registration form')}
        sx={{ p: 4 }}
      >
        <Stack spacing={2}>
          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              icon={<CheckCircleIcon fontSize="small" />}
              role="status"
            >
              <Typography variant="body2" fontWeight={600}>
                {success}
              </Typography>
              {requiresVerification && (
                <Typography variant="caption" display="block">
                  {t('common:verification_link_instruction')}
                </Typography>
              )}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <ResponsiveInput
                type="text"
                id="name"
                label={t('common:first_name')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('common:first_name_placeholder')}
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ResponsiveInput
                type="text"
                id="surname"
                label={t('common:last_name')}
                value={formData.surname}
                onChange={(e) => handleInputChange('surname', e.target.value)}
                placeholder={t('common:last_name_placeholder')}
                required
                disabled={loading}
              />
            </Grid>
          </Grid>

          <ResponsiveInput
            type="email"
            id="email"
            label={t('common:email')}
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder={t('common:enter_email')}
            required
            disabled={loading}
          />

          <ResponsiveInput
            type={showPassword ? 'text' : 'password'}
            id="password"
            label={t('common:password')}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder={t('common:create_password')}
            required
            disabled={loading}
            inputProps={{ minLength: PASSWORD_POLICY.minLength }}
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
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: -1, mb: 0.5 }}>
            {passwordRequirementsText}
          </Typography>

          <ResponsiveInput
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            label={t('common:confirm_password')}
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e as any);
              }
            }}
            placeholder={t('common:confirm_your_password')}
            required
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={
                      showConfirmPassword
                        ? t('common:hide_password', 'Hide password')
                        : t('common:show_password', 'Show password')
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <ResponsiveButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            loading={loading}
            fullWidth
          >
            {loading ? t('common:creating_account') : t('common:create_account')}
          </ResponsiveButton>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t('common:already_have_account')}{' '}
          <MuiButton
            type="button"
            onClick={onSwitchToLogin}
            disabled={loading}
            variant="text"
            size="small"
          >
            {t('common:sign_in')}
          </MuiButton>
        </Typography>
      </Box>
    </Paper>
  );
};
