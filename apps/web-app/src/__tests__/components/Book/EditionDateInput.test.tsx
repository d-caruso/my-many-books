import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { EditionDateInput } from '../../../components/Book/EditionDateInput';

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
  }),
}));

describe('EditionDateInput', () => {
  const getYearInput = () => screen.getByLabelText('Year');
  const getMonthSelect = () => screen.getByLabelText('Month');
  const getDaySelect = () => screen.getByLabelText('Day');
  const getCalendarInput = () =>
    screen.getByTestId('editionDate-calendar-input') as HTMLInputElement;
  const getCalendarButton = () =>
    screen.getByRole('button', { name: 'Edition date calendar' });

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

  it('should sync fields when selecting a date from the side calendar selector', () => {
    const onChange = vi.fn();
    render(<EditionDateInput value="" onChange={onChange} />);

    fireEvent.change(getCalendarInput(), { target: { value: '2024-02-29' } });

    expect(getYearInput()).toHaveValue('2024');
    expect(normalizeSelectText(getMonthSelect())).toBe('02');
    expect(normalizeSelectText(getDaySelect())).toBe('29');
    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');
    expect(getCalendarInput()).toHaveValue('2024-02-29');
  });

  it('should clear the side calendar value when the date becomes partial', async () => {
    render(<EditionDateInput value="" onChange={vi.fn()} />);

    fireEvent.change(getYearInput(), { target: { value: '2024' } });
    await selectOption('Month', '02');
    await selectOption('Day', '29');

    expect(getCalendarInput()).toHaveValue('2024-02-29');

    fireEvent.change(getYearInput(), { target: { value: '202' } });

    expect(getCalendarInput()).toHaveValue('');
  });

  it('should open the calendar picker when the calendar button is clicked', () => {
    render(<EditionDateInput value="" onChange={vi.fn()} />);

    const showPicker = vi.fn();
    (getCalendarInput() as HTMLInputElement & { showPicker?: () => void }).showPicker = showPicker;

    fireEvent.click(getCalendarButton());

    expect(showPicker).toHaveBeenCalledTimes(1);
  });
});
