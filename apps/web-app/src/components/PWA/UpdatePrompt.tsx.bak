import React from 'react';
import { usePWA } from '../../hooks/usePWA';

export const UpdatePrompt: React.FC = () => {
  const { updateAvailable, updateApp, dismissUpdate } = usePWA();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 bg-accent text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-sm">Update Available</h3>
          <p className="text-xs opacity-90">
            A new version of the app is ready to install
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={dismissUpdate}
            className="bg-transparent border border-white px-3 py-1 rounded text-sm font-medium hover:bg-white hover:text-accent transition-colors"
          >
            Later
          </button>
          <button
            onClick={updateApp}
            className="bg-white text-accent px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};