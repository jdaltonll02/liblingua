import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentry } from './utils/sentry';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
