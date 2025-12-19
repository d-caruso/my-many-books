import { BaseAdapter } from '../../../adapters/BaseAdapter';
import type { LogEntry } from '../../../interfaces/LogEntry';

class TestAdapter extends BaseAdapter {
  readonly name = 'test';
  public delays: number[] = [];

  constructor(config: any) {
    super(config);
  }

  getResolvedConfig() {
    return (this as any).config;
  }

  async write(_logs: LogEntry[]): Promise<void> {}
  async flush(): Promise<void> {}
  async healthCheck(): Promise<boolean> {
    return true;
  }

  public retryPublic<T>(fn: () => Promise<T>, maxRetries?: number): Promise<T> {
    return (this as any).retry(fn, maxRetries);
  }

  protected override delay(ms: number): Promise<void> {
    this.delays.push(ms);
    return Promise.resolve();
  }
}

class DelayAdapter extends BaseAdapter {
  readonly name = 'delay';
  async write(_logs: LogEntry[]): Promise<void> {}
  async flush(): Promise<void> {}
  async healthCheck(): Promise<boolean> {
    return true;
  }

  delayPublic(ms: number): Promise<void> {
    return (this as any).delay(ms);
  }
}

describe('BaseAdapter', () => {
  it('applies default config values', () => {
    const adapter = new TestAdapter({});
    const config = adapter.getResolvedConfig();

    expect(config.name).toBe('unknown');
    expect(config.enabled).toBe(true);
    expect(config.timeout).toBe(5000);
    expect(config.retries).toBe(3);
    expect(adapter.isEnabled()).toBe(true);
  });

  it('accepts provided config values', () => {
    const adapter = new TestAdapter({ name: 'custom', timeout: 1234, retries: 0 });
    const config = adapter.getResolvedConfig();

    expect(config.name).toBe('custom');
    expect(config.timeout).toBe(1234);
    expect(config.retries).toBe(0);
  });

  it('respects enabled=false', () => {
    const adapter = new TestAdapter({ enabled: false });
    expect(adapter.isEnabled()).toBe(false);
  });

  it('retries with exponential backoff and succeeds', async () => {
    const adapter = new TestAdapter({ retries: 3 });

    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValueOnce('ok');

    await expect(adapter.retryPublic(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(adapter.delays).toEqual([100, 200]);
  });

  it('throws the last error after exhausting retries', async () => {
    const adapter = new TestAdapter({ retries: 1 });
    const fn = jest.fn<Promise<void>, []>().mockRejectedValue(new Error('nope'));

    await expect(adapter.retryPublic(fn)).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(adapter.delays).toEqual([100]);
  });

  it('wraps non-Error throwables', async () => {
    const adapter = new TestAdapter({ retries: 0 });
    const fn = jest.fn<Promise<void>, []>().mockRejectedValue('nope');

    await expect(adapter.retryPublic(fn)).rejects.toThrow('nope');
  });

  it('throws a generic error when maxRetries is negative', async () => {
    const adapter = new TestAdapter({});
    const fn = jest.fn<Promise<void>, []>();

    await expect(adapter.retryPublic(fn, -1)).rejects.toThrow('Retry failed with no error');
    expect(fn).not.toHaveBeenCalled();
  });

  it('delay resolves after the requested time', async () => {
    jest.useFakeTimers();
    const adapter = new DelayAdapter({});

    const promise = adapter.delayPublic(1000);
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();

    jest.useRealTimers();
  });
});
