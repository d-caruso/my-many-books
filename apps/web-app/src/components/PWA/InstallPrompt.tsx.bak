import React from 'react';
import { usePWA } from '../../hooks/usePWA';

export const InstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-primary-500 text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-sm">Install App</h3>
          <p className="text-xs opacity-90">
            Add My Many Books to your home screen for quick access
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={installApp}
            className="bg-white text-primary-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};