import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import './index.css';
import './styles/tokens.css'; // WARM PAPER & FOREST INK v3 · scoped tokens (tk-* only, no global overrides)

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
