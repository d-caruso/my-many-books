import { useEffect, useState } from 'react';

/**
 * Hook to initialize i18n asynchronously
 * Defers i18n library loading to reduce initial JS execution time
 */
export const useI18nInit = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Dynamically import i18n configuration
    import('../i18n')
      .then(() => {
        setIsReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize i18n:', error);
        // Still mark as ready to prevent blocking the app
        setIsReady(true);
      });
  }, []);

  return isReady;
};
