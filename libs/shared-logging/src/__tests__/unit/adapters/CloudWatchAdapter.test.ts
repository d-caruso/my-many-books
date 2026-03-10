const sendMock = jest.fn();
const describeLogStreamsCommandMock = jest.fn((input) => ({ __type: 'DescribeLogStreamsCommand', input }));
const createLogStreamCommandMock = jest.fn((input) => ({ __type: 'CreateLogStreamCommand', input }));
const putLogEventsCommandMock = jest.fn((input) => ({ __type: 'PutLogEventsCommand', input }));
const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  DescribeLogStreamsCommand: function DescribeLogStreamsCommand(input: unknown) {
    return describeLogStreamsCommandMock(input);
  },
  CreateLogStreamCommand: function CreateLogStreamCommand(input: unknown) {
    return createLogStreamCommandMock(input);
  },
  PutLogEventsCommand: function PutLogEventsCommand(input: unknown) {
    return putLogEventsCommandMock(input);
  },
}));

jest.mock('../../../services/logger', () => ({
  getLogger: () => ({
    error: mockLoggerError,
    info: mockLoggerInfo,
  }),
}));

import { CloudWatchAdapter, type CloudWatchAdapterConfig } from '../../../adapters/CloudWatchAdapter';
import type { LogEntry } from '../../../interfaces/LogEntry';

const logA: LogEntry = {
  timestamp: new Date('2025-01-01T00:00:00.000Z'),
  level: 'info',
  message: 'a',
  traceId: 'trace',
  service: 'svc',
  metadata: {},
};

const logB: LogEntry = {
  timestamp: new Date('2025-01-01T00:00:01.000Z'),
  level: 'info',
  message: 'b',
  traceId: 'trace',
  service: 'svc',
  metadata: {},
};

const logZero: LogEntry = {
  timestamp: new Date(0),
  level: 'info',
  message: 'zero',
  traceId: 'trace',
  service: 'svc',
  metadata: {},
};

const createConfig = (
  overrides: Partial<CloudWatchAdapterConfig> = {}
): CloudWatchAdapterConfig => ({
  name: 'cloudwatch-test',
  logGroupName: 'group',
  logStreamName: 'stream',
  region: 'eu-west-1',
  retries: 0,
  ...overrides,
});

describe('CloudWatchAdapter', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let intervalHandle: NodeJS.Timeout & { unref: jest.Mock };
  let intervalCallback: (() => void) | undefined;

  beforeEach(() => {
    sendMock.mockReset();
    describeLogStreamsCommandMock.mockClear();
    createLogStreamCommandMock.mockClear();
    putLogEventsCommandMock.mockClear();

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
    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      flushInterval: 123,
      retries: 0,
    }));

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 123);
    expect(intervalHandle.unref).toHaveBeenCalledTimes(1);
    return adapter.destroy();
  });

  it('logs errors from the periodic flush timer', async () => {
    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      flushInterval: 123,
      retries: 0,
    }));

    const flushSpy = jest
      .spyOn(adapter, 'flush')
      .mockRejectedValueOnce(new Error('timer-boom'))
      .mockResolvedValueOnce(undefined);

    intervalCallback?.();
    await Promise.resolve();

    expect(mockLoggerError).toHaveBeenCalledWith(
      { adapter: 'cloudwatch', details: [expect.any(Error)] },
      'Flush timer error:'
    );

    flushSpy.mockRestore();
    await adapter.destroy();
  });

  it('creates a log stream if missing and sends sorted log events', async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') {
        return { logStreams: [] };
      }
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') {
        return {};
      }
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') {
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 2,
      retries: 0,
    }));

    await adapter.write([logB, logA]);
    await adapter.flush();

    expect(describeLogStreamsCommandMock).toHaveBeenCalledWith({
      logGroupName: 'group',
      logStreamNamePrefix: 'stream',
    });
    expect(createLogStreamCommandMock).toHaveBeenCalledWith({
      logGroupName: 'group',
      logStreamName: 'stream',
    });

    const putInput = putLogEventsCommandMock.mock.calls[0]?.[0];
    expect(putInput.logGroupName).toBe('group');
    expect(putInput.logStreamName).toBe('stream');
    expect(putInput.logEvents).toHaveLength(2);
    expect(putInput.logEvents[0].timestamp).toBe(logA.timestamp.getTime());
    expect(putInput.logEvents[1].timestamp).toBe(logB.timestamp.getTime());

    await adapter.destroy();
  });

  it('sorts log events correctly when a timestamp is 0', async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') return {};
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 2,
      retries: 0,
    }));

    await adapter.write([logB, logZero]);
    await adapter.flush();

    const putInput = putLogEventsCommandMock.mock.calls[0]?.[0];
    expect(putInput.logEvents[0].timestamp).toBe(0);
    expect(putInput.logEvents[1].timestamp).toBe(logB.timestamp.getTime());

    await adapter.destroy();
  });

  it('creates a log stream when DescribeLogStreams returns no logStreams field', async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') {
        return {};
      }
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') {
        return {};
      }
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') {
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    }));

    await adapter.write([logA]);
    expect(createLogStreamCommandMock).toHaveBeenCalledTimes(1);
    await adapter.destroy();
  });

  it('does not write when disabled or when logs are empty', async () => {
    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      enabled: false,
      bufferSize: 1,
      retries: 0,
    }));

    await adapter.write([logA]);
    await adapter.write([]);
    await adapter.flush();
    expect(sendMock).not.toHaveBeenCalled();

    await adapter.destroy();
  });

  it('flush is a no-op when buffer is empty', async () => {
    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      retries: 0,
    }));

    await adapter.flush();
    expect(sendMock).not.toHaveBeenCalled();
    await adapter.destroy();
  });

  it('buffers logs until bufferSize is reached', async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') return {};
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      return {};
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 2,
      retries: 0,
    }));

    await adapter.write([logA]);
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(0);

    await adapter.flush();
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(1);

    await adapter.destroy();
  });

  it('resets sequenceToken on InvalidSequenceTokenException and retries later', async () => {
    let phase = 0;
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') {
        return phase === 0
          ? { logStreams: [{ logStreamName: 'stream', uploadSequenceToken: 'upload' }] }
          : { logStreams: [{ logStreamName: 'stream' }] };
      }
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') {
        if (phase === 0) {
          phase = 1;
          const err = new Error('invalid token');
          err.name = 'InvalidSequenceTokenException';
          throw err;
        }
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    }));

    await adapter.write([logA]); // triggers flush and fails
    await adapter.flush(); // retries later and succeeds

    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(2);
    expect(putLogEventsCommandMock.mock.calls[0]?.[0].sequenceToken).toBe('upload');
    expect(putLogEventsCommandMock.mock.calls[1]?.[0].sequenceToken).toBeUndefined();

    await adapter.destroy();
  });

  it('also resets sequenceToken on DataAlreadyAcceptedException', async () => {
    let phase = 0;
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') {
        return phase === 0
          ? { logStreams: [{ logStreamName: 'stream', uploadSequenceToken: 'upload' }] }
          : { logStreams: [{ logStreamName: 'stream' }] };
      }
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') {
        if (phase === 0) {
          phase = 1;
          const err = new Error('already accepted');
          err.name = 'DataAlreadyAcceptedException';
          throw err;
        }
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    }));

    await adapter.write([logA]);
    await adapter.flush();

    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(2);
    expect(putLogEventsCommandMock.mock.calls[1]?.[0].sequenceToken).toBeUndefined();

    await adapter.destroy();
  });

  it('handles ResourceAlreadyExistsException during stream creation', async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') {
        return { logStreams: [] };
      }
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') {
        const err = new Error('exists');
        err.name = 'ResourceAlreadyExistsException';
        throw err;
      }
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') {
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    }));

    await adapter.write([logA]);
    await adapter.destroy();
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(1);
  });

  it('keeps logs in buffer when ensureLogStream fails with a non-ResourceAlreadyExists error', async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') {
        const err = new Error('denied');
        err.name = 'AccessDeniedException';
        throw err;
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    }));

    await adapter.write([logA]); // triggers flush and fails before PutLogEvents
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(0);

    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') return {};
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      return {};
    });

    await adapter.flush();
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(1);

    await adapter.destroy();
  });

  it('keeps logs in buffer when flush fails', async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') return {};
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') throw new Error('cw-down');
      return {};
    });

    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    }));

    await adapter.write([logA]); // triggers flush and fails

    sendMock.mockImplementation(async (command: unknown) => {
      if ((command as { __type?: string }).__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if ((command as { __type?: string }).__type === 'CreateLogStreamCommand') return {};
      if ((command as { __type?: string }).__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      return {};
    });

    await adapter.flush();

    expect(mockLoggerError).toHaveBeenCalledWith(
      { adapter: 'cloudwatch', details: ['cw-down'] },
      'Failed to flush logs to CloudWatch:'
    );
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(2);

    await adapter.destroy();
  });

  it('healthCheck returns true/false based on DescribeLogStreams', async () => {
    sendMock.mockResolvedValueOnce({ logStreams: [] });
    const adapter = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      retries: 0,
    }));
    await expect(adapter.healthCheck()).resolves.toBe(true);
    await adapter.destroy();

    sendMock.mockRejectedValueOnce(new Error('nope'));
    const adapter2 = new CloudWatchAdapter(createConfig({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      retries: 0,
    }));
    await expect(adapter2.healthCheck()).resolves.toBe(false);
    await adapter2.destroy();
  });
});
