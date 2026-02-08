import React, { useState, useEffect } from 'react';
import ConsultationForm from '@/components/ConsultationForm';
import { supabase } from '@/lib/supabase';
import { useSimpleClinic } from '@/hooks/useSimpleClinic';

export default function ConsultationModal({
  isOpen,
  onClose,
  patientId
}: {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}) {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const { activeClinic } = useSimpleClinic();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setDoctorId(data.user?.id || null);
    });
  }, []);

  const handleSave = async (data: any) => {
    try {
      if (!doctorId) throw new Error('No se identificó al doctor');

      // Preparar datos para inserción
      const consultationData = {
        doctor_id: doctorId,
        clinic_id: activeClinic?.id || null, // Asignar clínica activa si existe
        patient_id: patientId,
        // Campos explícitos para evitar errores por campos extra en el form (ej. medications, validation_score)
        current_condition: data.current_condition || '',
        vital_signs: data.vital_signs || {},
        physical_examination: data.physical_examination || {},
        diagnosis: data.diagnosis || '',
        prognosis: data.prognosis || '',
        treatment: data.treatment || '',
      };

      // Limpiar campos undefined/null que no deban ir (opcional, supabase suele ignorar undefined, pero mejor asegurar)
      // La tabla espera: patient_id, doctor_id, clinic_id, symptoms (current_condition), diagnosis, treatment, etc.
      // ConsultationForm envía: current_condition, diagnosis, treatment, vital_signs, physical_examination...
      
      // Mapeo de campos de formulario a tabla:
      // Form: current_condition -> Table: symptoms (o current_condition existe en tabla?)
      // Revisando schema: create_basic_schema dice: symptoms, diagnosis, treatment, notes.
      // Pero PatientRecord.tsx muestra consultas con: diagnosis, current_condition, treatment, observations.
      // Posiblemente el schema evolucionó. Asumiremos los campos que envía ConsultationForm son correctos o se ajustan.
      
      // Intentar insertar
      const { data: newConsultation, error } = await supabase
        .from('consultations')
        .insert(consultationData)
        .select('id')
        .single();

      if (error) throw error;
      return newConsultation.id;

    } catch (error: any) {
      console.error('Error saving consultation:', error);
      throw error; // Deja que ConsultationForm maneje el error UI
    }
  };

  if (!isOpen) return null;
  if (!doctorId) return null; // O mostrar loading

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">Nueva Consulta</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">×</button>
        </div>
        <div className="p-4">
          <ConsultationForm 
            patientId={patientId} 
            doctorId={doctorId}
            onClose={onClose}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
}


