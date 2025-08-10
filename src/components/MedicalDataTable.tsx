import React from 'react';

export type PatientTableRow = {
  id: string;
  full_name: string;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
  last_consultation?: string | null;
  next_appointment?: string | null;
  consultation_count?: number | null;
};

export function PatientTable({
  patients,
  onPatientClick,
  loading
}: {
  patients: PatientTableRow[];
  onPatientClick: (patient: PatientTableRow) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-6 text-gray-300">Cargando...</div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Edad</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Teléfono</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {patients.map((p) => {
            const age = calculateAgeSafe(p.birth_date);
            return (
              <tr key={p.id} className="hover:bg-gray-800/60">
                <td className="px-4 py-3 text-sm text-white">{p.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{age ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{p.phone || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{p.email || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onPatientClick(p)}
                    className="px-3 py-1 text-sm rounded bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    Ver expediente
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function calculateAgeSafe(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}


