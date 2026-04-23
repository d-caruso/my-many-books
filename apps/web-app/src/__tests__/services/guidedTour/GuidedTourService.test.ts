import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Config, Driver } from 'driver.js';
import type { TourStep } from '../../../pages/HowTo/howToContent';
import { TOUR_OVERLAY_Z_INDEX } from '../../../constants/tour';
import { GuidedTourService } from '../../../services/guidedTour/GuidedTourService';

const { mockHighlight, mockDestroy, mockDriver, mockDriverFactory } = vi.hoisted(() => {
  const highlight = vi.fn();
  const destroy = vi.fn();
  const driverInstance = {
    highlight,
    destroy,
  } as unknown as Driver;
  const driverFactory = vi.fn(() => driverInstance);

  return {
    mockHighlight: highlight,
    mockDestroy: destroy,
    mockDriver: driverInstance,
    mockDriverFactory: driverFactory,
  };
});

vi.mock('driver.js', () => ({
  driver: mockDriverFactory,
}));

describe('GuidedTourService', () => {
  let service: GuidedTourService;
  let capturedConfig: Config;
  const mockNavigate = vi.fn();
  const mockT = vi.fn((key: string) => key);
  const mockGetPath = vi.fn(() => '/how-to');

  const sampleSteps: TourStep[] = [
    {
      targetSelector: '[data-tour-id="add-book-btn"]',
      titleKey: 'tutorial:tour.add_book.step1.title',
      bodyKey: 'tutorial:tour.add_book.step1.body',
    },
    {
      targetSelector: '[data-tour-id="isbn-field"]',
      titleKey: 'tutorial:tour.add_book.step2.title',
      bodyKey: 'tutorial:tour.add_book.step2.body',
      navigateTo: '/?mode=add',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockHighlight.mockClear();
    mockDestroy.mockClear();
    mockDriverFactory.mockImplementation((config?: Config) => {
      capturedConfig = config ?? {};
      return mockDriver;
    });
    mockNavigate.mockReset();
    mockT.mockClear();
    mockGetPath.mockReset();
    mockGetPath.mockReturnValue('/how-to');

    service = new GuidedTourService();
    service.inject(mockNavigate, mockT, mockGetPath);

    const firstTarget = document.createElement('div');
    firstTarget.setAttribute('data-tour-id', 'add-book-btn');
    document.body.appendChild(firstTarget);
  });

  afterEach(() => {
    service.stop();
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts a tour and highlights the first step', async () => {
    await service.start(sampleSteps);

    expect(service.isRunning()).toBe(true);
    expect(mockDriverFactory).toHaveBeenCalledTimes(1);
    expect(mockHighlight).toHaveBeenCalledWith(
      expect.objectContaining({
        element: '[data-tour-id="add-book-btn"]',
        popover: expect.objectContaining({
          title: 'tutorial:tour.add_book.step1.title',
          description: 'tutorial:tour.add_book.step1.body',
          showButtons: ['next', 'previous', 'close'],
          disableButtons: ['previous'],
        }),
      })
    );
  });

  it('applies deterministic stacking to Driver.js overlay elements', async () => {
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.classList.add('driver-overlay');
    document.body.appendChild(overlay);

    const stage = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    stage.classList.add('driver-stage');
    document.body.appendChild(stage);

    const popover = document.createElement('div');
    popover.classList.add('driver-popover');
    document.body.appendChild(popover);

    await service.start(sampleSteps);

    expect(overlay.style.zIndex).toBe(String(TOUR_OVERLAY_Z_INDEX));
    expect(stage.style.zIndex).toBe(String(TOUR_OVERLAY_Z_INDEX + 1));
    expect(popover.style.zIndex).toBe(String(TOUR_OVERLAY_Z_INDEX + 2));
  });

  it('supports centered steps without a target element', async () => {
    const centeredSteps: TourStep[] = [
      {
        targetSelector: '',
        titleKey: 'tutorial:onboarding.welcome.title',
        bodyKey: 'tutorial:onboarding.welcome.body',
      },
    ];

    await service.start(centeredSteps);

    expect(mockHighlight).toHaveBeenCalledWith(
      expect.not.objectContaining({
        element: expect.anything(),
      })
    );
    expect(mockHighlight).toHaveBeenCalledWith(
      expect.objectContaining({
        popover: expect.objectContaining({
          title: 'tutorial:onboarding.welcome.title',
          description: 'tutorial:onboarding.welcome.body',
        }),
      })
    );
  });

  it('does not start when steps array is empty', async () => {
    await service.start([]);

    expect(service.isRunning()).toBe(false);
    expect(mockDriverFactory).not.toHaveBeenCalled();
  });

  it('throws if inject() was not called', async () => {
    const uninitializedService = new GuidedTourService();

    await expect(uninitializedService.start(sampleSteps)).rejects.toThrow(
      'GuidedTourService not initialized'
    );
  });

  it('stop() tears down the driver and resets state', async () => {
    await service.start(sampleSteps);

    service.stop();

    expect(service.isRunning()).toBe(false);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('calls navigate when the next step targets a different route', async () => {
    vi.useRealTimers();

    const secondTarget = document.createElement('div');
    secondTarget.setAttribute('data-tour-id', 'isbn-field');
    document.body.appendChild(secondTarget);

    await service.start(sampleSteps);

    const nextHandler = capturedConfig.onNextClick;
    expect(nextHandler).toBeUndefined();

    const firstHighlightCall = mockHighlight.mock.calls[0]?.[0] as {
      popover: { onNextClick?: () => Promise<void> };
    };

    await firstHighlightCall.popover.onNextClick?.();

    expect(mockNavigate).toHaveBeenCalledWith('/?mode=add');
    expect(mockHighlight).toHaveBeenLastCalledWith(
      expect.objectContaining({
        element: '[data-tour-id="isbn-field"]',
        popover: expect.objectContaining({
          title: 'tutorial:tour.add_book.step2.title',
          description: 'tutorial:tour.add_book.step2.body',
          nextBtnText: 'tutorial:tour.btn_done',
        }),
      })
    );
  });
});
