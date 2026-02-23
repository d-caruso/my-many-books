import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface EditionDateInputProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0')
);

const DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, '0')
);

function parseParts(value?: string): [string, string, string] {
  if (!value) return ['', '', ''];
  const parts = value.split('-');
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}

function assemble(year: string, month: string, day: string): string {
  if (!year) return '';
  if (!month) return year;
  if (!day) return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

export const EditionDateInput: React.FC<EditionDateInputProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
}) => {
  const { t } = useTranslation(['books']);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  useEffect(() => {
    const [y, m, d] = parseParts(value);
    setYear(y);
    setMonth(m);
    setDay(d);
  }, [value]);

  const handleChange = useCallback(
    (newYear: string, newMonth: string, newDay: string) => {
      // Clear month and day when year is removed
      if (!newYear) {
        setYear('');
        setMonth('');
        setDay('');
        onChange('');
        return;
      }

      // Clear day when month is removed
      if (!newMonth && newDay) {
        newDay = '';
      }

      setYear(newYear);
      setMonth(newMonth);
      setDay(newDay);
      onChange(assemble(newYear, newMonth, newDay));
    },
    [onChange]
  );

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    handleChange(raw, month, day);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          sx={{ flex: 1 }}
          id="editionDate-year"
          label={t('books:edition_date_year')}
          value={year}
          onChange={handleYearChange}
          placeholder="YYYY"
          disabled={disabled}
          error={error}
          inputProps={{ maxLength: 4, inputMode: 'numeric' }}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl sx={{ flex: 1 }} disabled={disabled || !year} error={error}>
          <InputLabel shrink id="editionDate-month-label">
            {t('books:edition_date_month')}
          </InputLabel>
          <Select
            labelId="editionDate-month-label"
            id="editionDate-month"
            value={month}
            label={t('books:edition_date_month')}
            displayEmpty
            notched
            onChange={(e) => handleChange(year, e.target.value as string, day)}
          >
            <MenuItem value="">—</MenuItem>
            {MONTHS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flex: 1 }} disabled={disabled || !month} error={error}>
          <InputLabel shrink id="editionDate-day-label">
            {t('books:edition_date_day')}
          </InputLabel>
          <Select
            labelId="editionDate-day-label"
            id="editionDate-day"
            value={day}
            label={t('books:edition_date_day')}
            displayEmpty
            notched
            onChange={(e) => handleChange(year, month, e.target.value as string)}
          >
            <MenuItem value="">—</MenuItem>
            {DAYS.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {helperText && (
        <FormHelperText error={error}>{helperText}</FormHelperText>
      )}
    </Box>
  );
};
