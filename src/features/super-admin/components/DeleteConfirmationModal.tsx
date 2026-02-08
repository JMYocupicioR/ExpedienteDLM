import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1A1F2B] border border-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          
          <div className="text-gray-300 text-sm mb-6 space-y-2">
            <p>{message}</p>
            {itemName && (
              <div className="font-mono bg-gray-900 p-2 rounded border border-gray-800 text-center text-red-400">
                {itemName}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4">
              Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar permanentemente'
              )}
            </button>
          </div>
        </div>
        
        {/* Progress bar for visual feedback during loading */}
        {loading && (
          <div className="h-1 w-full bg-gray-800 overflow-hidden">
            <div className="h-full bg-red-600 animate-progress origin-left"></div>
          </div>
        )}
      </div>
    </div>
  );
}
