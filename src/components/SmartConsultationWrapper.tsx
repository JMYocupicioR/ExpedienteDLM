import React from 'react';
import { useConsultationConfig } from '@/features/medical-templates/hooks/useConsultationConfig';
import ConsultationForm from './ConsultationForm';

interface SmartConsultationWrapperProps {
  patientId: string;
  patientName: string;
  doctorId: string; // Add doctorId to props
  onClose: () => void;
  onSave: (data: any) => Promise<string | void> | string | void;
}

export default function SmartConsultationWrapper({ 
  patientId, 
  patientName,
  doctorId, 
  onClose, 
  onSave 
}: SmartConsultationWrapperProps) {
  const { config, loading } = useConsultationConfig();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-gray-300">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  // Here we can add logic to decide if we show a wizard first, 
  // or pre-fill data based on 'last_visit' mode, etc.
  // For now, we just pass the config to the form.

  return (
    <ConsultationForm
      patientId={patientId}
      patientName={patientName}
      doctorId={doctorId}
      onClose={onClose}
      onSave={onSave}
      config={config} // We will need to update ConsultationForm to accept this prop
    />
  );
}
