import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary';

window.onerror = function (message, source, lineno, colno, error) {
  document.body.innerHTML = `
    <div style="color: red; padding: 20px; font-family: monospace; background: #fff;">
      <h1>Global Error Caught</h1>
      <p><strong>Message:</strong> ${message}</p>
      <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
      <pre>${error?.stack || 'No stack trace'}</pre>
    </div>
  `;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
