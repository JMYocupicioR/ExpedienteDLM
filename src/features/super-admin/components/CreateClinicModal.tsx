import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Plus, X } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type ClinicRow = Database['public']['Tables']['clinics']['Row'];

interface CreateClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (clinic: ClinicRow) => Promise<void> | void;
}

export default function CreateClinicModal({ isOpen, onClose, onCreated }: CreateClinicModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('owner');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setAddress('');
    setAdminEmail('');
    setAdminRole('owner');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleCreateClinic = async () => {
    if (!name.trim()) {
      alert('El nombre de la clínica es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const normalizedEmail = adminEmail.trim().toLowerCase();
      const { data: clinic, error: clinicError } = await supabase.rpc('super_admin_create_clinic', {
        p_name: name.trim(),
        p_address: address.trim() || null,
        p_admin_email: normalizedEmail || null,
        p_admin_role: adminRole,
      });

      if (clinicError) throw clinicError;
      if (!clinic) throw new Error('No se pudo crear la clínica.');

      await onCreated(clinic as ClinicRow);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating clinic:', error);
      alert('No se pudo crear la clínica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#1A1F2B] border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold">Crear nueva clínica</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Nombre de la clínica</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Consultorio Central"
              className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Dirección</label>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Opcional"
              className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="border border-gray-800 rounded-lg p-4 bg-[#11151F]">
            <p className="text-sm text-gray-200 mb-3">Asignar administrador inicial (opcional)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Correo del administrador</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="doctor@clinica.com"
                  className="w-full bg-[#0F1218] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol en clínica</label>
                <select
                  value={adminRole}
                  onChange={(event) => setAdminRole(event.target.value)}
                  className="w-full bg-[#0F1218] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="owner">Owner</option>
                  <option value="director">Director</option>
                  <option value="admin_staff">Admin Staff</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreateClinic}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Creando...' : 'Crear clínica'}
          </button>
        </div>
      </div>
    </div>
  );
}
