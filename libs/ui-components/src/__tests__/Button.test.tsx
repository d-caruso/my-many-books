import { fireEvent, render } from '@testing-library/react';
import { Button } from '../Button/Button';

describe('Button', () => {
  test('renders children and supports testID', () => {
    const { getByTestId, getByRole } = render(<Button testID="btn">Save</Button>);
    expect(getByTestId('btn')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  test('calls onPress on click', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button onPress={onPress}>Click</Button>);

    fireEvent.click(getByRole('button', { name: 'Click' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('disabled prop disables the button', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button disabled onPress={onPress}>
        Disabled
      </Button>
    );

    const button = getByRole('button', { name: 'Disabled' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('loading state disables the button and renders a spinner element', () => {
    const { getByRole } = render(<Button loading>Loading</Button>);

    const button = getByRole('button', { name: 'Loading' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.querySelector('div')).toBeTruthy();
  });

  test('accessibilityLabel sets aria-label', () => {
    const { getByLabelText } = render(<Button accessibilityLabel="save-button">Save</Button>);
    expect(getByLabelText('save-button')).toBeInTheDocument();
  });
});

