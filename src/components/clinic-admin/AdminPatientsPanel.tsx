import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Calendar,
  UserCheck,
  Mail,
  Phone,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useAdminPatients } from '@/hooks/useAdminPatients';
import { useQuery } from '@tanstack/react-query';
import ClinicStaffService from '@/lib/services/clinic-staff-service';
import NewPatientForm from '@/features/patients/components/NewPatientForm';

export default function AdminPatientsPanel() {
  const navigate = useNavigate();
  const { activeClinic } = useClinic();
  const clinicId = activeClinic?.id ?? null;
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'all' | 'new' | 'active' | 'noFollowUp' | 'inactive'>('all');
  const [primaryDoctorId, setPrimaryDoctorId] = useState<string | ''>('');
  const [showNewPatient, setShowNewPatient] = useState(false);

  const { patients, stats, isLoading } = useAdminPatients(clinicId, {
    search: search || undefined,
    primaryDoctorId: primaryDoctorId || undefined,
    segment,
  });

  const staffQuery = useQuery({
    queryKey: ['clinic-staff-approved', clinicId],
    queryFn: () =>
      clinicId ? ClinicStaffService.getApprovedStaff(clinicId) : Promise.resolve([]),
    enabled: Boolean(clinicId),
  });
  const staffList = staffQuery.data ?? [];

  const handlePatientCreated = (newPatient: { id: string }) => {
    setShowNewPatient(false);
    navigate(`/expediente/${newPatient.id}`);
  };

  if (!clinicId) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Selecciona una clínica para ver los pacientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Pacientes</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Nuevos este mes</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats?.newThisMonth ?? 0}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as any)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">Todos</option>
              <option value="new">Nuevos (este mes)</option>
              <option value="active">Activos</option>
              <option value="noFollowUp">Sin cita próxima</option>
              <option value="inactive">Inactivos +30 días</option>
            </select>
            <select
              value={primaryDoctorId}
              onChange={(e) => setPrimaryDoctorId(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Todos los responsables</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewPatient(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo paciente
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No se encontraron pacientes con los filtros aplicados</p>
            <button
              onClick={() => setShowNewPatient(true)}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              Agregar primer paciente
            </button>
          </div>
        ) : (
          patients.map((patient: any) => (
            <div
              key={patient.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors flex items-center justify-between"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/expediente/${patient.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(patient.full_name || '')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{patient.full_name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      {patient.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {patient.email}
                        </span>
                      )}
                      {patient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={`/citas?patient=${patient.id}`}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-cyan-400 transition-colors"
                  title="Crear cita"
                >
                  <Calendar className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => navigate(`/expediente/${patient.id}`)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                  title="Ver expediente"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showNewPatient && (
        <NewPatientForm
          isOpen={showNewPatient}
          onClose={() => setShowNewPatient(false)}
          onSave={handlePatientCreated}
        />
      )}
    </div>
  );
}
