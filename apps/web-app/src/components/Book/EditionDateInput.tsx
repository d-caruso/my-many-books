import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
  Tooltip,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
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

function isValidSelectableYear(year: string): boolean {
  if (!/^\d{4}$/.test(year)) {
    return false;
  }

  const yearNumber = Number(year);
  return Number.isInteger(yearNumber) && yearNumber >= 1;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year: string, month: string): string[] {
  if (!month) {
    return [];
  }

  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return [];
  }

  let totalDays = 31;

  if ([4, 6, 9, 11].includes(monthNumber)) {
    totalDays = 30;
  } else if (monthNumber === 2) {
    const yearNumber = Number(year);
    totalDays =
      isValidSelectableYear(year) && isLeapYear(yearNumber) ? 29 : 28;
  }

  return Array.from({ length: totalDays }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );
}

export const EditionDateInput: React.FC<EditionDateInputProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
}) => {
  const { t } = useTranslation(['books']);
  const calendarInputRef = useRef<HTMLInputElement | null>(null);
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

      const isYearValid = isValidSelectableYear(newYear);
      if (!isYearValid) {
        newMonth = '';
        newDay = '';
      }

      // Clear day when month is removed
      if (!newMonth && newDay) {
        newDay = '';
      }

      if (isYearValid && newMonth && newDay) {
        const maxDay = getDaysInMonth(newYear, newMonth).length;
        if (maxDay === 0 || Number(newDay) > maxDay) {
          newDay = '';
        }
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

  const isYearReady = isValidSelectableYear(year);
  const availableDays = getDaysInMonth(year, month);
  const hasCompleteValidDate =
    isYearReady && !!month && !!day && availableDays.includes(day);
  const calendarValue = hasCompleteValidDate ? assemble(year, month, day) : '';

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;

    if (!nextValue) {
      handleChange('', '', '');
      return;
    }

    const [newYear, newMonth, newDay] = parseParts(nextValue);
    if (newYear && newMonth && newDay) {
      handleChange(newYear, newMonth, newDay);
    }
  };

  const handleCalendarButtonClick = () => {
    const input = calendarInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;

    if (!input || disabled) {
      return;
    }

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // Fall back to focus/click for browsers with restricted showPicker support.
    }

    input.focus();
    input.click();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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

        <FormControl
          sx={{ flex: 1 }}
          disabled={disabled || !isYearReady}
          error={error}
        >
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

        <FormControl
          sx={{ flex: 1 }}
          disabled={disabled || !isYearReady || !month}
          error={error}
        >
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
            {availableDays.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip title={t('books:edition_date')}>
          <Box sx={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
            <IconButton
              aria-label={`${t('books:edition_date')} calendar`}
              disabled={disabled}
              size="large"
              onClick={handleCalendarButtonClick}
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1,
                border: '1px solid',
                borderColor: error ? 'error.main' : 'divider',
                color: error ? 'error.main' : 'action.active',
              }}
            >
              <CalendarMonthIcon sx={{ fontSize: 30 }} />
            </IconButton>
            <Box
              component="input"
              ref={calendarInputRef}
              type="date"
              value={calendarValue}
              onChange={handleCalendarChange}
              disabled={disabled}
              aria-label={`${t('books:edition_date')} calendar`}
              data-testid="editionDate-calendar-input"
              sx={{
                position: 'absolute',
                width: 1,
                height: 1,
                top: 0,
                left: 0,
                opacity: 0,
                pointerEvents: 'none',
                border: 0,
                m: 0,
                p: 0,
              }}
            />
          </Box>
        </Tooltip>
      </Box>
      {helperText && (
        <FormHelperText error={error}>{helperText}</FormHelperText>
      )}
    </Box>
  );
};
