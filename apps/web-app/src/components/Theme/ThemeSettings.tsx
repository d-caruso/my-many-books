import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeSelector } from './ThemeSelector';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface ThemeSettingsProps {
  className?: string;
  showSystemOption?: boolean;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({
  className = '',
  showSystemOption = true
}) => {
  const { t } = useTranslation();
  const { autoTheme, setAutoTheme, systemTheme } = useTheme();

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{t('theme:settings.title')}</h3>
        <p className="text-text-muted text-sm">
          {t('theme:settings.description')}
        </p>
      </div>

      {showSystemOption && (
        <div className="space-y-3">
          <h4 className="text-base font-medium text-text-primary">{t('theme:settings.theme_mode')}</h4>
          <div className="flex items-center justify-between p-4 bg-surface border border-secondary-200 rounded-lg">
            <div className="space-y-1">
              <div className="font-medium text-text-primary">{t('theme:settings.auto_system')}</div>
              <div className="text-sm text-text-muted">
                {t('theme:settings.auto_description')}
                {autoTheme && (
                  <span className="block mt-1 text-primary-600 font-medium">
                    {systemTheme === 'dark' ? t('theme:settings.currently_using_dark') : t('theme:settings.currently_using_light')}
                  </span>
                )}
              </div>
            </div>
            <ResponsiveButton
              variant={autoTheme ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAutoTheme(!autoTheme)}
            >
              {autoTheme ? t('theme:settings.enabled') : t('theme:settings.enable')}
            </ResponsiveButton>
          </div>
        </div>
      )}

      {!autoTheme && (
        <div className="space-y-3">
          <h4 className="text-base font-medium text-text-primary">{t('theme:settings.choose_theme')}</h4>
          <ThemeSelector variant="list" showLabels={true} />
        </div>
      )}

      {autoTheme && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-primary-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-primary-800">{t('theme:settings.auto_enabled')}</p>
              <p className="text-xs text-primary-600 mt-1">
                {t('theme:settings.auto_enabled_description')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};