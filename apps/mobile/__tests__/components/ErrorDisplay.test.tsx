import { ErrorDisplay } from '../../src/components/ErrorDisplay';

describe('ErrorDisplay Component', () => {
  it('should export ErrorDisplay component', () => {
    expect(ErrorDisplay).toBeDefined();
    expect(typeof ErrorDisplay).toBe('function');
  });
});
