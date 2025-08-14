import React from 'react';
import PatientsList from './PatientsList';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClinicPatients() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header con navegación */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/clinic/summary"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white">Pacientes de la Clínica</h1>
              <p className="text-sm text-gray-400">Gestiona todos los pacientes registrados en tu clínica</p>
            </div>
          </div>
        </div>
      </div>

      {/* Componente PatientsList reutilizado */}
      <PatientsList />
    </div>
  );
}
