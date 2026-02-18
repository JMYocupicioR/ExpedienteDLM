import App from '@/App';
import { ValidationNotificationsProvider } from '@/components/ValidationNotification';
import { PatientAuthProvider } from '@/context/PatientAuthContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Simple console filter to reduce log spam
import './utils/simpleConsoleFilter';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ValidationNotificationsProvider>
          <PatientAuthProvider>
            <App />
          </PatientAuthProvider>
        </ValidationNotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
