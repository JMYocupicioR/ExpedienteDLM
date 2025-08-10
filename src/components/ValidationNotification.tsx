import React, { createContext, useContext, useState, useCallback } from 'react';

type MessageType = 'success' | 'error' | 'warning';

export type ValidationMessage = {
  id: string;
  type: MessageType;
  title?: string;
  text: string;
};

type Ctx = {
  messages: ValidationMessage[];
  addSuccess: (title: string, text: string) => void;
  addError: (title: string, text: string) => void;
  addWarning: (title: string, text: string) => void;
  removeMessage: (id: string) => void;
  clear: () => void;
};

const ValidationCtx = createContext<Ctx | null>(null);

export function useValidationNotifications(): Ctx {
  const ctx = useContext(ValidationCtx);
  if (!ctx) {
    throw new Error('useValidationNotifications must be used within <ValidationNotification>');
  }
  return ctx;
}

export default function ValidationNotification({ children }: { children?: React.ReactNode }) {
  const [messages, setMessages] = useState<ValidationMessage[]>([]);

  const add = useCallback((type: MessageType, title: string, text: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setMessages(prev => [...prev, { id, type, title, text }]);
    // Auto-hide after 5s
    setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 5000);
  }, []);

  const addSuccess = useCallback((title: string, text: string) => add('success', title, text), [add]);
  const addError = useCallback((title: string, text: string) => add('error', title, text), [add]);
  const addWarning = useCallback((title: string, text: string) => add('warning', title, text), [add]);
  const removeMessage = useCallback((id: string) => setMessages(prev => prev.filter(m => m.id !== id)), []);
  const clear = useCallback(() => setMessages([]), []);

  const value: Ctx = { messages, addSuccess, addError, addWarning, removeMessage, clear };

  return (
    <ValidationCtx.Provider value={value}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-24 right-4 z-50 space-y-2 max-w-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-md border p-3 shadow-lg text-sm ${
              m.type === 'success' ? 'bg-green-600/90 border-green-400 text-white' :
              m.type === 'error' ? 'bg-red-600/90 border-red-400 text-white' :
              'bg-yellow-600/90 border-yellow-400 text-white'
            }`}
          >
            {m.title && <div className="font-semibold mb-1">{m.title}</div>}
            <div className="flex items-start justify-between gap-3">
              <p>{m.text}</p>
              <button onClick={() => removeMessage(m.id)} className="opacity-80 hover:opacity-100">✕</button>
            </div>
          </div>
        ))}
      </div>
    </ValidationCtx.Provider>
  );
}


