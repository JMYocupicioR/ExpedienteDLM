import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

export interface ValidationMessage {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  field?: string;
  autoHide?: boolean;
  duration?: number;
}

interface ValidationNotificationProps {
  messages: ValidationMessage[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ValidationNotification: React.FC<ValidationNotificationProps> = ({
  messages,
  onDismiss,
  position = 'top-right'
}) => {
  const [visibleMessages, setVisibleMessages] = useState<ValidationMessage[]>([]);

  useEffect(() => {
    setVisibleMessages(messages);

    // Auto-hide messages if specified
    messages.forEach(message => {
      if (message.autoHide !== false) {
        const duration = message.duration || (message.type === 'error' ? 8000 : 5000);
        setTimeout(() => {
          onDismiss(message.id);
        }, duration);
      }
    });
  }, [messages, onDismiss]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getMessageIcon = (type: ValidationMessage['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-400" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getMessageStyles = (type: ValidationMessage['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-900/90 border-red-700 text-red-100';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-700 text-yellow-100';
      case 'success':
        return 'bg-green-900/90 border-green-700 text-green-100';
      case 'info':
        return 'bg-blue-900/90 border-blue-700 text-blue-100';
      default:
        return 'bg-gray-900/90 border-gray-700 text-gray-100';
    }
  };

  if (visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full space-y-2`}>
      {visibleMessages.map((message) => (
        <div
          key={message.id}
          className={`rounded-lg border backdrop-blur-sm shadow-lg p-4 transition-all duration-300 ${getMessageStyles(message.type)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getMessageIcon(message.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium">
                {message.title}
                {message.field && (
                  <span className="text-xs opacity-80 ml-1">({message.field})</span>
                )}
              </h4>
              <p className="text-sm opacity-90 mt-1">{message.message}</p>
            </div>
            <button
              onClick={() => onDismiss(message.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper hook for managing validation notifications
export function useValidationNotifications() {
  const [messages, setMessages] = useState<ValidationMessage[]>([]);

  const addMessage = (
    type: ValidationMessage['type'],
    title: string,
    message: string,
    options: {
      field?: string;
      autoHide?: boolean;
      duration?: number;
    } = {}
  ) => {
    const newMessage: ValidationMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      ...options
    };

    setMessages(prev => [...prev, newMessage]);
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearAll = () => {
    setMessages([]);
  };

  const addError = (title: string, message: string, field?: string) => {
    addMessage('error', title, message, { field, autoHide: false });
  };

  const addWarning = (title: string, message: string, field?: string) => {
    addMessage('warning', title, message, { field, duration: 6000 });
  };

  const addSuccess = (title: string, message: string, field?: string) => {
    addMessage('success', title, message, { field, duration: 4000 });
  };

  const addInfo = (title: string, message: string, field?: string) => {
    addMessage('info', title, message, { field, duration: 5000 });
  };

  // Validation-specific helpers
  const addValidationErrors = (errors: string[], field?: string) => {
    errors.forEach(error => {
      addError('Error de Validación', error, field);
    });
  };

  const addValidationWarnings = (warnings: string[], field?: string) => {
    warnings.forEach(warning => {
      addWarning('Advertencia de Validación', warning, field);
    });
  };

  return {
    messages,
    addMessage,
    removeMessage,
    clearAll,
    addError,
    addWarning,
    addSuccess,
    addInfo,
    addValidationErrors,
    addValidationWarnings
  };
}

export default ValidationNotification; 