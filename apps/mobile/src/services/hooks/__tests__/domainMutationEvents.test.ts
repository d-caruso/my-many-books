import { emitDomainMutationLifecycle } from '../domainMutationEvents';
import type { MobileEventName } from '../eventsSchema';

const emitMock = jest.fn();

jest.mock('../mobileHooks', () => ({
  mobileHooks: {
    emit: (...args: unknown[]) => emitMock(...args),
  },
}));

describe('emitDomainMutationLifecycle', () => {
  beforeEach(() => {
    emitMock.mockReset();
  });

  it('does not wait for hook emission before resolving the operation', async () => {
    emitMock.mockImplementation(() => new Promise(() => {}));
    const operation = jest.fn().mockResolvedValue({ id: 42 });

    await expect(
      emitDomainMutationLifecycle(
        {
          BEFORE: 'book.create.before' as MobileEventName,
          AFTER: 'book.create.after' as MobileEventName,
          FAILURE: 'book.create.failure' as MobileEventName,
        },
        {
          operationId: 'op_1',
          resourceType: 'book',
          timestamp: '2026-03-18T00:00:00.000Z',
        },
        operation,
        (result) => ({ result })
      )
    ).resolves.toEqual({ id: 42 });

    expect(operation).toHaveBeenCalledTimes(1);
    expect(emitMock).toHaveBeenNthCalledWith(
      1,
      'book.create.before',
      expect.objectContaining({
        operationId: 'op_1',
        resourceType: 'book',
      })
    );
  });
});
