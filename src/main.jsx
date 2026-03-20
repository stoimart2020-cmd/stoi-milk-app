import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary';

window.onerror = function (message, source, lineno, colno, error) {
  // Ignore cross-origin "Script error." from external scripts (e.g. MSG91, Firebase, analytics)
  // Browsers mask error details from third-party scripts for security reasons — these are harmless.
  if (message === 'Script error.' || (!source && lineno === 0 && colno === 0)) {
    console.warn('[Ignored] Cross-origin script error (likely from an external SDK)');
    return true; // Prevents default browser error logging
  }

  // For real app errors, log to console; only show overlay in dev
  console.error('Global Error:', { message, source, lineno, colno, error });
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="color: red; padding: 20px; font-family: monospace; background: #fff;">
        <h1>Global Error Caught</h1>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre>${error?.stack || 'No stack trace'}</pre>
      </div>
    `;
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
