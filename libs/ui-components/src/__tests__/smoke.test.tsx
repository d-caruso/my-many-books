import { render } from '@testing-library/react';
import { Button } from '../Button/Button';

describe('ui-components smoke', () => {
  test('renders a basic component', () => {
    const { getByRole } = render(<Button>Ok</Button>);
    expect(getByRole('button', { name: 'Ok' })).toBeInTheDocument();
  });
});

