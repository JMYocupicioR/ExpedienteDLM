import React, { useState, useEffect } from 'react';
import { Save, X, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import PhysicalExamForm from './PhysicalExamForm';
import PhysicalExamTemplates from './PhysicalExamTemplates';
import type { Database } from '../lib/database.types';

type PhysicalExamTemplate = Database['public']['Tables']['physical_exam_templates']['Row'];

interface ConsultationFormProps {
  patientId: string;
  doctorId: string;
  onClose: () => void;
  onSave: () => void;
}

interface ConsultationFormData {
  current_condition: string;
  vital_signs: {
    temperature: string;
    heart_rate: string;
    blood_pressure: string;
    respiratory_rate: string;
    oxygen_saturation: string;
    weight: string;
    height: string;
  };
  physical_examination: any;
  diagnosis: string;
  prognosis: string;
  treatment: string;
}

interface PhysicalExamFormData {
  examDate: string;
  examTime: string;
  vitalSigns: {
    systolic_pressure: string;
    diastolic_pressure: string;
    heart_rate: string;
    respiratory_rate: string;
    temperature: string;
    oxygen_saturation: string;
    weight: string;
    height: string;
    bmi: string;
  };
  sections: Record<string, any>;
  generalObservations: string;
}

export default function ConsultationForm({ patientId, doctorId, onClose, onSave }: ConsultationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PhysicalExamTemplate | null>(null);
  const [showPhysicalExam, setShowPhysicalExam] = useState(false);
  const [physicalExamData, setPhysicalExamData] = useState<PhysicalExamFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ConsultationFormData>({
    defaultValues: {
      vital_signs: {
        temperature: '',
        heart_rate: '',
        blood_pressure: '',
        respiratory_rate: '',
        oxygen_saturation: '',
        weight: '',
        height: ''
      },
      physical_examination: {},
    }
  });

  const handleTemplateSelect = (template: PhysicalExamTemplate) => {
    setSelectedTemplate(template);
    setShowPhysicalExam(true);
  };

  const handlePhysicalExamSave = async (data: PhysicalExamFormData) => {
    try {
      setPhysicalExamData(data);
      setShowPhysicalExam(false);
      
      // Update consultation form with vital signs from physical exam
      setValue('vital_signs', {
        temperature: data.vitalSigns.temperature,
        heart_rate: data.vitalSigns.heart_rate,
        blood_pressure: `${data.vitalSigns.systolic_pressure}/${data.vitalSigns.diastolic_pressure}`,
        respiratory_rate: data.vitalSigns.respiratory_rate,
        oxygen_saturation: data.vitalSigns.oxygen_saturation,
        weight: data.vitalSigns.weight,
        height: data.vitalSigns.height
      });

      // Store detailed physical examination data
      setValue('physical_examination', {
        template_id: selectedTemplate?.id,
        template_name: selectedTemplate?.name,
        exam_date: data.examDate,
        exam_time: data.examTime,
        vital_signs: data.vitalSigns,
        sections: data.sections,
        general_observations: data.generalObservations
      });

    } catch (err) {
      console.error('Error saving physical exam:', err);
      setError('Error al guardar el examen físico');
    }
  };

  const handlePhysicalExamAutoSave = async (data: PhysicalExamFormData) => {
    try {
      setAutoSaveStatus('Guardando...');
      
      // Auto-save to local storage or temporary database record
      localStorage.setItem(`physical_exam_draft_${patientId}`, JSON.stringify(data));
      
      setAutoSaveStatus('Guardado automáticamente');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (err) {
      console.error('Error in auto-save:', err);
      setAutoSaveStatus('Error en guardado automático');
    }
  };

  const onSubmit = async (data: ConsultationFormData) => {
    try {
      setLoading(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('consultations')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          current_condition: data.current_condition,
          vital_signs: data.vital_signs,
          physical_examination: data.physical_examination,
          diagnosis: data.diagnosis,
          prognosis: data.prognosis,
          treatment: data.treatment
        });

      if (insertError) throw insertError;

      // Clear auto-save draft
      localStorage.removeItem(`physical_exam_draft_${patientId}`);

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving consultation:', err);
      setError('Error al guardar la consulta');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      // This would integrate with a PDF generation library
      const consultationData = watch();
      
      // Generate PDF with jsPDF or similar library
      console.log('Generating PDF with data:', consultationData);
      
      // For now, show success message
      alert('PDF generado correctamente (funcionalidad en desarrollo)');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Error al generar el PDF');
    }
  };

  // Load auto-save draft on component mount
  useEffect(() => {
    const draft = localStorage.getItem(`physical_exam_draft_${patientId}`);
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        setPhysicalExamData(draftData);
      } catch (err) {
        console.error('Error loading draft:', err);
      }
    }
  }, [patientId]);

  if (showPhysicalExam && selectedTemplate) {
    return (
      <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Exploración Física - {selectedTemplate.name}</h2>
          <div className="flex items-center space-x-4">
            {autoSaveStatus && (
              <span className="text-sm text-gray-600">{autoSaveStatus}</span>
            )}
            <button
              onClick={() => setShowPhysicalExam(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <PhysicalExamForm
            templateId="general"
            templateName={selectedTemplate.name}
            onSave={handlePhysicalExamSave}
            onAutoSave={handlePhysicalExamAutoSave}
            initialData={physicalExamData || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Nueva Consulta</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={generatePDF}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar PDF
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Padecimiento Actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Padecimiento Actual
            </label>
            <textarea
              {...register('current_condition', { required: true })}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Describe el motivo de consulta y síntomas principales..."
            />
            {errors.current_condition && (
              <p className="mt-1 text-sm text-red-600">Este campo es requerido</p>
            )}
          </div>

          {/* Exploración Física */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Exploración Física</h3>
            
            {!selectedTemplate ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <PhysicalExamTemplates
                  onSelectTemplate={handleTemplateSelect}
                  doctorId={doctorId}
                />
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-green-800">Plantilla Seleccionada:</h4>
                    <p className="text-green-700">{selectedTemplate.name}</p>
                    {physicalExamData && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Examen físico completado - {physicalExamData.examDate} {physicalExamData.examTime}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowPhysicalExam(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      {physicalExamData ? 'Editar Examen' : 'Realizar Examen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(null);
                        setPhysicalExamData(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Cambiar Plantilla
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Signos Vitales (Read-only if physical exam completed) */}
          {physicalExamData ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Signos Vitales (del Examen Físico)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-sm text-gray-600">Presión Arterial</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {physicalExamData.vitalSigns.systolic_pressure}/{physicalExamData.vitalSigns.diastolic_pressure} mmHg
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Frecuencia Cardíaca</dt>
                  <dd className="text-sm font-medium text-gray-900">{physicalExamData.vitalSigns.heart_rate} lpm</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Temperatura</dt>
                  <dd className="text-sm font-medium text-gray-900">{physicalExamData.vitalSigns.temperature} °C</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Frecuencia Respiratoria</dt>
                  <dd className="text-sm font-medium text-gray-900">{physicalExamData.vitalSigns.respiratory_rate} rpm</dd>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Signos Vitales Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Temperatura (°C)
                  </label>
                  <input
                    type="text"
                    {...register('vital_signs.temperature')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Frecuencia Cardíaca (lpm)
                  </label>
                  <input
                    type="text"
                    {...register('vital_signs.heart_rate')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Presión Arterial (mmHg)
                  </label>
                  <input
                    type="text"
                    {...register('vital_signs.blood_pressure')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Diagnóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnóstico
            </label>
            <textarea
              {...register('diagnosis', { required: true })}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Diagnóstico principal y diferenciales..."
            />
            {errors.diagnosis && (
              <p className="mt-1 text-sm text-red-600">Este campo es requerido</p>
            )}
          </div>

          {/* Pronóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pronóstico
            </label>
            <textarea
              {...register('prognosis', { required: true })}
              rows={2}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Pronóstico esperado..."
            />
            {errors.prognosis && (
              <p className="mt-1 text-sm text-red-600">Este campo es requerido</p>
            )}
          </div>

          {/* Tratamiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tratamiento
            </label>
            <textarea
              {...register('treatment', { required: true })}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Plan de tratamiento, medicamentos, recomendaciones..."
            />
            {errors.treatment && (
              <p className="mt-1 text-sm text-red-600">Este campo es requerido</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
            disabled={loading || !selectedTemplate || !physicalExamData}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Consulta'}
          </button>
        </div>
      </form>
    </div>
  );
}