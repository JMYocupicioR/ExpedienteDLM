import React from 'react';
import ConsultationForm from '@/components/ConsultationForm';

export default function ConsultationModal({
  isOpen,
  onClose,
  patientId
}: {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">Nueva Consulta</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">×</button>
        </div>
        <div className="p-4">
          <ConsultationForm patientId={patientId} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}


