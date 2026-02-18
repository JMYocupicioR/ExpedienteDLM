import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Users,
  Clock,
  ArrowRight,
  FileText,
  Bell,
} from 'lucide-react';

export interface AdminAlert {
  id: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  count?: number;
  actionUrl?: string;
  actionLabel?: string;
}

interface AdminAlertsPanelProps {
  alerts: AdminAlert[];
  isLoading?: boolean;
}

export default function AdminAlertsPanel({ alerts, isLoading }: AdminAlertsPanelProps) {
  if (alerts.length === 0 && !isLoading) return null;

  const getIcon = (type: AdminAlert['type']) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      default:
        return <Bell className="h-5 w-5 text-cyan-400" />;
    }
  };

  const getBorderColor = (type: AdminAlert['type']) => {
    switch (type) {
      case 'danger':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-amber-500';
      default:
        return 'border-l-cyan-500';
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
        <Bell className="h-6 w-6 mr-3 text-cyan-400" />
        Alertas Operativas
      </h2>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 bg-gray-700 rounded-lg border-l-4 ${getBorderColor(alert.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getIcon(alert.type)}
                  <div>
                    <h3 className="font-medium text-white">
                      {alert.title}
                      {alert.count !== undefined && alert.count > 0 && (
                        <span className="ml-2 text-gray-400">({alert.count})</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{alert.description}</p>
                  </div>
                </div>
                {alert.actionUrl && (
                  <Link
                    to={alert.actionUrl}
                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 shrink-0"
                  >
                    {alert.actionLabel || 'Ver'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
