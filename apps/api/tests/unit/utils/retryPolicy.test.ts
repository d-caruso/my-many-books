// ================================================================
// tests/utils/retryPolicy.test.ts
// ================================================================

import { RetryPolicy, RetryConfig } from '../../../src/utils/retryPolicy';

describe('RetryPolicy', () => {
  let retryPolicy: RetryPolicy;
  let mockOperation: jest.Mock;

  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOperation = jest.fn();
    retryPolicy = new RetryPolicy(defaultConfig);
    
    // Mock setTimeout to make tests run instantly
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return {} as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful operations', () => {
    it('should return success on first attempt', async () => {
      const expectedResult = { data: 'success' };
      mockOperation.mockResolvedValue(expectedResult);

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(expectedResult);
      expect(result.attempts).toBe(1);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should return success after retries', async () => {
      const expectedResult = { data: 'success after retry' };
      mockOperation
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce(expectedResult);

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(expectedResult);
      expect(result.attempts).toBe(3);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('failed operations', () => {
    it('should return failure after max attempts', async () => {
      const error = new Error('Persistent failure');
      mockOperation.mockRejectedValue(error);

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.attempts).toBe(3);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error exceptions', async () => {
      mockOperation.mockRejectedValue('String error');

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('String error');
      expect(result.attempts).toBe(3);
    });

    it('should handle undefined exceptions', async () => {
      mockOperation.mockRejectedValue(undefined);

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('undefined');
      expect(result.attempts).toBe(3);
    });
  });

  describe('delay calculation', () => {
    it('should calculate exponential backoff without jitter', async () => {
      const config: RetryConfig = {
        maxAttempts: 4,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false,
      };
      
      retryPolicy = new RetryPolicy(config);
      mockOperation.mockRejectedValue(new Error('Test error'));

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      setTimeoutSpy.mockImplementation((callback: any) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await retryPolicy.execute(mockOperation);

      // Verify delay calculations: 100, 200, 400
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 100);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 200);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(3, expect.any(Function), 400);

      setTimeoutSpy.mockRestore();
    });

    it('should cap delay at maxDelay', async () => {
      const config: RetryConfig = {
        maxAttempts: 4,
        baseDelay: 100,
        maxDelay: 150, // Lower than what exponential backoff would produce
        backoffMultiplier: 2,
        jitter: false,
      };
      
      retryPolicy = new RetryPolicy(config);
      mockOperation.mockRejectedValue(new Error('Test error'));

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      setTimeoutSpy.mockImplementation((callback: any) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await retryPolicy.execute(mockOperation);

      // Verify delays are capped: 100, 150 (capped), 150 (capped)
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 100);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 150);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(3, expect.any(Function), 150);

      setTimeoutSpy.mockRestore();
    });

    it('should add jitter when enabled', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: true,
      };
      
      retryPolicy = new RetryPolicy(config);
      mockOperation.mockRejectedValue(new Error('Test error'));

      // Mock Math.random to return a predictable value
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      setTimeoutSpy.mockImplementation((callback: any) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await retryPolicy.execute(mockOperation);

      // With jitter (0.5), delays should be: 100 + (25 * 0.5) = 112, 200 + (50 * 0.5) = 225
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 112);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 225);

      mathRandomSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });
  });

  describe('different configurations', () => {
    it('should work with single attempt configuration', async () => {
      const config: RetryConfig = {
        maxAttempts: 1,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false,
      };
      
      retryPolicy = new RetryPolicy(config);
      mockOperation.mockRejectedValue(new Error('Single attempt failure'));

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should work with high max attempts', async () => {
      const config: RetryConfig = {
        maxAttempts: 10,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 1.5,
        jitter: false,
      };
      
      retryPolicy = new RetryPolicy(config);
      const successResult = { value: 'eventual success' };
      
      // Fail 8 times, then succeed
      for (let i = 0; i < 8; i++) {
        mockOperation.mockRejectedValueOnce(new Error(`Failure ${i + 1}`));
      }
      mockOperation.mockResolvedValueOnce(successResult);

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(successResult);
      expect(result.attempts).toBe(9);
    });

    it('should handle zero base delay', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 0,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false,
      };
      
      retryPolicy = new RetryPolicy(config);
      mockOperation.mockRejectedValue(new Error('Test error'));

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      setTimeoutSpy.mockImplementation((callback: any) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await retryPolicy.execute(mockOperation);

      // All delays should be 0
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 0);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 0);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('timing', () => {
    it('should track total execution time', async () => {
      mockOperation.mockRejectedValue(new Error('Test error'));

      const result = await retryPolicy.execute(mockOperation);

      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.attempts).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle operation that throws synchronously', async () => {
      mockOperation.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Synchronous error');
      expect(result.attempts).toBe(3);
    });

    it('should handle operations returning undefined', async () => {
      mockOperation.mockResolvedValue(undefined);

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
      expect(result.attempts).toBe(1);
    });

    it('should handle operations returning null', async () => {
      mockOperation.mockResolvedValue(null);

      const result = await retryPolicy.execute(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe(null);
      expect(result.attempts).toBe(1);
    });
  });
});