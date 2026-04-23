import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { guidedTourService } from '../services/guidedTour/GuidedTourService';
import type { TourStep } from '../pages/HowTo/howToContent';

export function useGuidedTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('tutorial');
  const locationRef = useRef(`${location.pathname}${location.search}`);

  useEffect(() => {
    locationRef.current = `${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    guidedTourService.inject(navigate, t, () => locationRef.current);
  }, [navigate, t]);

  const startTour = useCallback(
    (steps: TourStep[], onComplete?: () => void) => guidedTourService.start(steps, onComplete),
    []
  );

  const stopTour = useCallback(() => {
    guidedTourService.stop();
  }, []);

  const isRunning = guidedTourService.isRunning();

  return {
    startTour,
    stopTour,
    isRunning,
  };
}
