import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGuidedTour } from '../../hooks/useGuidedTour';
import { guidedTourService } from '../../services/guidedTour/GuidedTourService';

const { injectMock, startMock, stopMock, isRunningMock } = vi.hoisted(() => ({
  injectMock: vi.fn(),
  startMock: vi.fn(),
  stopMock: vi.fn(),
  isRunningMock: vi.fn(() => false),
}));

vi.mock('../../services/guidedTour/GuidedTourService', () => ({
  guidedTourService: {
    inject: injectMock,
    start: startMock,
    stop: stopMock,
    isRunning: isRunningMock,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('useGuidedTour', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/how-to?mode=guided']}>{children}</MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    isRunningMock.mockReturnValue(false);
  });

  it('calls inject on mount', () => {
    renderHook(() => useGuidedTour(), { wrapper });

    expect(guidedTourService.inject).toHaveBeenCalledTimes(1);
    expect(guidedTourService.inject).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('provides a location getter wired to the current route', () => {
    renderHook(() => useGuidedTour(), { wrapper });

    const locationGetter = guidedTourService.inject.mock.calls[0]?.[2] as (() => string) | undefined;

    expect(locationGetter?.()).toBe('/how-to?mode=guided');
  });

  it('startTour delegates to service.start', () => {
    const { result } = renderHook(() => useGuidedTour(), { wrapper });
    const steps = [{ targetSelector: '[data-tour-id="x"]', titleKey: 'a', bodyKey: 'b' }];

    result.current.startTour(steps);

    expect(guidedTourService.start).toHaveBeenCalledWith(steps, undefined);
  });

  it('passes an optional completion callback to service.start', () => {
    const { result } = renderHook(() => useGuidedTour(), { wrapper });
    const steps = [{ targetSelector: '[data-tour-id="x"]', titleKey: 'a', bodyKey: 'b' }];
    const onComplete = vi.fn();

    result.current.startTour(steps, onComplete);

    expect(guidedTourService.start).toHaveBeenCalledWith(steps, onComplete);
  });

  it('stopTour delegates to service.stop', () => {
    const { result } = renderHook(() => useGuidedTour(), { wrapper });

    result.current.stopTour();

    expect(guidedTourService.stop).toHaveBeenCalled();
  });
});
