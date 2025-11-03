import React from 'react';
import { Select, MenuItem, SelectChangeEvent, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';
import { Language as LanguageIcon } from '@mui/icons-material';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('preferred-language', newLanguage);
  };

  if (import.meta.env.VITE_SHOW_LANGUAGE_SELECTOR !== 'true') {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
      <LanguageIcon sx={{ mr: 1, color: 'action.active' }} />
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        size="small"
        sx={{
          minWidth: 120,
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
