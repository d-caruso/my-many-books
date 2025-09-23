import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ResponsiveInput } from '../UI/ResponsiveInput';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long and contain uppercase, lowercase and numbers');
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        surname: formData.surname
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
      setError(err instanceof Error ? err.message : 'Registration failed');
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
    <div className="max-w-md mx-auto bg-surface rounded-lg shadow-lg border border-secondary-200 overflow-hidden">
      <div className="px-6 py-4 bg-primary-50 border-b border-secondary-200">
        <h2 className="text-xl font-semibold text-text-primary">Create Account</h2>
        <p className="text-text-secondary text-sm">Join My Many Books today</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-green-800 text-sm font-medium">{success}</p>
                {requiresVerification && (
                  <p className="text-green-700 text-xs mt-1">
                    After clicking the verification link, you can return here to sign in.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
          <ResponsiveInput
            type="text"
            id="name"
            label="First Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="First name"
            required
            disabled={loading}
          />

          <ResponsiveInput
            type="text"
            id="surname"
            label="Last Name"
            value={formData.surname}
            onChange={(e) => handleInputChange('surname', e.target.value)}
            placeholder="Last name"
            required
            disabled={loading}
          />
        </div>

        <ResponsiveInput
          type="email"
          id="email"
          label="Email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="Enter your email"
          required
          disabled={loading}
        />

        <ResponsiveInput
          type="password"
          id="password"
          label="Password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          placeholder="Create a password"
          required
          disabled={loading}
          minLength={6}
        />

        <ResponsiveInput
          type="password"
          id="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={loading}
        />

        <ResponsiveButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          loading={loading}
          className="w-full"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </ResponsiveButton>

        <div className="text-center pt-4 border-t border-secondary-200">
          <p className="text-text-secondary text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary-500 hover:text-primary-600 font-medium"
              disabled={loading}
            >
              Sign in
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};