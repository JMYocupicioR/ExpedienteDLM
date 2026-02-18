import React, { useState } from 'react';
import { Search, UserPlus, X, Check, Loader2 } from 'lucide-react';
import ClinicStaffService, { RoleInClinic } from '../../lib/services/clinic-staff-service';
import { INVITABLE_CLINIC_ROLES, CLINIC_ROLE_LABELS } from '../../lib/roles';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  onInviteSuccess: () => void;
}

interface SearchResult {
  id: string;
  full_name: string;
  email: string;
  role: string;
  specialty?: string;
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  clinicId,
  onInviteSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [selectedRoleByUserId, setSelectedRoleByUserId] = useState<Record<string, RoleInClinic>>({});
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      const results = await ClinicStaffService.searchUsers(searchTerm, clinicId);
      if (results.length === 0) {
        setError('No se encontraron usuarios con ese criterio que no estén ya en la clínica.');
      }
      setSearchResults(results);
    } catch (err: any) {
      setError('Error al buscar usuarios. Por favor intente de nuevo.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleForUser = (userId: string): RoleInClinic =>
    selectedRoleByUserId[userId] ?? 'doctor';

  const handleInvite = async (user: SearchResult) => {
    const role = getRoleForUser(user.id);
    setInvitingUserId(user.id);
    setRowErrors(prev => ({ ...prev, [user.id]: '' }));
    setError(null);

    try {
      const result = await ClinicStaffService.createUserRelationship(
        clinicId,
        user.id,
        role,
        { origin: 'invite' }
      );

      if (result.success) {
        setInvitedUsers(prev => new Set(prev).add(user.id));
        setRowErrors(prev => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
      } else {
        setRowErrors(prev => ({ ...prev, [user.id]: result.message || 'Error al invitar' }));
      }
    } catch (err) {
      setRowErrors(prev => ({ ...prev, [user.id]: 'Error inesperado al invitar' }));
    } finally {
      setInvitingUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-600" />
              Invitar Personal
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Busca usuarios por nombre o correo electrónico para añadirlos a tu clínica. Elige el rol (Médico, Administrador o Asistente administrativo) antes de invitar.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Asistente administrativo: agenda, pendientes, notas, cobro/caja y listado básico de pacientes.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por email o nombre..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                autoFocus
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <button 
                type="submit"
                disabled={isLoading || !searchTerm.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          {/* Results List */}
          <div className="space-y-4">
            {searchResults.map((user) => {
              const isInvited = invitedUsers.has(user.id);
              
              return (
                <div 
                  key={user.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                    isInvited 
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="mb-4 sm:mb-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{user.full_name || 'Sin nombre'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                    {user.specialty && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mt-1">
                        {user.specialty}
                      </span>
                    )}
                  </div>

                  {isInvited ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-lg">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Invitado</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <select
                        value={getRoleForUser(user.id)}
                        onChange={(e) =>
                          setSelectedRoleByUserId(prev => ({
                            ...prev,
                            [user.id]: e.target.value as RoleInClinic,
                          }))
                        }
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {INVITABLE_CLINIC_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {CLINIC_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleInvite(user)}
                        disabled={!!invitingUserId}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {invitingUserId === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        Invitar
                      </button>
                      {rowErrors[user.id] && (
                        <span className="text-red-500 text-xs">{rowErrors[user.id]}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {!isLoading && searchResults.length === 0 && !error && searchTerm && (
              <div className="text-center py-12 text-slate-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No se encontraron resultados para "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end">
          <button
            onClick={() => {
              onInviteSuccess();
              onClose();
            }}
            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
};
