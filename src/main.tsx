import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './hooks/useTheme';
import { ValidationNotificationsProvider } from './components/ValidationNotification';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ValidationNotificationsProvider>
        <App />
      </ValidationNotificationsProvider>
    </ThemeProvider>
  </StrictMode>
);
