import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingProvider } from '../../providers/OnboardingProvider';
import { ONBOARDING_TOUR_STEPS } from '../../services/guidedTour/onboardingSteps';

const onboardingProviderMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useSettingMock: vi.fn(),
  useGuidedTourMock: vi.fn(),
  startTourMock: vi.fn(),
  updateSettingMock: vi.fn(),
}));

vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: onboardingProviderMocks.useAuthMock,
}));

vi.mock('../../hooks/useSetting', () => ({
  useSetting: onboardingProviderMocks.useSettingMock,
}));

vi.mock('../../hooks/useGuidedTour', () => ({
  useGuidedTour: onboardingProviderMocks.useGuidedTourMock,
}));

describe('OnboardingProvider', () => {
  const renderProvider = () =>
    render(
      <MemoryRouter>
        <OnboardingProvider>
          <div>App</div>
        </OnboardingProvider>
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    onboardingProviderMocks.startTourMock.mockReset();
    onboardingProviderMocks.updateSettingMock.mockReset();
    onboardingProviderMocks.useAuthMock.mockReturnValue({
      user: { id: 1 },
      isAuthenticated: true,
      loading: false,
    });
    onboardingProviderMocks.useSettingMock.mockReturnValue({
      value: false,
      defaultValue: false,
      isLoading: false,
      updateSetting: onboardingProviderMocks.updateSettingMock,
    });
    onboardingProviderMocks.useGuidedTourMock.mockReturnValue({
      startTour: onboardingProviderMocks.startTourMock,
      stopTour: vi.fn(),
      isRunning: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts onboarding tour when authenticated and onboarding is not completed', () => {
    renderProvider();

    vi.advanceTimersByTime(500);

    expect(onboardingProviderMocks.startTourMock).toHaveBeenCalledWith(
      ONBOARDING_TOUR_STEPS,
      expect.any(Function)
    );
  });

  it('does not start onboarding when the flag is already completed', () => {
    onboardingProviderMocks.useSettingMock.mockReturnValue({
      value: true,
      defaultValue: false,
      isLoading: false,
      updateSetting: onboardingProviderMocks.updateSettingMock,
    });

    renderProvider();
    vi.advanceTimersByTime(500);

    expect(onboardingProviderMocks.startTourMock).not.toHaveBeenCalled();
  });

  it('does not start onboarding while auth is loading', () => {
    onboardingProviderMocks.useAuthMock.mockReturnValue({
      user: { id: 1 },
      isAuthenticated: true,
      loading: true,
    });

    renderProvider();
    vi.advanceTimersByTime(500);

    expect(onboardingProviderMocks.startTourMock).not.toHaveBeenCalled();
  });

  it('does not start onboarding when onboarding completion is already stored locally', () => {
    window.localStorage.setItem('web:setting:onboarding.completed:user:1', 'true');

    onboardingProviderMocks.useSettingMock.mockReturnValue({
      value: undefined,
      defaultValue: false,
      isLoading: false,
      updateSetting: onboardingProviderMocks.updateSettingMock,
    });

    renderProvider();
    vi.advanceTimersByTime(500);

    expect(onboardingProviderMocks.startTourMock).not.toHaveBeenCalled();
  });

  it('marks onboarding as completed when the tour completion callback runs', async () => {
    renderProvider();
    vi.advanceTimersByTime(500);

    const onComplete = onboardingProviderMocks.startTourMock.mock.calls[0]?.[1] as
      | (() => Promise<void>)
      | undefined;

    await onComplete?.();

    expect(onboardingProviderMocks.updateSettingMock).toHaveBeenCalledWith(true);
  });
});
