import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import AdminPatientsPanel from '@/components/clinic-admin/AdminPatientsPanel';

export default function ClinicPatients() {
  const { activeClinic } = useClinic();

  if (!activeClinic) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una clínica para ver los pacientes.</p>
          <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
            Ir al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/clinic/dashboard"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Pacientes de la Clínica</h1>
                <p className="text-sm text-gray-400">
                  Gestiona los pacientes de {activeClinic.name}
                </p>
              </div>
            </div>
            <Link
              to="/clinic/dashboard"
              className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center"
            >
              Panel Admin
              <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminPatientsPanel />
      </div>
    </div>
  );
}
