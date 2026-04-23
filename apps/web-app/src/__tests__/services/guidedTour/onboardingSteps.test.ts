import { describe, expect, it } from 'vitest';
import { ONBOARDING_TOUR_STEPS } from '../../../services/guidedTour/onboardingSteps';

describe('ONBOARDING_TOUR_STEPS', () => {
  it('has exactly 6 steps', () => {
    expect(ONBOARDING_TOUR_STEPS).toHaveLength(6);
  });

  it('first step has an empty target selector for a centered overlay', () => {
    expect(ONBOARDING_TOUR_STEPS[0]?.targetSelector).toBe('');
  });

  it('last step has an empty target selector for a centered overlay', () => {
    expect(ONBOARDING_TOUR_STEPS[5]?.targetSelector).toBe('');
  });

  it('step 3 navigates to the add book form', () => {
    expect(ONBOARDING_TOUR_STEPS[2]?.navigateTo).toBe('/?mode=add');
  });

  it('all steps have onboarding title and body keys', () => {
    for (const step of ONBOARDING_TOUR_STEPS) {
      expect(step.titleKey).toMatch(/^tutorial:onboarding\./);
      expect(step.bodyKey).toMatch(/^tutorial:onboarding\./);
    }
  });
});
