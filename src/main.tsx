import App from '@/App';
import { ValidationNotificationsProvider } from '@/components/ValidationNotification';
import { ThemeProvider } from '@/hooks/useTheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ValidationNotificationsProvider>
          <App />
        </ValidationNotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
