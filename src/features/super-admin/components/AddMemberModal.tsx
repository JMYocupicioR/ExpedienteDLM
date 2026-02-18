import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, UserPlus, X } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type RoleOption = {
  value: string;
  label: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'director', label: 'Director' },
  { value: 'admin_staff', label: 'Admin Staff' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'staff', label: 'Staff' },
  { value: 'administrative_assistant', label: 'Asistente administrativo' },
];

interface AddMemberModalProps {
  isOpen: boolean;
  clinicId: string;
  existingUserIds: string[];
  onClose: () => void;
  onMemberAdded: () => Promise<void> | void;
}

export default function AddMemberModal({
  isOpen,
  clinicId,
  existingUserIds,
  onClose,
  onMemberAdded,
}: AddMemberModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState('doctor');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [results, setResults] = useState<ProfileRow[]>([]);

  const availableResults = useMemo(
    () => results.filter((profile) => !existingUserIds.includes(profile.id)),
    [existingUserIds, results]
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedUserId(null);
      setSelectedRole('doctor');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = searchTerm.trim();

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSearching(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, created_at, updated_at, specialty, license_number, phone, schedule, clinic_id, user_role_id, specialty_id, employee_id, hire_date, is_active, profile_completed, additional_info')
          .or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
          .limit(15);

        if (error) throw error;
        setResults((data as ProfileRow[]) || []);
      } catch (error) {
        console.error('Error searching profiles:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, searchTerm]);

  const handleAddMember = async () => {
    if (!selectedUserId) {
      alert('Selecciona un usuario antes de agregarlo.');
      return;
    }

    try {
      setSubmitting(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from('clinic_user_relationships').insert({
        clinic_id: clinicId,
        user_id: selectedUserId,
        role_in_clinic: selectedRole as Database['public']['Tables']['clinic_user_relationships']['Insert']['role_in_clinic'],
        status: 'approved',
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: user?.id ?? null,
      });

      if (error) {
        if (error.code === '23505') {
          alert('Este usuario ya pertenece a esta clínica.');
          return;
        }
        throw error;
      }

      await onMemberAdded();
      onClose();
    } catch (error) {
      console.error('Error adding clinic member:', error);
      alert('No se pudo agregar el usuario a la clínica.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#1A1F2B] border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold">Agregar personal a clínica</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Buscar usuario</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Nombre o correo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-[#11151F] border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Escribe al menos 2 caracteres para buscar.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Rol en clínica</label>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-[#11151F] text-xs text-gray-400">
              Resultados de búsqueda
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
              {searching && (
                <div className="px-4 py-6 text-sm text-gray-400 text-center">
                  Buscando usuarios...
                </div>
              )}

              {!searching && availableResults.length === 0 && (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                  No hay resultados disponibles.
                </div>
              )}

              {!searching &&
                availableResults.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedUserId(profile.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedUserId === profile.id
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="text-sm text-white font-medium">
                      {profile.full_name || 'Sin nombre'}
                    </div>
                    <div className="text-xs text-gray-400">{profile.email}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAddMember}
            disabled={submitting || !selectedUserId}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white transition-colors"
          >
            {submitting ? 'Agregando...' : 'Agregar miembro'}
          </button>
        </div>
      </div>
    </div>
  );
}
