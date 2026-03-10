const sendMock = jest.fn();
const putObjectCommandMock = jest.fn((input) => ({ __type: 'PutObjectCommand', input }));
const headBucketCommandMock = jest.fn((input) => ({ __type: 'HeadBucketCommand', input }));
const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: function PutObjectCommand(input: unknown) {
    return putObjectCommandMock(input);
  },
  HeadBucketCommand: function HeadBucketCommand(input: unknown) {
    return headBucketCommandMock(input);
  },
}));

jest.mock('../../../services/logger', () => ({
  getLogger: () => ({
    error: mockLoggerError,
    info: mockLoggerInfo,
  }),
}));

import { S3Adapter, type S3AdapterConfig } from '../../../adapters/S3Adapter';
import type { LogEntry } from '../../../interfaces/LogEntry';

const baseLog: LogEntry = {
  timestamp: new Date('2025-01-01T00:00:00.000Z'),
  level: 'info',
  message: 'hello',
  traceId: 'trace',
  service: 'svc',
  metadata: {},
};

const createConfig = (overrides: Partial<S3AdapterConfig> = {}): S3AdapterConfig => ({
  name: 's3-test',
  bucketName: 'bucket',
  region: 'eu-west-1',
  retries: 0,
  ...overrides,
});

describe('S3Adapter', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let intervalHandle: NodeJS.Timeout & { unref: jest.Mock };
  let intervalCallback: (() => void) | undefined;

  beforeEach(() => {
    sendMock.mockReset();
    putObjectCommandMock.mockClear();
    headBucketCommandMock.mockClear();

    intervalHandle = { unref: jest.fn() } as unknown as NodeJS.Timeout & { unref: jest.Mock };
    intervalCallback = undefined;
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(
      ((cb: () => void): NodeJS.Timeout => {
        intervalCallback = cb;
        return intervalHandle;
      }) as unknown as typeof setInterval
    );
    clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
    mockLoggerError.mockClear();
    mockLoggerInfo.mockClear();
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('starts a flush timer and unrefs it', () => {
    const adapter = new S3Adapter(createConfig({ flushInterval: 123 }));

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 123);
    expect(intervalHandle.unref).toHaveBeenCalledTimes(1);
    return adapter.destroy();
  });

  it('does nothing when disabled', async () => {
    const adapter = new S3Adapter(createConfig({ enabled: false, bufferSize: 1 }));

    await adapter.write([baseLog]);
    expect(sendMock).not.toHaveBeenCalled();
    await adapter.destroy();
  });

  it('does nothing when logs are empty and flush is a no-op when buffer is empty', async () => {
    const adapter = new S3Adapter(createConfig({ bufferSize: 1 }));

    await adapter.write([]);
    await adapter.flush();

    expect(sendMock).not.toHaveBeenCalled();
    await adapter.destroy();
  });

  it('uploads gzipped logs by default', async () => {
    sendMock.mockResolvedValueOnce({});

    const adapter = new S3Adapter(createConfig({ bufferSize: 1, keyPrefix: 'logs/' }));

    await adapter.write([baseLog]);

    expect(putObjectCommandMock).toHaveBeenCalledTimes(1);
    const input = putObjectCommandMock.mock.calls[0]?.[0];
    expect(input.Bucket).toBe('bucket');
    expect(input.Key).toMatch(/^logs\/\d{4}\/\d{2}\/\d{2}\/logs-\d+\.json\.gz$/);
    expect(Buffer.isBuffer(input.Body)).toBe(true);
    expect(input.ContentType).toBe('application/gzip');
    expect(input.Metadata).toEqual({ logCount: '1', compressed: 'true' });

    await adapter.destroy();
  });

  it('buffers logs until bufferSize is reached', async () => {
    sendMock.mockResolvedValueOnce({});

    const adapter = new S3Adapter(createConfig({ bufferSize: 2 }));

    await adapter.write([baseLog]);
    expect(sendMock).not.toHaveBeenCalled();

    await adapter.write([baseLog]);
    expect(sendMock).toHaveBeenCalledTimes(1);

    await adapter.destroy();
  });

  it('uploads plain JSON when compress=false', async () => {
    sendMock.mockResolvedValueOnce({});

    const adapter = new S3Adapter(createConfig({ bufferSize: 1, compress: false, keyPrefix: 'logs/' }));

    await adapter.write([baseLog]);

    const input = putObjectCommandMock.mock.calls[0]?.[0];
    expect(input.Key).toMatch(/^logs\/\d{4}\/\d{2}\/\d{2}\/logs-\d+\.json$/);
    expect(typeof input.Body).toBe('string');
    expect(input.ContentType).toBe('application/json');
    expect(input.Metadata).toEqual({ logCount: '1', compressed: 'false' });

    await adapter.destroy();
  });

  it('retries later by keeping logs in buffer when upload fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('s3-down')).mockResolvedValueOnce({});

    const adapter = new S3Adapter(createConfig({ bufferSize: 1 }));

    await adapter.write([baseLog]);
    await adapter.flush();

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(mockLoggerError).toHaveBeenCalledWith(
      { adapter: 's3', details: ['s3-down'] },
      'Failed to flush logs to S3:'
    );

    await adapter.destroy();
  });

  it('logs errors from the periodic flush timer', async () => {
    const adapter = new S3Adapter(createConfig({ flushInterval: 123 }));

    const flushSpy = jest
      .spyOn(adapter, 'flush')
      .mockRejectedValueOnce(new Error('timer-boom'))
      .mockResolvedValueOnce(undefined);

    intervalCallback?.();
    await Promise.resolve();

    expect(mockLoggerError).toHaveBeenCalledWith(
      { adapter: 's3', details: [expect.any(Error)] },
      'Flush timer error:'
    );

    flushSpy.mockRestore();
    await adapter.destroy();
  });

  it('healthCheck returns true/false based on HeadBucket', async () => {
    sendMock.mockResolvedValueOnce({});
    const adapter = new S3Adapter(createConfig());
    await expect(adapter.healthCheck()).resolves.toBe(true);
    await adapter.destroy();

    sendMock.mockRejectedValueOnce(new Error('nope'));
    const adapter2 = new S3Adapter(createConfig());
    await expect(adapter2.healthCheck()).resolves.toBe(false);
    await adapter2.destroy();
  });
});
