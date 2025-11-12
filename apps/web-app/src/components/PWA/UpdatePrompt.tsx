import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePWAContext } from '../../contexts/PWAContext';

interface UpdatePromptProps {
  variant?: 'banner' | 'dialog' | 'snackbar';
  message?: string;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({
  variant = 'banner',
  message
}) => {
  const { t } = useTranslation();
  const { updateAvailable, updateApp, dismissUpdate } = usePWAContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!updateAvailable) {
    return null;
  }

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateApp();
    } catch (err) {
      setError(t('pwa:update_prompt.update_failed'));
      setLoading(false);
    }
  };

  const defaultMessage = message || t('pwa:update_prompt.message');

  if (variant === 'dialog') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="dialog">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6" data-testid="dialog-title">
            <h2 className="text-xl font-semibold text-gray-900">{t('pwa:update_prompt.title')}</h2>
          </div>
          <div className="px-6 pb-4" data-testid="dialog-content">
            <p className="text-gray-600">{defaultMessage}</p>
            {loading && (
              <div className="mt-4">
                <div className="h-1 bg-blue-500 rounded animate-pulse" data-testid="linear-progress" />
                <p className="text-sm text-gray-500 mt-2">{t('pwa:update_prompt.updating')}</p>
              </div>
            )}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded p-3" data-testid="alert-error">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
          <div className="px-6 pb-6 flex justify-end space-x-3" data-testid="dialog-actions">
            <button
              onClick={dismissUpdate}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            >
              {t('pwa:update_prompt.later_button')}
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? t('pwa:update_prompt.updating') : t('pwa:update_prompt.update_button')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'snackbar') {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm" data-testid="snackbar">
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium">{t('pwa:update_prompt.title')}</p>
              <p className="text-xs opacity-90">{defaultMessage}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={dismissUpdate}
                disabled={loading}
                className="text-xs px-3 py-1 hover:bg-white hover:bg-opacity-10 rounded transition-colors disabled:opacity-50"
              >
                {t('pwa:update_prompt.later_button')}
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="text-xs px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors disabled:opacity-50"
              >
                {loading ? t('pwa:update_prompt.updating') : t('pwa:update_prompt.update_button')}
              </button>
            </div>
          </div>
          {loading && (
            <div className="mt-2">
              <div className="h-1 bg-white bg-opacity-30 rounded" data-testid="linear-progress" />
            </div>
          )}
          {error && (
            <div className="mt-2 bg-red-500 bg-opacity-20 border border-red-400 rounded p-2" data-testid="alert-error">
              <p className="text-xs">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default banner variant
  return (
    <div className="fixed top-4 left-4 right-4 bg-accent text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:max-w-sm" data-testid="alert-info">
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-sm">{t('pwa:update_prompt.title')}</h3>
          <p className="text-xs opacity-90">{defaultMessage}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={dismissUpdate}
            disabled={loading}
            className="bg-transparent border border-white px-3 py-1 rounded text-sm font-medium hover:bg-white hover:text-accent transition-colors disabled:opacity-50"
          >
            {t('pwa:update_prompt.later_button')}
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="bg-white text-accent px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? t('pwa:update_prompt.updating') : t('pwa:update_prompt.update_button')}
          </button>
        </div>
      </div>
      {loading && (
        <div className="mt-3">
          <div className="h-1 bg-white bg-opacity-30 rounded animate-pulse" data-testid="linear-progress" />
        </div>
      )}
      {error && (
        <div className="mt-3 bg-red-500 bg-opacity-20 border border-red-300 rounded p-2" data-testid="alert-error">
          <p className="text-sm font-medium">{t('pwa:update_prompt.update_failed')}</p>
        </div>
      )}
    </div>
  );
};