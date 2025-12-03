import React from 'react';
import {
  TextField,
  Box,
  Chip,
  Stack,
  Typography,
  Tooltip,
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const suggestions = ['book.create', 'book.update', 'user.*', 'audit.**', 'category.create'];

interface EventPatternInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  onBlur?: () => void;
}

export const EventPatternInput: React.FC<EventPatternInputProps> = ({
  value,
  onChange,
  label,
  helperText,
  error,
  errorText,
  onBlur,
}) => {
  const { t } = useTranslation('hooks');
  const effectiveHelper = error ? errorText : helperText;

  const wildcardLegend = [
    t('form.wildcard_legend.single', '* → matches one segment (book.*)'),
    t('form.wildcard_legend.multi', '** → matches any depth (book.**.after)'),
    t('form.wildcard_legend.replace', '? → replaces a single character'),
  ];

  return (
    <Box>
      <TextField
        label={label || t('form.fields.event_pattern', 'Event Pattern')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        fullWidth
        variant="outlined"
        helperText={effectiveHelper}
        error={error}
        InputProps={{
          sx: { fontFamily: 'Roboto Mono, monospace' },
        }}
      />
      <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
        {suggestions.map((suggestion) => (
          <Tooltip key={suggestion} title={t('form.chips_hint', 'Click to autofill the event pattern.')}>
            <Chip
              label={suggestion}
              onClick={() => onChange(suggestion)}
              size="small"
              color={value === suggestion ? 'primary' : 'default'}
              variant={value === suggestion ? 'filled' : 'outlined'}
              sx={{ textTransform: 'none' }}
            />
          </Tooltip>
        ))}
      </Stack>
      <Divider sx={{ my: 1.5 }} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {wildcardLegend.map((legend) => (
          <Typography key={legend} variant="caption" color="textSecondary">
            {legend}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
};

export default EventPatternInput;
