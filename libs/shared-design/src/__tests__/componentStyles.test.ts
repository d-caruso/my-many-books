import { componentStyles } from '../components';
import { designTokens } from '../tokens';

describe('componentStyles', () => {
  test('snapshot', () => {
    expect(componentStyles).toMatchSnapshot();
  });

  test('button base uses shared tokens', () => {
    expect(componentStyles.button.base.borderRadius).toBe(designTokens.borderRadius.md);
    expect(componentStyles.button.base.fontWeight).toBe(designTokens.typography.fontWeight.medium);
  });

  test('button sizes and variants are present', () => {
    expect(componentStyles.button.sizes).toEqual(
      expect.objectContaining({
        xs: expect.any(Object),
        sm: expect.any(Object),
        md: expect.any(Object),
        lg: expect.any(Object),
      })
    );

    expect(componentStyles.button.variants).toEqual(
      expect.objectContaining({
        primary: expect.any(Object),
        secondary: expect.any(Object),
        danger: expect.any(Object),
        ghost: expect.any(Object),
      })
    );
  });

  test('input and card have base styles', () => {
    expect(componentStyles.input.base).toBeDefined();
    expect(componentStyles.card.base).toBeDefined();
  });
});

