import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  FormHelperText,
  InputAdornment,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  TextField,
  Tooltip,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { enUS, itIT } from '@mui/x-date-pickers/locales';
import type { DateView } from '@mui/x-date-pickers/models';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useTranslation } from 'react-i18next';
import {
  EDITION_DATE_MONTHS,
  assembleEditionDate,
  getCurrentEditionYear,
  getEditionDateDaysInMonth,
  isValidEditionDateYear,
  parseEditionDateParts,
  sanitizeEditionYearInput,
  stepEditionYear,
} from '@my-many-books/shared-forms';

interface EditionDateInputProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

type PickerLocale = 'en' | 'it';
type CalendarSelectionState = 'partial' | 'shallow' | 'finish';

function getPickerLocale(language: string): PickerLocale {
  return language.toLowerCase().startsWith('it') ? 'it' : 'en';
}

function getPickerLocaleText(locale: PickerLocale) {
  return locale === 'it'
    ? itIT.components.MuiLocalizationProvider.defaultProps.localeText
    : enUS.components.MuiLocalizationProvider.defaultProps.localeText;
}

function buildCalendarReferenceDate(
  year: string,
  month: string,
  day: string
): Dayjs {
  if (!isValidEditionDateYear(year)) {
    return dayjs();
  }

  const normalizedMonth = EDITION_DATE_MONTHS.includes(month) ? month : '01';
  const availableDays = getEditionDateDaysInMonth(year, normalizedMonth);
  const normalizedDay = availableDays.includes(day) ? day : '01';

  return dayjs(`${year}-${normalizedMonth}-${normalizedDay}`);
}

export const EditionDateInput: React.FC<EditionDateInputProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
}) => {
  const { t, i18n } = useTranslation(['books']);
  const currentEditionYear = getCurrentEditionYear();
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(
    null
  );
  const [calendarView, setCalendarView] = useState<DateView>('day');

  useEffect(() => {
    const [y, m, d] = parseEditionDateParts(value);
    setYear(y);
    setMonth(m);
    setDay(d);
  }, [value]);

  const handleChange = useCallback(
    (newYear: string, newMonth: string, newDay: string) => {
      if (!newYear) {
        setYear('');
        setMonth('');
        setDay('');
        onChange('');
        return;
      }

      const isYearValid = isValidEditionDateYear(newYear);
      if (!isYearValid) {
        newMonth = '';
        newDay = '';
      }

      if (!newMonth && newDay) {
        newDay = '';
      }

      if (isYearValid && newMonth && newDay) {
        const maxDay = getEditionDateDaysInMonth(newYear, newMonth).length;
        if (maxDay === 0 || Number(newDay) > maxDay) {
          newDay = '';
        }
      }

      setYear(newYear);
      setMonth(newMonth);
      setDay(newDay);
      onChange(assembleEditionDate(newYear, newMonth, newDay));
    },
    [onChange]
  );

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = sanitizeEditionYearInput(e.target.value);
    handleChange(raw, month, day);
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
      return;
    }

    e.preventDefault();
    const direction = e.key === 'ArrowUp' ? 'up' : 'down';
    const nextYear = stepEditionYear(year, direction);
    handleChange(nextYear, month, day);
  };

  const handleYearStepClick = (direction: 'up' | 'down') => {
    const nextYear = stepEditionYear(year, direction);
    handleChange(nextYear, month, day);
  };

  const isYearReady = isValidEditionDateYear(year);
  const availableDays = getEditionDateDaysInMonth(year, month);
  const hasCompleteValidDate =
    isYearReady && !!month && !!day && availableDays.includes(day);

  const calendarLocale = getPickerLocale(
    i18n.resolvedLanguage || i18n.language || 'en'
  );
  const calendarLocaleText = getPickerLocaleText(calendarLocale);

  const calendarValue = useMemo(() => {
    if (!hasCompleteValidDate) {
      return null;
    }

    return dayjs(`${year}-${month}-${day}`);
  }, [day, hasCompleteValidDate, month, year]);

  const calendarReferenceDate = useMemo(
    () => buildCalendarReferenceDate(year, month, day),
    [day, month, year]
  );

  const handleCalendarButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (disabled) {
      return;
    }

    setCalendarView('day');
    setCalendarAnchorEl((current) =>
      current ? null : (event.currentTarget as HTMLElement)
    );
  };

  const handleCalendarClose = () => {
    setCalendarAnchorEl(null);
  };

  const handleCalendarChange = (
    nextDate: Dayjs | null,
    selectionState?: CalendarSelectionState,
    selectedView?: DateView
  ) => {
    if (!nextDate || !nextDate.isValid()) {
      return;
    }

    handleChange(
      nextDate.format('YYYY'),
      nextDate.format('MM'),
      nextDate.format('DD')
    );

    const effectiveSelectedView = selectedView ?? calendarView;
    const shouldCloseCalendar =
      selectionState === 'finish' && effectiveSelectedView === 'day';

    if (shouldCloseCalendar) {
      setCalendarAnchorEl(null);
    }
  };

  const isCalendarOpen = Boolean(calendarAnchorEl);

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr 40px', sm: '1fr 1fr 1fr auto' },
          gridTemplateAreas: {
            xs: '"year year cal" "month day ."',
            sm: '"year month day cal"',
          },
          gap: 1,
          alignItems: 'center',
          pt: { xs: 1, sm: 0 },
        }}
      >
        <TextField
          sx={{ gridArea: 'year' }}
          id="editionDate-year"
          label={t('books:edition_date_year')}
          value={year}
          onChange={handleYearChange}
          onKeyDown={handleYearKeyDown}
          placeholder="YYYY"
          disabled={disabled}
          error={error}
          inputProps={{ maxLength: 4, inputMode: 'numeric' }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ mr: -0.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <IconButton
                    size="small"
                    disabled={disabled}
                    onClick={() => handleYearStepClick('up')}
                    aria-label={`${t('books:edition_date_year')} up`}
                    data-testid="editionDate-year-step-up"
                    sx={{ width: 22, height: 18, borderRadius: 0.75 }}
                  >
                    <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={disabled}
                    onClick={() => handleYearStepClick('down')}
                    aria-label={`${t('books:edition_date_year')} down`}
                    data-testid="editionDate-year-step-down"
                    sx={{ width: 22, height: 18, borderRadius: 0.75 }}
                  >
                    <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </InputAdornment>
            ),
          }}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl
          sx={{ gridArea: 'month' }}
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
            {EDITION_DATE_MONTHS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          sx={{ gridArea: 'day' }}
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
          <Box sx={{ gridArea: 'cal', display: 'flex', justifyContent: 'center' }}>
            <IconButton
              aria-label={`${t('books:edition_date')} calendar`}
              disabled={disabled}
              size="small"
              onClick={handleCalendarButtonClick}
              sx={{
                width: { xs: 40, sm: 56 },
                height: { xs: 40, sm: 56 },
                borderRadius: 1,
                border: '1px solid',
                borderColor: error ? 'error.main' : 'divider',
                color: error ? 'error.main' : 'action.active',
              }}
            >
              <CalendarMonthIcon sx={{ fontSize: { xs: 22, sm: 30 } }} />
            </IconButton>
          </Box>
        </Tooltip>
      </Box>

      <Popover
          open={isCalendarOpen}
          anchorEl={calendarAnchorEl}
          onClose={handleCalendarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          disablePortal
          PaperProps={{
            'data-testid': 'editionDate-calendar-popover',
            sx: { mt: 1, p: 1 },
          }}
        >
          <LocalizationProvider
            key={calendarLocale}
            dateAdapter={AdapterDayjs}
            adapterLocale={calendarLocale}
            localeText={calendarLocaleText}
          >
            <DateCalendar
              value={calendarValue}
              referenceDate={calendarReferenceDate}
              maxDate={dayjs(`${currentEditionYear}-12-31`)}
              onChange={handleCalendarChange}
              onViewChange={setCalendarView}
              disabled={disabled}
              reduceAnimations
              sx={{
                '& .MuiDayCalendar-slideTransition': {
                  minHeight: 0,
                },
                '& .MuiDayCalendar-loadingContainer': {
                  minHeight: 0,
                },
              }}
            />
          </LocalizationProvider>
        </Popover>

      {helperText && <FormHelperText error={error}>{helperText}</FormHelperText>}
    </Box>
  );
};
