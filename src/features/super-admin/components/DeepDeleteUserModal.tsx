import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { UserProfileInfo } from './SuperAdminUserList';

interface DeepDeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileInfo | null;
  onSuccess: () => void;
}

export default function DeepDeleteUserModal({ isOpen, onClose, user, onSuccess }: DeepDeleteUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== user.email) {
      alert('El texto de confirmación no coincide con el correo del usuario.');
      return;
    }

    try {
      setLoading(true);
      // Calls the RPC we created in the migration
      const { error } = await supabase.rpc('super_admin_delete_user', {
        user_uuid: user.id
      });

      if (error) throw error;
      
      onSuccess();
      onClose();
      setConfirmText('');
    } catch (error) {
      console.error('Error performing deep delete:', error);
      alert('Error crítico al intentar borrar al usuario. Posiblemente no existan los permisos adecuados en la base de datos o hubo un fallo de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1F2B] border border-red-900/50 rounded-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl shadow-red-900/20">
        <div className="flex justify-between items-center p-4 border-b border-red-900/30 bg-red-950/20">
          <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Zona de Peligro: Borrado Permanente
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 text-red-200 text-sm leading-relaxed">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400 mb-1">¡Esta acción es irreversible!</p>
              Estás a punto de borrar por completo a <span className="font-bold text-white">{user.full_name || user.email}</span>. 
              Esto eliminará su acceso y todos los registros asociados en la plataforma (clínicas, pacientes, historiales médicos). 
              El usuario podrá volver a registrar el correo desde cero si así lo desea.
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Para confirmar, escribe el correo del usuario: <br/>
              <span className="text-white font-mono bg-black/50 px-2 py-1 rounded inline-block mt-1">{user.email}</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              required
              className="w-full bg-[#0F1218] border border-red-900/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder={user.email}
              autoComplete="off"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors w-full sm:w-auto text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || confirmText !== user.email}
              className="px-4 py-3 sm:py-2 bg-red-600/90 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Eliminando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Eliminar Todo
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
