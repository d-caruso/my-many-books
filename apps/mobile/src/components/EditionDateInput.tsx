import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import {
  EDITION_DATE_MONTHS,
  assembleEditionDate,
  getCurrentEditionYear,
  getEditionDateDaysInMonth,
  isValidEditionDateYear,
  parseEditionDateParts,
  sanitizeEditionYearInput,
} from '@my-many-books/shared-forms';

interface EditionDateInputProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

type PickerKind = 'month' | 'day' | null;

const MONTHS = EDITION_DATE_MONTHS;

function dateToParts(date: Date): [string, string, string] {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ];
}

function buildSeedDate(year: string, month: string, day: string): Date {
  if (!isValidEditionDateYear(year)) {
    return new Date();
  }

  const y = Number(year);
  const m = month ? Number(month) - 1 : 0;
  const d = day ? Number(day) : 1;
  const seed = new Date(y, Math.max(0, m), Math.max(1, d));

  if (Number.isNaN(seed.getTime())) {
    return new Date();
  }

  return seed;
}

export const EditionDateInput: React.FC<EditionDateInputProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
}) => {
  const { t } = useTranslation(['books', 'common']);
  const currentEditionYear = getCurrentEditionYear();
  const maxCalendarDate = new Date(currentEditionYear, 11, 31);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [openPicker, setOpenPicker] = useState<PickerKind>(null);
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [iosPickerDate, setIosPickerDate] = useState(new Date());

  useEffect(() => {
    const [y, m, d] = parseEditionDateParts(value);
    setYear(y);
    setMonth(m);
    setDay(d);
  }, [value]);

  const handleChange = (newYear: string, newMonth: string, newDay: string) => {
    if (!newYear) {
      setYear('');
      setMonth('');
      setDay('');
      setOpenPicker(null);
      onChange('');
      return;
    }

    const isYearValid = isValidEditionDateYear(newYear);
    if (!isYearValid) {
      newMonth = '';
      newDay = '';
      setOpenPicker(null);
    }

    if (!newMonth) {
      newDay = '';
      if (openPicker === 'day') {
        setOpenPicker(null);
      }
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
  };

  const handleYearChange = (rawValue: string) => {
    const raw = sanitizeEditionYearInput(rawValue);
    handleChange(raw, month, day);
  };

  const isYearReady = isValidEditionDateYear(year);
  const availableDays = useMemo(
    () => getEditionDateDaysInMonth(year, month),
    [year, month]
  );
  const hasCompleteValidDate = isYearReady && !!month && !!day && availableDays.includes(day);
  const canOpenMonthPicker = !disabled && isYearReady;
  const canOpenDayPicker = !disabled && isYearReady && !!month;

  const openCalendar = () => {
    if (disabled) return;

    const seedDate = buildSeedDate(year, month, day);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: seedDate,
        maximumDate: maxCalendarDate,
        onChange: (event, selectedDate) => {
          if (event.type !== 'set' || !selectedDate) return;
          const [newYear, newMonth, newDay] = dateToParts(selectedDate);
          handleChange(newYear, newMonth, newDay);
        },
      });
      return;
    }

    setIosPickerDate(seedDate);
    setShowInlineCalendar((prev) => !prev);
    setOpenPicker(null);
  };

  const handleInlineCalendarChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) return;
    if (event.type === 'dismissed') return;
    setIosPickerDate(selectedDate);
    const [newYear, newMonth, newDay] = dateToParts(selectedDate);
    handleChange(newYear, newMonth, newDay);
  };

  const renderPickerOptions = (kind: Exclude<PickerKind, null>, options: string[]) => (
    <View
      style={styles.optionsContainer}
      testID={`editionDate-${kind}-options`}
      accessibilityLabel={`${t(`books:edition_date_${kind}`)} options`}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            testID={`editionDate-option-${kind}-empty`}
            onPress={() => {
              if (kind === 'month') {
                handleChange(year, '', '');
              } else {
                handleChange(year, month, '');
              }
              setOpenPicker(null);
            }}
            style={[styles.optionChip, styles.optionChipClear]}
          >
            <Text>—</Text>
          </TouchableOpacity>
          {options.map((option) => (
            <TouchableOpacity
              key={`${kind}-${option}`}
              testID={`editionDate-option-${kind}-${option}`}
              onPress={() => {
                if (kind === 'month') {
                  handleChange(year, option, day);
                } else {
                  handleChange(year, month, option);
                }
                setOpenPicker(null);
              }}
              style={styles.optionChip}
            >
              <Text>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{t('books:edition_date')}</Text>
      <View style={styles.row}>
        <View style={styles.yearField}>
          <Text style={styles.fieldLabel}>{t('books:edition_date_year')}</Text>
          <TextInput
            mode="outlined"
            value={year}
            onChangeText={handleYearChange}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="YYYY"
            disabled={disabled}
            testID="editionDate-year-input"
            accessibilityLabel={t('books:edition_date_year')}
          />
        </View>

        <View style={styles.smallField}>
          <Text style={styles.fieldLabel}>{t('books:edition_date_month')}</Text>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              (!canOpenMonthPicker || error) && styles.selectorButtonMuted,
            ]}
            onPress={() => canOpenMonthPicker && setOpenPicker(openPicker === 'month' ? null : 'month')}
            disabled={!canOpenMonthPicker}
            testID="editionDate-month-button"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canOpenMonthPicker }}
            accessibilityLabel={t('books:edition_date_month')}
          >
            <Text>{month || '—'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.smallField}>
          <Text style={styles.fieldLabel}>{t('books:edition_date_day')}</Text>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              (!canOpenDayPicker || error) && styles.selectorButtonMuted,
            ]}
            onPress={() => canOpenDayPicker && setOpenPicker(openPicker === 'day' ? null : 'day')}
            disabled={!canOpenDayPicker}
            testID="editionDate-day-button"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canOpenDayPicker }}
            accessibilityLabel={t('books:edition_date_day')}
          >
            <Text>{day || '—'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarField}>
          <Text style={styles.fieldLabel}> </Text>
          <IconButton
            icon="calendar-month"
            size={30}
            mode="outlined"
            onPress={openCalendar}
            disabled={disabled}
            style={[styles.calendarButton, error && styles.calendarButtonError]}
            accessibilityLabel={`${t('books:edition_date')} calendar`}
            testID="editionDate-calendar-button"
          />
        </View>
      </View>

      {openPicker === 'month' && renderPickerOptions('month', MONTHS)}
      {openPicker === 'day' && renderPickerOptions('day', availableDays)}

      {Platform.OS !== 'android' && showInlineCalendar && (
        <View style={styles.inlineCalendarContainer} testID="editionDate-inline-calendar">
          <DateTimePicker
            mode="date"
            display="spinner"
            value={hasCompleteValidDate ? buildSeedDate(year, month, day) : iosPickerDate}
            maximumDate={maxCalendarDate}
            onChange={handleInlineCalendarChange}
          />
          <Button mode="text" onPress={() => setShowInlineCalendar(false)}>
            {t('common:close', { defaultValue: 'Close' })}
          </Button>
        </View>
      )}

      {!!helperText && (
        <Text style={[styles.helperText, error && styles.helperTextError]}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yearField: {
    flex: 1.4,
    marginRight: 8,
  },
  smallField: {
    flex: 1,
    marginRight: 8,
  },
  calendarField: {
    width: 64,
    alignItems: 'center',
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 12,
    color: '#5f6368',
    minHeight: 16,
  },
  selectorButton: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#c4c7c5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
  },
  selectorButtonMuted: {
    opacity: 0.6,
  },
  calendarButton: {
    margin: 0,
    borderWidth: 1,
    borderColor: '#c4c7c5',
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  calendarButtonError: {
    borderColor: '#b3261e',
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#c4c7c5',
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  optionChipClear: {
    minWidth: 36,
    alignItems: 'center',
  },
  inlineCalendarContainer: {
    marginTop: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#5f6368',
  },
  helperTextError: {
    color: '#b3261e',
  },
});

export default EditionDateInput;
