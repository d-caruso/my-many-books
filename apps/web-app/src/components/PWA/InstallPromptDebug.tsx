import React, { useEffect, useState } from 'react';
import { usePWAContext } from '../../contexts/PWAContext';

export const InstallPromptDebug: React.FC = () => {
  const { isInstallable, isInstalled } = usePWAContext();
  const [swStatus, setSwStatus] = useState<string>('checking...');
  const [envMode, setEnvMode] = useState<string>('checking...');
  const [eventFired, setEventFired] = useState<boolean>(false);

  useEffect(() => {
    // Check environment
    setEnvMode(import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT');

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        if (regs.length > 0) {
          const reg = regs[0];
          const state = reg.active?.state || reg.installing?.state || reg.waiting?.state || 'unknown';
          setSwStatus(`Registered (${state})`);
        } else {
          setSwStatus('NOT registered');
        }
      });
    } else {
      setSwStatus('NOT supported');
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      console.log('[DEBUG] beforeinstallprompt event fired!', e);
      setEventFired(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Check if event was fired before this component mounted
    setTimeout(() => {
      if (!eventFired) {
        console.warn('[DEBUG] beforeinstallprompt has not fired yet.');
        console.warn('[DEBUG] Check Chrome DevTools:');
        console.warn('[DEBUG] 1. Open Application tab → Manifest');
        console.warn('[DEBUG] 2. Look for any errors or warnings');
        console.warn('[DEBUG] 3. Check if "Add to Home screen" is available in Chrome menu');
      }
    }, 3000);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [eventFired]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '16px',
      padding: '16px',
      background: '#ff0000',
      color: 'white',
      zIndex: 9999,
      borderRadius: '4px',
      fontSize: '11px',
      maxWidth: '350px',
      fontFamily: 'monospace'
    }}>
      <div><strong>PWA Debug Info:</strong></div>
      <div>Environment: {envMode}</div>
      <div>Service Worker: {swStatus}</div>
      <div>beforeinstallprompt: {eventFired ? 'FIRED ✓' : 'NOT FIRED ✗'}</div>
      <div>---</div>
      <div>isInstallable: {String(isInstallable)}</div>
      <div>isInstalled: {String(isInstalled)}</div>
      <div>navigator.standalone: {String((window.navigator as any).standalone)}</div>
      <div>display-mode: {window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}</div>
    </div>
  );
};
