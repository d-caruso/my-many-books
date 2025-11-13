import { useState, useEffect } from 'react';

interface PWAState {
  isOffline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => Promise<void>;
  dismissUpdate: () => void;
}

// Global flag to ensure service worker only registers once (even with React Strict Mode)
let swRegistrationPromise: Promise<ServiceWorkerRegistration | undefined> | null = null;
let globalDeferredPrompt: Event | null = null;

export const usePWA = (): PWAState & PWAActions => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(() => {
    // Check sessionStorage for installability flag on mount
    return sessionStorage.getItem('pwa-installable') === 'true';
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      setIsInstalled(true);
      // Clear installability if already installed
      sessionStorage.removeItem('pwa-installable');
    }

    // Restore global deferred prompt if available
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    // Register service worker once
    if ('serviceWorker' in navigator && !swRegistrationPromise) {
      swRegistrationPromise = navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });

          // Check if there's a waiting worker
          if (reg.waiting) {
            setUpdateAvailable(true);
          }

          return reg;
        })
        .catch((err) => {
          console.error('[PWA] Service worker registration failed:', err);
          return undefined;
        });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } else if (swRegistrationPromise) {
      // Reuse existing promise
      swRegistrationPromise.then((reg) => {
        if (reg) setRegistration(reg);
      });
    }

    // Online/offline detection
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt handling - use global storage to persist across re-renders
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
      // Store installability flag in sessionStorage
      sessionStorage.setItem('pwa-installable', 'true');
    };

    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      // Clear installability flag when installed
      sessionStorage.removeItem('pwa-installable');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<void> => {
    const prompt = deferredPrompt || globalDeferredPrompt;
    if (!prompt) {
      return;
    }

    const promptEvent = prompt as any;
    promptEvent.prompt();

    const { outcome } = await promptEvent.userChoice;

    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setIsInstallable(false);
      setDeferredPrompt(null);
      sessionStorage.removeItem('pwa-installable');
    } else if (outcome === 'dismissed') {
      // User dismissed, clear the flag
      globalDeferredPrompt = null;
      setIsInstallable(false);
      sessionStorage.removeItem('pwa-installable');
    }
  };

  const updateApp = async (): Promise<void> => {
    if (registration && registration.waiting) {
      // Tell the waiting SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const dismissUpdate = (): void => {
    setUpdateAvailable(false);
  };

  return {
    isOffline,
    isInstallable,
    isInstalled,
    updateAvailable,
    registration,
    installApp,
    updateApp,
    dismissUpdate,
  };
};
