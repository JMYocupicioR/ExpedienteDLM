import App from '@/App';
import { ValidationNotificationsProvider } from '@/components/ValidationNotification';
import { ThemeProvider } from '@/hooks/useTheme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ValidationNotificationsProvider>
        <App />
      </ValidationNotificationsProvider>
    </ThemeProvider>
  </StrictMode>
);
