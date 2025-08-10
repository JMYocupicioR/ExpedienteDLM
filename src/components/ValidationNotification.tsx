import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'warning';

export interface ValidationMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

type NotificationsContextValue = {
  messages: ValidationMessage[];
  addSuccess: (title: string, message: string) => void;
  addError: (title: string, message: string) => void;
  addWarning: (title: string, message: string) => void;
  removeMessage: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useValidationNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Provide a no-op fallback to avoid crashes if used outside provider
    return {
      messages: [] as ValidationMessage[],
      addSuccess: () => {},
      addError: () => {},
      addWarning: () => {},
      removeMessage: () => {}
    } as NotificationsContextValue;
  }
  return ctx;
}

export function ValidationNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ValidationMessage[]>([]);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const push = useCallback((type: NotificationType, title: string, message: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setMessages(prev => [...prev, { id, type, title, message }]);
    // Auto-dismiss after 6s
    setTimeout(() => removeMessage(id), 6000);
  }, [removeMessage]);

  const addSuccess = useCallback((title: string, message: string) => push('success', title, message), [push]);
  const addError = useCallback((title: string, message: string) => push('error', title, message), [push]);
  const addWarning = useCallback((title: string, message: string) => push('warning', title, message), [push]);

  const value = useMemo(() => ({ messages, addSuccess, addError, addWarning, removeMessage }), [messages, addSuccess, addError, addWarning, removeMessage]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export default function ValidationNotification({
  messages,
  onDismiss,
  position = 'top-right'
}: {
  messages: ValidationMessage[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}) {
  const posClass =
    position === 'top-right' ? 'top-4 right-4' :
    position === 'top-left' ? 'top-4 left-4' :
    position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4';

  return (
    <div className={`fixed z-50 ${posClass} space-y-2`}> 
      {messages.map(m => (
        <div
          key={m.id}
          className={`flex items-start space-x-2 p-3 rounded-lg border shadow-lg
          ${m.type === 'success' ? 'bg-green-900/60 border-green-700 text-green-200' : ''}
          ${m.type === 'error' ? 'bg-red-900/60 border-red-700 text-red-200' : ''}
          ${m.type === 'warning' ? 'bg-yellow-900/60 border-yellow-700 text-yellow-200' : ''}`}
        >
          <div className="text-sm">
            <span className="font-semibold mr-1">{m.title}:</span>
            <span>{m.message}</span>
          </div>
          <button className="ml-3 opacity-70 hover:opacity-100" onClick={() => onDismiss(m.id)}>×</button>
        </div>
      ))}
    </div>
  );
}


