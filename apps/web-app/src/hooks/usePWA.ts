import { useState, useEffect } from 'react';
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

export const usePWA = (): PWAState & PWAActions => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
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

      workbox.register().then((reg) => {
        setRegistration(reg || null);
      });
    }

    // Online/offline detection
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt handling
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
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
    if (!deferredPrompt) return;

    const promptEvent = deferredPrompt as any;
    promptEvent.prompt();

    const { outcome } = await promptEvent.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const updateApp = async (): Promise<void> => {
    if (!wb) return;

    if (registration && registration.waiting) {
      // Tell the waiting SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Force update by messaging the SW
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