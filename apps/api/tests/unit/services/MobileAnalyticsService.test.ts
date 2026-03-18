import { MobileAnalyticsService } from '../../../src/services/MobileAnalyticsService';
import { MobileAnalyticsEvent } from '../../../src/models/MobileAnalyticsEvent';
import { AppSetting, MobileHookActionExecution } from '../../../src/models';
import { MOBILE_ANALYTICS_PROCESSING_STATUS, MOBILE_HOOK_SETTING_KEYS } from '@my-many-books/shared-types';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

jest.mock('../../../src/models/MobileAnalyticsEvent', () => ({
  MobileAnalyticsEvent: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../../src/models', () => ({
  AppSetting: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  MobileHookActionExecution: {
    bulkCreate: jest.fn(),
  },
}));

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@my-many-books/shared-logging', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('MobileAnalyticsService', () => {
  const mockEvent = {
    id: 1,
    eventId: 'evt-1',
    eventType: 'book.create.after',
    update: jest.fn().mockResolvedValue(undefined),
  };

  const configureSettings = () => {
    (AppSetting.findOne as jest.Mock).mockImplementation(({ where: { key } }: { where: { key: string } }) => {
      if (key === MOBILE_HOOK_SETTING_KEYS.ACTIONS_MAPPINGS) {
        return Promise.resolve({
          value: JSON.stringify({
            'book.create.after': ['database'],
          }),
        });
      }

      return Promise.resolve(null);
    });

    (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (MobileAnalyticsEvent.findByPk as jest.Mock).mockResolvedValue(mockEvent);
    configureSettings();
  });

  it('emits hook.action.invoked when a mapped action executes', async () => {
    const service = new MobileAnalyticsService();

    await (service as any).processEventAsync(1);

    expect(MobileHookActionExecution.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          mobileAnalyticsEventId: 1,
          actionType: 'database',
          status: 'success',
        }),
      ],
      { validate: true }
    );
    expect(emitHookEvent).toHaveBeenCalledWith(
      EVENTS.HOOK.ACTION.INVOKED,
      expect.objectContaining({
        analyticsEventId: 1,
        eventId: 'evt-1',
        eventType: 'book.create.after',
        actionType: 'database',
        actionStatus: 'success',
        source: 'MobileAnalyticsService.processEventAsync',
      })
    );
    expect(mockEvent.update).toHaveBeenCalledWith({
      processingStatus: MOBILE_ANALYTICS_PROCESSING_STATUS.PROCESSED,
      processingError: null,
    });
  });

  it('emits hook.performance_warning when event processing is slow', async () => {
    const service = new MobileAnalyticsService();
    const dateNowSpy = jest.spyOn(Date, 'now');

    dateNowSpy
      .mockImplementationOnce(() => 0)
      .mockImplementationOnce(() => 1501);

    await (service as any).processEventAsync(1);

    expect(emitHookEvent).toHaveBeenCalledWith(
      EVENTS.HOOK.PERFORMANCE_WARNING,
      expect.objectContaining({
        analyticsEventId: 1,
        eventId: 'evt-1',
        eventType: 'book.create.after',
        durationMs: 1501,
        thresholdMs: 1000,
        actionCount: 1,
        source: 'MobileAnalyticsService.processEventAsync',
      })
    );

    dateNowSpy.mockRestore();
  });
});
