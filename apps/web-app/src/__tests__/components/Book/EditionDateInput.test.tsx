import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EditionDateInput } from '../../../components/Book/EditionDateInput';

const mockI18nState = vi.hoisted(() => ({
  language: 'en',
  resolvedLanguage: 'en',
}));

function createMockDayjs(isoDate: string) {
  const [year, month, day] = isoDate.split('-');

  return {
    isValid: () => true,
    format: (pattern: string) => {
      if (pattern === 'YYYY') return year ?? '';
      if (pattern === 'MM') return month ?? '';
      if (pattern === 'DD') return day ?? '';
      if (pattern === 'YYYY-MM-DD') return isoDate;
      return isoDate;
    },
  };
}

vi.mock('@mui/x-date-pickers', () => ({
  LocalizationProvider: ({
    adapterLocale,
    children,
  }: {
    adapterLocale?: string;
    children: React.ReactNode;
  }) => (
    <div
      data-testid="mock-localization-provider"
      data-adapter-locale={adapterLocale ?? ''}
    >
      {children}
    </div>
  ),
  DateCalendar: ({
    value,
    onChange,
    onViewChange,
  }: {
    value?: { format?: (pattern: string) => string } | null;
    onChange?: (
      date: ReturnType<typeof createMockDayjs>,
      selectionState?: 'partial' | 'shallow' | 'finish',
      selectedView?: 'year' | 'month' | 'day'
    ) => void;
    onViewChange?: (view: 'year' | 'month' | 'day') => void;
  }) => (
    <div
      data-testid="editionDate-calendar"
      data-current-value={value?.format?.('YYYY-MM-DD') ?? ''}
    >
      <button
        type="button"
        onClick={() => {
          onViewChange?.('year');
          onChange?.(createMockDayjs('2024-01-01'), 'partial', 'year');
        }}
      >
        Pick Year 2024
      </button>
      <button
        type="button"
        onClick={() => {
          onViewChange?.('day');
          onChange?.(createMockDayjs('2024-02-29'), 'finish', 'day');
        }}
      >
        Pick 2024-02-29
      </button>
    </div>
  ),
}));

vi.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
  AdapterDayjs: class MockAdapterDayjs {},
}));

vi.mock('@mui/x-date-pickers/locales', () => ({
  enUS: {
    components: {
      MuiLocalizationProvider: { defaultProps: { localeText: {} } },
    },
  },
  itIT: {
    components: {
      MuiLocalizationProvider: { defaultProps: { localeText: {} } },
    },
  },
}));

vi.mock('dayjs', () => ({
  __esModule: true,
  default: (value?: string) => createMockDayjs(value || '2000-01-01'),
}));

vi.mock('dayjs/locale/it', () => ({}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'books:edition_date': 'Edition date',
        'books:edition_date_year': 'Year',
        'books:edition_date_month': 'Month',
        'books:edition_date_day': 'Day',
      };
      return map[key] ?? key;
    },
    i18n: mockI18nState,
  }),
}));

describe('EditionDateInput', () => {
  const getYearInput = () => screen.getByLabelText('Year');
  const getMonthSelect = () => screen.getByLabelText('Month');
  const getDaySelect = () => screen.getByLabelText('Day');
  const getCalendarButton = () =>
    screen.getByRole('button', { name: 'Edition date calendar' });
  const getYearStepUpButton = () => screen.getByTestId('editionDate-year-step-up');
  const getYearStepDownButton = () => screen.getByTestId('editionDate-year-step-down');

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const normalizeSelectText = (element: HTMLElement) =>
    element.textContent?.replace(/\u200b/g, '').trim() ?? '';

  const openSelectListbox = async (labelText: string) => {
    fireEvent.mouseDown(screen.getByLabelText(labelText));
    return await screen.findByRole('listbox', {
      name: new RegExp(`^${escapeRegExp(labelText)}$`, 'i'),
    });
  };

  const selectOption = async (labelText: string, optionText: string) => {
    const listbox = await openSelectListbox(labelText);
    fireEvent.click(
      within(listbox).getByRole('option', {
        name: new RegExp(`^${escapeRegExp(optionText)}$`, 'i'),
      })
    );
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  };

  beforeEach(() => {
    mockI18nState.language = 'en';
    mockI18nState.resolvedLanguage = 'en';
  });

  it('should render three input fields', () => {
    render(<EditionDateInput value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Month')).toBeInTheDocument();
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
  });

  it('should parse a full date value into year/month/day', () => {
    render(<EditionDateInput value="2024-03-15" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Year')).toHaveValue('2024');
  });

  it('should parse a year-only value', () => {
    render(<EditionDateInput value="2024" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Year')).toHaveValue('2024');
  });

  it('should call onChange with year only when only year is filled', () => {
    const onChange = vi.fn();
    render(<EditionDateInput value="" onChange={onChange} />);

    fireEvent.change(getYearInput(), { target: { value: '2024' } });

    expect(onChange).toHaveBeenCalledWith('2024');
  });

  it('should call onChange with empty string when year is cleared', () => {
    const onChange = vi.fn();
    render(<EditionDateInput value="2024" onChange={onChange} />);

    fireEvent.change(getYearInput(), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should keep month disabled until year is a valid non-zero YYYY', () => {
    render(<EditionDateInput value="" onChange={vi.fn()} />);

    expect(getMonthSelect()).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(getYearInput(), { target: { value: '2' } });
    expect(getMonthSelect()).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(getYearInput(), { target: { value: '202' } });
    expect(getMonthSelect()).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(getYearInput(), { target: { value: '0000' } });
    expect(getMonthSelect()).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(getYearInput(), { target: { value: '2024' } });
    expect(getMonthSelect()).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('should cap typed year to the current year', () => {
    const onChange = vi.fn();
    const currentYear = new Date().getFullYear();
    render(<EditionDateInput value="" onChange={onChange} />);

    fireEvent.change(getYearInput(), {
      target: { value: String(currentYear + 1) },
    });

    expect(getYearInput()).toHaveValue(String(currentYear));
    expect(onChange).toHaveBeenLastCalledWith(String(currentYear));
  });

  it('should use ArrowUp and ArrowDown to step the year and reset invalid values to current year', () => {
    const onChange = vi.fn();
    const currentYear = new Date().getFullYear();
    render(<EditionDateInput value="" onChange={onChange} />);

    fireEvent.keyDown(getYearInput(), { key: 'ArrowUp' });
    expect(getYearInput()).toHaveValue(String(currentYear));

    fireEvent.change(getYearInput(), { target: { value: '200' } });
    fireEvent.keyDown(getYearInput(), { key: 'ArrowDown' });
    expect(getYearInput()).toHaveValue(String(currentYear));

    fireEvent.change(getYearInput(), { target: { value: '2024' } });
    fireEvent.keyDown(getYearInput(), { key: 'ArrowDown' });
    expect(getYearInput()).toHaveValue('2023');

    fireEvent.change(getYearInput(), { target: { value: String(currentYear) } });
    fireEvent.keyDown(getYearInput(), { key: 'ArrowUp' });
    expect(getYearInput()).toHaveValue(String(currentYear));
    expect(onChange).toHaveBeenLastCalledWith(String(currentYear));
  });

  it('should render visible year step arrows and update the year on click', () => {
    const currentYear = new Date().getFullYear();
    render(<EditionDateInput value="" onChange={vi.fn()} />);

    expect(getYearStepUpButton()).toBeInTheDocument();
    expect(getYearStepDownButton()).toBeInTheDocument();

    fireEvent.click(getYearStepUpButton());
    expect(getYearInput()).toHaveValue(String(currentYear));

    fireEvent.change(getYearInput(), { target: { value: '2024' } });
    fireEvent.click(getYearStepDownButton());
    expect(getYearInput()).toHaveValue('2023');
  });

  it.each([
    ['2024', '01', 31],
    ['2024', '04', 30],
    ['2023', '02', 28],
    ['2024', '02', 29],
  ])(
    'should show %s-%s with %i days',
    async (yearValue, monthValue, expectedDays) => {
      render(<EditionDateInput value="" onChange={vi.fn()} />);

      fireEvent.change(getYearInput(), { target: { value: yearValue } });
      await selectOption('Month', monthValue);

      const listbox = await openSelectListbox('Day');
      expect(within(listbox).getAllByRole('option')).toHaveLength(expectedDays + 1);

      fireEvent.click(within(listbox).getAllByRole('option')[0]);
      await waitFor(() =>
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      );
    }
  );

  it('should clear invalid selected day when month changes to a shorter month', async () => {
    const onChange = vi.fn();
    render(<EditionDateInput value="" onChange={onChange} />);

    fireEvent.change(getYearInput(), { target: { value: '2024' } });
    await selectOption('Month', '03');
    await selectOption('Day', '31');

    expect(onChange).toHaveBeenLastCalledWith('2024-03-31');

    await selectOption('Month', '04');

    expect(normalizeSelectText(getDaySelect())).toBe('—');
    expect(onChange).toHaveBeenLastCalledWith('2024-04');
  });

  it('should clear month and day when year becomes incomplete or invalid', async () => {
    const onChange = vi.fn();
    render(<EditionDateInput value="" onChange={onChange} />);

    fireEvent.change(getYearInput(), { target: { value: '2024' } });
    await selectOption('Month', '02');
    await selectOption('Day', '29');

    fireEvent.change(getYearInput(), { target: { value: '202' } });

    expect(getMonthSelect()).toHaveAttribute('aria-disabled', 'true');
    expect(getDaySelect()).toHaveAttribute('aria-disabled', 'true');
    expect(normalizeSelectText(getMonthSelect())).toBe('—');
    expect(normalizeSelectText(getDaySelect())).toBe('—');
    expect(onChange).toHaveBeenLastCalledWith('202');

    fireEvent.change(getYearInput(), { target: { value: '0000' } });
    expect(getMonthSelect()).toHaveAttribute('aria-disabled', 'true');
    expect(onChange).toHaveBeenLastCalledWith('0000');
  });

  it('should sync fields when selecting a date from the MUI calendar selector', async () => {
    const onChange = vi.fn();
    render(<EditionDateInput value="" onChange={onChange} />);

    fireEvent.click(getCalendarButton());
    expect(screen.getByTestId('editionDate-calendar-popover')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Pick 2024-02-29'));

    expect(getYearInput()).toHaveValue('2024');
    expect(normalizeSelectText(getMonthSelect())).toBe('02');
    expect(normalizeSelectText(getDaySelect())).toBe('29');
    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');

    await waitFor(() =>
      expect(screen.queryByTestId('editionDate-calendar-popover')).not.toBeInTheDocument()
    );
  });

  it('should keep the calendar open when selecting only a year in the calendar widget', () => {
    render(<EditionDateInput value="" onChange={vi.fn()} />);

    fireEvent.click(getCalendarButton());
    expect(screen.getByTestId('editionDate-calendar-popover')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Pick Year 2024'));

    expect(screen.getByTestId('editionDate-calendar-popover')).toBeInTheDocument();
    expect(getYearInput()).toHaveValue('2024');
  });

  it('should clear the calendar selected value when the date becomes partial', async () => {
    render(<EditionDateInput value="" onChange={vi.fn()} />);
    const calendarButton = getCalendarButton();

    fireEvent.click(calendarButton);
    fireEvent.click(screen.getByText('Pick 2024-02-29'));

    fireEvent.click(calendarButton);
    expect(screen.getByTestId('editionDate-calendar')).toHaveAttribute(
      'data-current-value',
      '2024-02-29'
    );

    fireEvent.change(getYearInput(), { target: { value: '202' } });

    expect(getMonthSelect()).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(calendarButton);
    expect(screen.getByTestId('editionDate-calendar')).toHaveAttribute(
      'data-current-value',
      ''
    );
  });

  it('should open the MUI calendar popover when the calendar button is clicked', () => {
    render(<EditionDateInput value="" onChange={vi.fn()} />);

    fireEvent.click(getCalendarButton());

    expect(screen.getByTestId('editionDate-calendar-popover')).toBeInTheDocument();
    expect(screen.getByTestId('editionDate-calendar')).toBeInTheDocument();
  });

  it('should update the calendar locale when language changes', () => {
    const { rerender } = render(<EditionDateInput value="" onChange={vi.fn()} />);

    fireEvent.click(getCalendarButton());
    expect(screen.getByTestId('mock-localization-provider')).toHaveAttribute(
      'data-adapter-locale',
      'en'
    );

    mockI18nState.language = 'it';
    mockI18nState.resolvedLanguage = 'it';
    rerender(<EditionDateInput value="" onChange={vi.fn()} />);

    expect(screen.getByTestId('mock-localization-provider')).toHaveAttribute(
      'data-adapter-locale',
      'it'
    );
  });
});
