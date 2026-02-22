import React, { useEffect, useRef } from 'react';
import { Select, MenuItem, SelectChangeEvent, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';
import LanguageIcon from '@mui/icons-material/Language';
import { useLocalStorage } from '@my-many-books/shared-ui-hooks';

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [preferredLanguage, setPreferredLanguage] = useLocalStorage<string>(
    'preferred-language',
    i18n.language,
    {
      serialize: value => value,
      deserialize: value => value,
    }
  );

  const isUserChange = useRef(false);

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    isUserChange.current = true;
    setPreferredLanguage(newLanguage);
    document.dispatchEvent(new CustomEvent('languageChanging'));
    setTimeout(() => {
      void i18n.changeLanguage(newLanguage);
      isUserChange.current = false;
    }, 500);
  };

  useEffect(() => {
    if (isUserChange.current) return;
    if (preferredLanguage && preferredLanguage !== i18n.language) {
      void i18n.changeLanguage(preferredLanguage);
    }
  }, [preferredLanguage, i18n]);

  if (import.meta.env.VITE_SHOW_LANGUAGE_SELECTOR !== 'true') {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: { xs: 0.5, sm: 2 }, minWidth: 0 }}>
      <LanguageIcon sx={{ mr: { xs: 0.5, sm: 1 }, color: 'action.active', fontSize: { xs: 20, sm: 24 } }} />
      <Select
        value={preferredLanguage}
        onChange={handleLanguageChange}
        size="small"
        inputProps={{
          'aria-label': t('common:select_language', 'Select language')
        }}
        sx={{
          minWidth: { xs: 88, sm: 120 },
          '& .MuiSelect-select': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pr: { xs: 2.5, sm: 4 },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            {lang.nativeName}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};
