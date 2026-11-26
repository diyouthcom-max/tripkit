import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import './index.css';
import './styles/tokens.css'; // WARM PAPER & FOREST INK v3 · scoped tokens (tk-* only, no global overrides)
import { reportClientError } from './utils/errorReporter';

window.addEventListener('error', (e) => {
  reportClientError({
    message: e.message,
    stack: e.error?.stack,
    url: location.href,
    source: 'window',
  });
});

window.addEventListener('unhandledrejection', (e) => {
  reportClientError({
    message: String(e.reason),
    url: location.href,
    source: 'rejection',
  });
});

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
