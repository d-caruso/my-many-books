import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditionDateInput } from '../../../components/Book/EditionDateInput';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'books:edition_date_year': 'Year',
        'books:edition_date_month': 'Month',
        'books:edition_date_day': 'Day',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('EditionDateInput', () => {
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

    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });

    expect(onChange).toHaveBeenCalledWith('2024');
  });

  it('should call onChange with empty string when year is cleared', () => {
    const onChange = vi.fn();
    render(<EditionDateInput value="2024" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });
});
