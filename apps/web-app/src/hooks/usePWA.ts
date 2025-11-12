import { useState, useEffect, useRef } from 'react';
import { Workbox } from 'workbox-window';

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
  const [wb, setWb] = useState<Workbox | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode - check this FIRST
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      setIsInstalled(true);
      // Clear installability if already installed
      sessionStorage.removeItem('pwa-installable');
    }

    // Check for existing installability flag
    const storedInstallable = sessionStorage.getItem('pwa-installable');

    // Restore global deferred prompt if available
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    // Register service worker ONCE (enabled in both dev and production)
    if ('serviceWorker' in navigator && !swRegistrationPromise) {

      // In production, use Workbox for advanced features
      // In development, register the simple service worker directly
      if (import.meta.env.PROD) {
        const workbox = new Workbox('/sw.js');
        setWb(workbox);

        workbox.addEventListener('installed', (event) => {
          if (event.isUpdate) {
            setUpdateAvailable(true);
          }
        });

        workbox.addEventListener('waiting', () => {
          setUpdateAvailable(true);
        });

        workbox.addEventListener('controlling', () => {
          window.location.reload();
        });

        swRegistrationPromise = workbox.register().then((reg) => {
          setRegistration(reg || null);
          return reg;
        });
      } else {
        // Development mode - register service worker directly (ONCE)
        swRegistrationPromise = navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            setRegistration(reg);
            return reg;
          })
          .catch((error) => {
            return undefined;
          });
      }
    } else if (swRegistrationPromise) {
      swRegistrationPromise.then((reg) => {
        if (reg) setRegistration(reg);
      });
    } else if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service worker not supported in this browser');
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

    // Fallback: Check if app is installable even without beforeinstallprompt
    // This handles cases where Chrome doesn't fire the event due to engagement heuristics
    const checkInstallability = async () => {
      // Check if related apps are already installed (Chrome API)
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps.length === 0 && !isStandalone && !storedInstallable) {
            // App is not installed and Chrome hasn't fired beforeinstallprompt
            // Check if we have a service worker (indicates installability)
            const registration = await navigator.serviceWorker.getRegistration();
          }
        } catch (e) {
          // API not supported or failed, that's okay
        }
      }
    };

    // Log a message after some time if event hasn't fired
    let devTimeoutId: NodeJS.Timeout | null = null;

    const timeoutId = setTimeout(() => {
      checkInstallability();
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      if (devTimeoutId) clearTimeout(devTimeoutId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<void> => {
    const prompt = deferredPrompt || globalDeferredPrompt;
    if (!prompt) {
      console.warn('Install prompt not available - deferred prompt is null');
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
    } else if (wb) {
      // Force update by messaging the SW (production with Workbox)
      wb.messageSkipWaiting();
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