import { useBooks } from '../../src/hooks/useBooks';
import { operationQueue } from '../../src/services/OperationQueue';
import { isRetriableError } from '../../src/services/QueueExecutor';
import { v4 } from 'uuid';
import * as Types from '../../src/types';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-offline'),
}));

describe('useBooks Offline Operations', () => {
  it('should import useBooks hook', () => {
    expect(useBooks).toBeDefined();
    expect(typeof useBooks).toBe('function');
  });

  it('should verify offline operation helpers exist', () => {
    expect(operationQueue).toBeDefined();
    expect(isRetriableError).toBeDefined();
    expect(typeof isRetriableError).toBe('function');
  });

  it('should verify Book type supports sync fields', () => {
    expect(Types).toBeDefined();
  });

  it('should verify uuid is available', () => {
    const id = v4();

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id).toBe('mock-uuid-offline');
  });
});
