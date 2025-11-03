import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Menu, Button, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Props for the LanguageSelector component
 */
interface LanguageSelectorProps {
  /**
   * Current language code (e.g., 'en', 'it')
   */
  value: string;

  /**
   * Callback when language is changed
   * Should return a Promise that resolves when the language change is complete
   */
  onLanguageChange: (languageCode: string) => Promise<void>;

  /**
   * Display mode:
   * - false (default): Shows full native name (e.g., "English")
   * - true: Shows compact code (e.g., "EN")
   */
  compact?: boolean;

  /**
   * Disable the selector
   */
  disabled?: boolean;
}

/**
 * Language selector component with dropdown menu
 *
 * Displays a button with the current language that opens a menu
 * with all available languages. Supports loading states and
 * can be displayed in compact or full mode.
 *
 * @example
 * ```tsx
 * <LanguageSelector
 *   value={i18n.language}
 *   onLanguageChange={async (lang) => {
 *     await changeLanguage(lang);
 *     showSuccessMessage();
 *   }}
 *   compact={false}
 * />
 * ```
 */
const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onLanguageChange,
  compact = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === value || isLoading) {
      closeMenu();
      return;
    }

    setIsLoading(true);
    closeMenu();

    try {
      await onLanguageChange(languageCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.code === value);
  const buttonLabel = compact
    ? currentLanguage?.code.toUpperCase() || value.toUpperCase()
  if (process.env.EXPO_PUBLIC_SHOW_LANGUAGE_SELECTOR !== 'true') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <Button
            mode="outlined"
            onPress={openMenu}
            disabled={disabled || isLoading}
            icon="translate"
            contentStyle={styles.buttonContent}
            style={styles.button}
            accessibilityLabel={t('settings.selectLanguage')}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || isLoading }}
            testID="language-selector-button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              buttonLabel
            )}
          </Button>
        }
        anchorPosition="bottom"
        contentStyle={styles.menuContent}
      >
        {SUPPORTED_LANGUAGES.map((language) => {
          const isSelected = language.code === value;
          return (
            <Menu.Item
              key={language.code}
              onPress={() => handleLanguageSelect(language.code)}
              title={language.nativeName}
              leadingIcon="translate"
              trailingIcon={isSelected ? 'check' : undefined}
              disabled={isLoading}
              accessibilityLabel={`${language.nativeName} - ${language.name}`}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: isSelected }}
              testID={`language-option-${language.code}`}
              style={isSelected ? { backgroundColor: theme.colors.surfaceVariant } : undefined}
            />
          );
        })}
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  button: {
    minWidth: 120,
  },
  buttonContent: {
    flexDirection: 'row-reverse',
  },
  menuContent: {
    marginTop: 8,
  },
});

export default LanguageSelector;
