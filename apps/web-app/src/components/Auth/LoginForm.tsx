import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ResponsiveInput } from '../UI/ResponsiveInput';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{email?: string; password?: string}>({});

  const isLoading = authLoading || loading;

  const validateForm = (): boolean => {
    const errors: {email?: string; password?: string} = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
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
      // Authentication success will be handled by AuthContext
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
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
    <div className="max-w-md mx-auto bg-surface rounded-lg shadow-lg border border-secondary-200 overflow-hidden">
      <div className="px-6 py-4 bg-primary-50 border-b border-secondary-200">
        <h2 className="text-xl font-semibold text-text-primary">Sign In</h2>
        <p className="text-text-secondary text-sm">Welcome back to My Many Books</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate aria-label="form">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="alert-error">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <ResponsiveInput
            type="email"
            id="email"
            label="Email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {validationErrors.email && (
            <p className="text-red-600 text-sm">{validationErrors.email}</p>
          )}
        </div>

        <div className="space-y-1">
          <ResponsiveInput
            type="password"
            id="password"
            label="Password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e as any);
              }
            }}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {validationErrors.password && (
            <p className="text-red-600 text-sm">{validationErrors.password}</p>
          )}
        </div>

        <ResponsiveButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={isLoading}
          loading={isLoading}
          className="w-full"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </ResponsiveButton>

        <div className="text-center pt-4 border-t border-secondary-200">
          <p className="text-text-secondary text-sm">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary-700 hover:text-primary-600 font-medium"
              disabled={isLoading}
            >
              Sign up
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};