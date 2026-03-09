import { fireEvent, render } from '@testing-library/react';
import { TextInput } from '../TextInput/TextInput';

describe('TextInput', () => {
  test('renders label and input', () => {
    const { getByText, getByLabelText } = render(
      <TextInput label="Email" value="" onChangeText={() => {}} />
    );

    expect(getByText('Email')).toBeInTheDocument();
    expect(getByLabelText('Email')).toBeInTheDocument();
  });

  test('calls onChangeText on input change', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <TextInput label="Name" value="a" onChangeText={onChangeText} />
    );

    fireEvent.change(getByLabelText('Name'), { target: { value: 'b' } });
    expect(onChangeText).toHaveBeenCalledWith('b');
  });

  test('shows error message when error is provided', () => {
    const { getByText } = render(
      <TextInput label="Name" value="" onChangeText={() => {}} error="Required" />
    );
    expect(getByText('Required')).toBeInTheDocument();
  });

  test('supports keyboardType mapping for web inputs', () => {
    const { getByLabelText, rerender } = render(
      <TextInput label="Email" value="" onChangeText={() => {}} keyboardType="email-address" />
    );
    expect((getByLabelText('Email') as HTMLInputElement).type).toBe('email');

    rerender(<TextInput label="Phone" value="" onChangeText={() => {}} keyboardType="numeric" />);
    expect((getByLabelText('Phone') as HTMLInputElement).type).toBe('tel');

    rerender(<TextInput label="Text" value="" onChangeText={() => {}} keyboardType="default" />);
    expect((getByLabelText('Text') as HTMLInputElement).type).toBe('text');
  });

  test('supports multiline textarea', () => {
    const { getByLabelText } = render(
      <TextInput label="Notes" value="" onChangeText={() => {}} multiline numberOfLines={3} />
    );

    const el = getByLabelText('Notes');
    expect(el.tagName.toLowerCase()).toBe('textarea');
    expect((el as HTMLTextAreaElement).rows).toBe(3);
  });

  test('accessibilityLabel overrides aria-label', () => {
    const { getByLabelText } = render(
      <TextInput
        label="Name"
        accessibilityLabel="name-input"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(getByLabelText('name-input')).toBeInTheDocument();
  });
});

