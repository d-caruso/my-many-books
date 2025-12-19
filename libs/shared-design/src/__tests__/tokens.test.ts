import { designTokens } from '../tokens';

describe('designTokens snapshots', () => {
  test('colors snapshot', () => {
    expect(designTokens.colors).toMatchSnapshot();
  });

  test('spacing snapshot', () => {
    expect(designTokens.spacing).toMatchSnapshot();
  });

  test('typography snapshot', () => {
    expect(designTokens.typography).toMatchSnapshot();
  });
});

