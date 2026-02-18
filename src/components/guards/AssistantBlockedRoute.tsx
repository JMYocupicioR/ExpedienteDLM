/**
 * Route guard that blocks administrative_assistant from accessing clinical routes.
 * Redirects to assistant dashboard when assistant tries to access blocked content.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAssistant } from '@/hooks/useIsAssistant';

interface AssistantBlockedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export default function AssistantBlockedRoute({ children, fallbackPath = '/dashboard' }: AssistantBlockedRouteProps) {
  const { isAssistant, isLoading } = useIsAssistant();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (isAssistant) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
