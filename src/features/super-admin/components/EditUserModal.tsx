import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, User as UserIcon } from 'lucide-react';
import { UserProfileInfo } from './SuperAdminUserList';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileInfo | null;
  onSuccess: () => void;
}

export default function EditUserModal({ isOpen, onClose, user, onSuccess }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('active');
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [clinicId, setClinicId] = useState('');
  const [isNewClinic, setIsNewClinic] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');

  useEffect(() => {
    const fetchClinics = async () => {
      const { data } = await supabase.from('clinics').select('id, name').order('name');
      if (data) setClinics(data);
    };
    if (isOpen) fetchClinics();
  }, [isOpen]);

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.full_name || '');
      setRole(user.role || 'doctor');
      setStatus(user.status || 'active');
      setClinicId(user.clinic_id || '');
      setIsNewClinic(false);
      setNewClinicName('');
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      
      let finalClinicId = clinicId;
      const needsClinic = ['doctor', 'administrator', 'administrative_assistant', 'assistant', 'nurse', 'therapist'].includes(role);

      if (needsClinic && isNewClinic && newClinicName.trim()) {
        const { data: newClinic, error: clinicError } = await supabase
          .from('clinics')
          .insert([{ name: newClinicName.trim(), type: 'Consultorio', is_active: true }])
          .select()
          .single();
        
        if (clinicError) throw clinicError;
        if (newClinic) finalClinicId = newClinic.id;
      }

      if (!needsClinic) {
        finalClinicId = '';
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role: role,
          status: status,
          clinic_id: finalClinicId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar el usuario. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1F2B] border border-gray-800 rounded-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-cyan-400" />
            Editar Información
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Correo Electrónico (No editable)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Ej. Dr. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Rol del Sistema
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                required
              >
                <option value="doctor">Médico / Doctor</option>
                <option value="patient">Paciente</option>
                <option value="administrator">Administrador de Clínica</option>
                <option value="administrative_assistant">Asistente Administrativo</option>
                <option value="assistant">Asistente / Recepcionista</option>
                <option value="nurse">Enfermero/a</option>
                <option value="therapist">Terapeuta</option>
                <option value="super_admin">Super Administrador</option>
              </select>
            </div>

            {['doctor', 'administrator', 'administrative_assistant', 'assistant', 'nurse', 'therapist'].includes(role) && (
              <div className="space-y-3 bg-gray-800/30 p-4 rounded-lg border border-gray-800">
                <label className="block text-sm font-medium text-gray-300">
                  Clínica / Consultorio Asignado
                </label>
                
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="clinic_mode"
                      checked={!isNewClinic}
                      onChange={() => setIsNewClinic(false)}
                      className="text-cyan-500 bg-[#0F1218] border-gray-700"
                    />
                    <span className="text-sm text-gray-400">Seleccionar existente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="clinic_mode"
                      checked={isNewClinic}
                      onChange={() => setIsNewClinic(true)}
                      className="text-cyan-500 bg-[#0F1218] border-gray-700"
                    />
                    <span className="text-sm text-gray-400">Crear nueva clínica</span>
                  </label>
                </div>

                {!isNewClinic ? (
                  <select
                    value={clinicId}
                    onChange={(e) => setClinicId(e.target.value)}
                    className="w-full bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="">Selecciona una clínica...</option>
                    {clinics.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newClinicName}
                    onChange={(e) => setNewClinicName(e.target.value)}
                    placeholder="Nombre de la nueva clínica"
                    className="w-full bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Estado de la Cuenta
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0F1218] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                required
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>
            
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Guardando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
