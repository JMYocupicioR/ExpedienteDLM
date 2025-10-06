import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { formatShortcut, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

export default function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  shortcuts = []
}: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  // Shortcuts globales predefinidos
  const globalShortcuts = [
    { key: 'h', ctrlKey: true, description: 'Ir al inicio' },
    { key: '/', ctrlKey: true, description: 'Mostrar/ocultar ayuda' },
    { key: 'Escape', description: 'Cerrar modal' }
  ];

  // Combinar shortcuts globales con los específicos del contexto
  const allShortcuts = [...shortcuts, ...globalShortcuts.filter(
    global => !shortcuts.some(s => s.key === global.key && s.ctrlKey === global.ctrlKey)
  )];

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-700 shadow-2xl animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Keyboard className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Atajos de Teclado</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {allShortcuts.length > 0 ? (
            allShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-300 font-medium">{shortcut.description}</span>
                <kbd className="px-3 py-1.5 bg-gray-900 text-cyan-400 rounded-md text-sm font-mono border border-gray-600 shadow-inner">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Keyboard className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No hay atajos disponibles en esta vista</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Tip: Los atajos funcionan en cualquier parte de la aplicación
            </p>
            <p className="text-xs text-gray-500">
              Presiona <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-cyan-400 font-mono">Esc</kbd> para cerrar
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
}
