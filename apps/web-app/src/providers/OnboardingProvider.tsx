import React, { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@my-many-books/shared-auth';
import { SETTING_KEYS } from '@my-many-books/shared-types';
import { useGuidedTour } from '../hooks/useGuidedTour';
import { useSetting } from '../hooks/useSetting';
import { ONBOARDING_TOUR_STEPS } from '../services/guidedTour/onboardingSteps';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps): JSX.Element {
  const { user, isAuthenticated, loading } = useAuth();
  const {
    value: onboardingCompleted,
    defaultValue: onboardingDefaultValue,
    isLoading: settingLoading,
    updateSetting,
  } = useSetting<boolean>(SETTING_KEYS.ONBOARDING.COMPLETED);
  const { startTour } = useGuidedTour();
  const triggeredUserIdRef = useRef<number | null>(null);

  const markOnboardingComplete = useCallback(async (): Promise<void> => {
    try {
      await updateSetting(true);
    } catch {
      // Keep the UI resilient; the local settings override path handles onboarding persistence.
    }
  }, [updateSetting]);

  useEffect(() => {
    if (!user) {
      triggeredUserIdRef.current = null;
      return;
    }

    if (loading || settingLoading || !isAuthenticated) {
      return;
    }

    if (triggeredUserIdRef.current === user.id) {
      return;
    }

    const isOnboardingComplete = onboardingCompleted ?? onboardingDefaultValue ?? false;
    if (isOnboardingComplete) {
      return;
    }

    triggeredUserIdRef.current = user.id;

    const timer = window.setTimeout(() => {
      void startTour(ONBOARDING_TOUR_STEPS, () => {
        void markOnboardingComplete();
      });
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isAuthenticated,
    loading,
    markOnboardingComplete,
    onboardingCompleted,
    onboardingDefaultValue,
    settingLoading,
    startTour,
    user,
  ]);

  return <>{children}</>;
}
