import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { i18nReady } from './i18n';

// Defer rendering until i18n is initialized so translations are available
// on the first React render — eliminates the mount→useEffect→reinit cycle.
// Translations are preloaded via <link rel="preload"> in index.html, so they
// hit the browser cache and i18nReady resolves with minimal delay.
void i18nReady.catch(() => {}).then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  reportWebVitals();
});
