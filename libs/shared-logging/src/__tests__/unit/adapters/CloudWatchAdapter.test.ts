const sendMock = jest.fn();
const describeLogStreamsCommandMock = jest.fn((input) => ({ __type: 'DescribeLogStreamsCommand', input }));
const createLogStreamCommandMock = jest.fn((input) => ({ __type: 'CreateLogStreamCommand', input }));
const putLogEventsCommandMock = jest.fn((input) => ({ __type: 'PutLogEventsCommand', input }));

jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  DescribeLogStreamsCommand: function DescribeLogStreamsCommand(input: any) {
    return describeLogStreamsCommandMock(input);
  },
  CreateLogStreamCommand: function CreateLogStreamCommand(input: any) {
    return createLogStreamCommandMock(input);
  },
  PutLogEventsCommand: function PutLogEventsCommand(input: any) {
    return putLogEventsCommandMock(input);
  },
}));

import { CloudWatchAdapter } from '../../../adapters/CloudWatchAdapter';
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

describe('CloudWatchAdapter', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let intervalHandle: any;
  let intervalCallback: (() => void) | undefined;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    sendMock.mockReset();
    describeLogStreamsCommandMock.mockClear();
    createLogStreamCommandMock.mockClear();
    putLogEventsCommandMock.mockClear();

    intervalHandle = { unref: jest.fn() };
    intervalCallback = undefined;
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((cb: any) => {
      intervalCallback = cb;
      return intervalHandle;
    });
    clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('starts a flush timer and unrefs it', () => {
    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      flushInterval: 123,
      retries: 0,
    } as any);

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 123);
    expect(intervalHandle.unref).toHaveBeenCalledTimes(1);
    return adapter.destroy();
  });

  it('logs errors from the periodic flush timer', async () => {
    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      flushInterval: 123,
      retries: 0,
    } as any);

    const flushSpy = jest
      .spyOn(adapter, 'flush')
      .mockRejectedValueOnce(new Error('timer-boom'))
      .mockResolvedValueOnce(undefined);

    intervalCallback?.();
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[cloudwatch]',
      'Flush timer error:',
      expect.any(Error)
    );

    flushSpy.mockRestore();
    await adapter.destroy();
  });

  it('creates a log stream if missing and sends sorted log events', async () => {
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') {
        return { logStreams: [] };
      }
      if (command.__type === 'CreateLogStreamCommand') {
        return {};
      }
      if (command.__type === 'PutLogEventsCommand') {
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 2,
      retries: 0,
    } as any);

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
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if (command.__type === 'CreateLogStreamCommand') return {};
      if (command.__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 2,
      retries: 0,
    } as any);

    await adapter.write([logB, logZero]);
    await adapter.flush();

    const putInput = putLogEventsCommandMock.mock.calls[0]?.[0];
    expect(putInput.logEvents[0].timestamp).toBe(0);
    expect(putInput.logEvents[1].timestamp).toBe(logB.timestamp.getTime());

    await adapter.destroy();
  });

  it('creates a log stream when DescribeLogStreams returns no logStreams field', async () => {
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') {
        return {};
      }
      if (command.__type === 'CreateLogStreamCommand') {
        return {};
      }
      if (command.__type === 'PutLogEventsCommand') {
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    } as any);

    await adapter.write([logA]);
    expect(createLogStreamCommandMock).toHaveBeenCalledTimes(1);
    await adapter.destroy();
  });

  it('does not write when disabled or when logs are empty', async () => {
    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      enabled: false,
      bufferSize: 1,
      retries: 0,
    } as any);

    await adapter.write([logA]);
    await adapter.write([]);
    await adapter.flush();
    expect(sendMock).not.toHaveBeenCalled();

    await adapter.destroy();
  });

  it('flush is a no-op when buffer is empty', async () => {
    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      retries: 0,
    } as any);

    await adapter.flush();
    expect(sendMock).not.toHaveBeenCalled();
    await adapter.destroy();
  });

  it('buffers logs until bufferSize is reached', async () => {
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if (command.__type === 'CreateLogStreamCommand') return {};
      if (command.__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      return {};
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 2,
      retries: 0,
    } as any);

    await adapter.write([logA]);
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(0);

    await adapter.flush();
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(1);

    await adapter.destroy();
  });

  it('resets sequenceToken on InvalidSequenceTokenException and retries later', async () => {
    let phase = 0;
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') {
        return phase === 0
          ? { logStreams: [{ logStreamName: 'stream', uploadSequenceToken: 'upload' }] }
          : { logStreams: [{ logStreamName: 'stream' }] };
      }
      if (command.__type === 'PutLogEventsCommand') {
        if (phase === 0) {
          phase = 1;
          const err: any = new Error('invalid token');
          err.name = 'InvalidSequenceTokenException';
          throw err;
        }
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    } as any);

    await adapter.write([logA]); // triggers flush and fails
    await adapter.flush(); // retries later and succeeds

    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(2);
    expect(putLogEventsCommandMock.mock.calls[0]?.[0].sequenceToken).toBe('upload');
    expect(putLogEventsCommandMock.mock.calls[1]?.[0].sequenceToken).toBeUndefined();

    await adapter.destroy();
  });

  it('also resets sequenceToken on DataAlreadyAcceptedException', async () => {
    let phase = 0;
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') {
        return phase === 0
          ? { logStreams: [{ logStreamName: 'stream', uploadSequenceToken: 'upload' }] }
          : { logStreams: [{ logStreamName: 'stream' }] };
      }
      if (command.__type === 'PutLogEventsCommand') {
        if (phase === 0) {
          phase = 1;
          const err: any = new Error('already accepted');
          err.name = 'DataAlreadyAcceptedException';
          throw err;
        }
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    } as any);

    await adapter.write([logA]);
    await adapter.flush();

    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(2);
    expect(putLogEventsCommandMock.mock.calls[1]?.[0].sequenceToken).toBeUndefined();

    await adapter.destroy();
  });

  it('handles ResourceAlreadyExistsException during stream creation', async () => {
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') {
        return { logStreams: [] };
      }
      if (command.__type === 'CreateLogStreamCommand') {
        const err: any = new Error('exists');
        err.name = 'ResourceAlreadyExistsException';
        throw err;
      }
      if (command.__type === 'PutLogEventsCommand') {
        return { nextSequenceToken: 'next' };
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    } as any);

    await adapter.write([logA]);
    await adapter.destroy();
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(1);
  });

  it('keeps logs in buffer when ensureLogStream fails with a non-ResourceAlreadyExists error', async () => {
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') {
        const err: any = new Error('denied');
        err.name = 'AccessDeniedException';
        throw err;
      }
      throw new Error('unexpected command');
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    } as any);

    await adapter.write([logA]); // triggers flush and fails before PutLogEvents
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(0);

    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if (command.__type === 'CreateLogStreamCommand') return {};
      if (command.__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      return {};
    });

    await adapter.flush();
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(1);

    await adapter.destroy();
  });

  it('keeps logs in buffer when flush fails', async () => {
    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if (command.__type === 'CreateLogStreamCommand') return {};
      if (command.__type === 'PutLogEventsCommand') throw new Error('cw-down');
      return {};
    });

    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      bufferSize: 1,
      retries: 0,
    } as any);

    await adapter.write([logA]); // triggers flush and fails

    sendMock.mockImplementation(async (command: any) => {
      if (command.__type === 'DescribeLogStreamsCommand') return { logStreams: [] };
      if (command.__type === 'CreateLogStreamCommand') return {};
      if (command.__type === 'PutLogEventsCommand') return { nextSequenceToken: 'next' };
      return {};
    });

    await adapter.flush();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[cloudwatch]', 'Failed to flush logs to CloudWatch:', 'cw-down');
    expect(putLogEventsCommandMock).toHaveBeenCalledTimes(2);

    await adapter.destroy();
  });

  it('healthCheck returns true/false based on DescribeLogStreams', async () => {
    sendMock.mockResolvedValueOnce({ logStreams: [] });
    const adapter = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      retries: 0,
    } as any);
    await expect(adapter.healthCheck()).resolves.toBe(true);
    await adapter.destroy();

    sendMock.mockRejectedValueOnce(new Error('nope'));
    const adapter2 = new CloudWatchAdapter({
      logGroupName: 'group',
      logStreamName: 'stream',
      region: 'eu-west-1',
      retries: 0,
    } as any);
    await expect(adapter2.healthCheck()).resolves.toBe(false);
    await adapter2.destroy();
  });
});
