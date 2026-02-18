import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import {
  Users,
  UserPlus,
  ArrowLeft,
  Calendar,
  UserCheck,
} from 'lucide-react';
import ClinicStaffManagement from '@/components/ClinicStaffManagement';
import StaffMemberDetail from '@/components/clinic-admin/StaffMemberDetail';
import { useClinicWorkload } from '@/hooks/useClinicWorkload';
import { format, addDays } from 'date-fns';
import type { StaffMember } from '@/lib/services/clinic-staff-service';

export default function ClinicStaff() {
  const { activeClinic } = useClinic();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const clinicId = activeClinic?.id ?? null;
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

  const { workload } = useClinicWorkload(clinicId, {
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  });

  if (!activeClinic) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una clínica para ver el personal.</p>
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
                <h1 className="text-xl font-semibold text-white">Mi Personal</h1>
                <p className="text-sm text-gray-400">Gestiona el equipo de {activeClinic.name}</p>
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
        <ClinicStaffManagement
          clinicId={activeClinic.id}
          onMemberClick={setSelectedMember}
          workloadMap={Object.fromEntries(workload.map((w) => [w.staff_id, w.appointment_count]))}
          initialStatusFilter={tab === 'pending' ? 'pending' : undefined}
        />
      </div>

      {selectedMember && (
        <StaffMemberDetail
          member={selectedMember}
          clinicId={activeClinic.id}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
