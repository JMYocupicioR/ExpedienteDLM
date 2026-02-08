import React from 'react';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { Building } from 'lucide-react';

const ClinicSwitcher: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const { userClinics, activeClinic, setActiveClinic, isLoading, error } = useClinic();

  if (isLoading) {
    return (
      <div className="p-2 text-center text-sm text-gray-400">
        {isCollapsed ? '...' : 'Cargando clínicas...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 text-center text-sm text-red-400" title={error}>
        {isCollapsed ? '!' : error || 'Error'}
      </div>
    );
  }

  const availableClinics = (userClinics || []).map(membership => membership.clinic).filter(Boolean);

  if (availableClinics.length === 0) {
    return (
      <div className="p-2 text-center text-sm text-gray-500">
        {isCollapsed ? <Building className="h-4 w-4 mx-auto" /> : 'Sin clínicas'}
      </div>
    );
  }

  if (availableClinics.length === 1) {
    return (
      <div className="p-2 flex items-center text-white truncate">
        <Building className="h-4 w-4 mr-2 flex-shrink-0" />
        {!isCollapsed && <span className="truncate">{availableClinics[0]?.name}</span>}
      </div>
    );
  }

  return (
    <div className="p-2">
      <select
        value={activeClinic?.id || ''}
        onChange={(e) => {
          const selectedClinic = availableClinics.find(c => c?.id === e.target.value);
          if (selectedClinic) {
            setActiveClinic(selectedClinic);
          }
        }}
        className={`w-full bg-gray-700 text-white border-none rounded-md text-sm focus:ring-2 focus:ring-cyan-500 ${isCollapsed ? 'p-1' : 'p-2'}`}
      >
        {availableClinics.map(clinic => (
          clinic ? <option key={clinic.id} value={clinic.id}>{clinic.name}</option> : null
        ))}
      </select>
    </div>
  );
};

export default ClinicSwitcher;
