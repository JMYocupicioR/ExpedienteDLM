import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
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
  physical_examination: Record<string, string>;
  diagnosis: string;
  prognosis: string;
  treatment: string;
}

export default function ConsultationForm({ patientId, doctorId, onClose, onSave }: ConsultationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PhysicalExamTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Initialize physical examination fields based on template
    const fields = template.fields as Record<string, { label: string }>;
    Object.keys(fields).forEach(key => {
      setValue(`physical_examination.${key}`, '');
    });
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
          physical_examination: {
            template_id: selectedTemplate?.id,
            template_name: selectedTemplate?.name,
            values: data.physical_examination
          },
          diagnosis: data.diagnosis,
          prognosis: data.prognosis,
          treatment: data.treatment
        });

      if (insertError) throw insertError;

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving consultation:', err);
      setError('Error al guardar la consulta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-auto">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Nueva Consulta</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
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
            />
            {errors.current_condition && (
              <p className="mt-1 text-sm text-red-600">Este campo es requerido</p>
            )}
          </div>

          {/* Signos Vitales */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Signos Vitales</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Frecuencia Respiratoria (rpm)
                </label>
                <input
                  type="text"
                  {...register('vital_signs.respiratory_rate')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Saturación de Oxígeno (%)
                </label>
                <input
                  type="text"
                  {...register('vital_signs.oxygen_saturation')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Peso (kg)
                </label>
                <input
                  type="text"
                  {...register('vital_signs.weight')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Altura (cm)
                </label>
                <input
                  type="text"
                  {...register('vital_signs.height')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Exploración Física */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Exploración Física</h3>
            <PhysicalExamTemplates
              onSelectTemplate={handleTemplateSelect}
              doctorId={doctorId}
            />

            {selectedTemplate && (
              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-gray-900">
                  {selectedTemplate.name}
                </h4>
                {Object.entries(selectedTemplate.fields as Record<string, { label: string }>).map(([key, field]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <textarea
                      {...register(`physical_examination.${key}`)}
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diagnóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnóstico
            </label>
            <textarea
              {...register('diagnosis', { required: true })}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Consulta'}
          </button>
        </div>
      </form>
    </div>
  );
}