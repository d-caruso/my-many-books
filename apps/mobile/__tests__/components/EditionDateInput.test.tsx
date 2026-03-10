import React from 'react';
import { Platform } from 'react-native';
import renderer from 'react-test-renderer';
import { EditionDateInput } from '@/components/EditionDateInput';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    __esModule: true,
    default: (props: unknown) => React.createElement('DateTimePicker', props),
    DateTimePickerAndroid: {
      open: jest.fn(),
    },
  };
});

describe('EditionDateInput (mobile)', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Platform.OS = originalPlatform;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps month disabled until year is a valid non-zero YYYY', () => {
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<EditionDateInput value="" onChange={jest.fn()} />);
    });

    const yearInput = tree.root.findByProps({ testID: 'editionDate-year-input' });
    expect(tree.root.findByProps({ testID: 'editionDate-month-button' }).props.accessibilityState?.disabled).toBe(true);

    renderer.act(() => {
      yearInput.props.onChangeText('2');
    });
    expect(tree.root.findByProps({ testID: 'editionDate-month-button' }).props.accessibilityState?.disabled).toBe(true);

    renderer.act(() => {
      yearInput.props.onChangeText('0000');
    });
    expect(tree.root.findByProps({ testID: 'editionDate-month-button' }).props.accessibilityState?.disabled).toBe(true);

    renderer.act(() => {
      yearInput.props.onChangeText('2024');
    });
    expect(tree.root.findByProps({ testID: 'editionDate-month-button' }).props.accessibilityState?.disabled).toBe(false);
  });

  it('caps typed year to the current year', () => {
    const onChange = jest.fn();
    const currentYear = new Date().getFullYear();
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<EditionDateInput value="" onChange={onChange} />);
    });

    const yearInput = tree.root.findByProps({ testID: 'editionDate-year-input' });
    renderer.act(() => {
      yearInput.props.onChangeText(String(currentYear + 1));
    });

    expect(tree.root.findByProps({ testID: 'editionDate-year-input' }).props.value).toBe(
      String(currentYear)
    );
    expect(onChange).toHaveBeenLastCalledWith(String(currentYear));
  });

  it('uses leap-year aware February day options', () => {
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<EditionDateInput value="2024-02" onChange={jest.fn()} />);
    });
    renderer.act(() => {
      jest.runAllTimers();
    });

    renderer.act(() => {
      tree.root.findByProps({ testID: 'editionDate-day-button' }).props.onPress();
    });
    expect(tree.root.findByProps({ testID: 'editionDate-option-day-29' })).toBeDefined();

    renderer.act(() => {
      tree.update(<EditionDateInput value="2023-02" onChange={jest.fn()} />);
    });
    renderer.act(() => {
      jest.runAllTimers();
    });
    expect(() => tree.root.findByProps({ testID: 'editionDate-option-day-29' })).toThrow();
    expect(tree.root.findByProps({ testID: 'editionDate-option-day-28' })).toBeDefined();
  });

  it('opens Android native calendar picker from the calendar button and syncs fields', () => {
    Platform.OS = 'android';
    const onChange = jest.fn();
    const currentYear = new Date().getFullYear();
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<EditionDateInput value="" onChange={onChange} />);
    });

    renderer.act(() => {
      tree.root.findByProps({ testID: 'editionDate-calendar-button' }).props.onPress();
    });

    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
    const config = (DateTimePickerAndroid.open as jest.Mock).mock.calls[0][0];
    expect(typeof config.onChange).toBe('function');
    expect(config.maximumDate).toBeInstanceOf(Date);
    expect(config.maximumDate.getFullYear()).toBe(currentYear);
    expect(config.maximumDate.getMonth()).toBe(11);
    expect(config.maximumDate.getDate()).toBe(31);

    renderer.act(() => {
      config.onChange({ type: 'set' }, new Date(2024, 1, 29));
    });

    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');
  });

  it('uses a larger calendar icon touch target', () => {
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<EditionDateInput value="" onChange={jest.fn()} />);
    });
    const calendarButton = tree.root.findByProps({ testID: 'editionDate-calendar-button' });

    expect(calendarButton.props.size).toBe(30);
  });
});
