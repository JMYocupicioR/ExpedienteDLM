import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PhysicalExamTemplate = Database['public']['Tables']['physical_exam_templates']['Row'];

interface PhysicalExamTemplatesProps {
  onSelectTemplate: (template: PhysicalExamTemplate) => void;
  doctorId: string;
}

// Pre-defined templates
const defaultTemplates = {
  general: {
    name: 'Exploración Física General',
    fields: {
      cabeza: { label: 'Cabeza', type: 'textarea' },
      cuello: { label: 'Cuello', type: 'textarea' },
      torax: { label: 'Tórax', type: 'textarea' },
      abdomen: { label: 'Abdomen', type: 'textarea' },
      miembrosSuperiores: { label: 'Miembros Superiores', type: 'textarea' },
      miembrosInferiores: { label: 'Miembros Inferiores', type: 'textarea' },
      genitales: { label: 'Genitales', type: 'textarea' }
    }
  },
  musculoskeletal: {
    name: 'Exploración Musculoesquelética',
    fields: {
      marcha: { label: 'Marcha', type: 'textarea' },
      columnaCervical: { label: 'Columna Cervical', type: 'textarea' },
      columnaLumbar: { label: 'Columna Lumbar', type: 'textarea' },
      hombros: { label: 'Hombros', type: 'textarea' },
      codos: { label: 'Codos', type: 'textarea' },
      carpoManos: { label: 'Carpo y Manos', type: 'textarea' },
      caderas: { label: 'Caderas', type: 'textarea' },
      rodillas: { label: 'Rodillas', type: 'textarea' },
      tobillos: { label: 'Tobillos', type: 'textarea' }
    }
  },
  neurological: {
    name: 'Exploración Neurológica',
    fields: {
      estadoMental: { label: 'Estado Mental y Funciones Mentales Superiores', type: 'textarea' },
      paresCraneales: { label: 'Pares Craneales', type: 'textarea' },
      marcha: { label: 'Marcha', type: 'textarea' },
      extremidadesSuperiores: { label: 'Extremidades Superiores', type: 'textarea' },
      extremidadesInferiores: { label: 'Extremidades Inferiores', type: 'textarea' }
    }
  }
};

export default function PhysicalExamTemplates({ onSelectTemplate, doctorId }: PhysicalExamTemplatesProps) {
  const [templates, setTemplates] = useState<PhysicalExamTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    fields: {} as Record<string, { label: string; type: string }>
  });
  const [newField, setNewField] = useState({ name: '', label: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [doctorId]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('physical_exam_templates')
        .select('*')
        .eq('doctor_id', doctorId);

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefaultTemplate = async (type: keyof typeof defaultTemplates) => {
    try {
      const template = defaultTemplates[type];
      const { error } = await supabase
        .from('physical_exam_templates')
        .insert({
          doctor_id: doctorId,
          name: template.name,
          fields: template.fields
        });

      if (error) throw error;
      fetchTemplates();
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Error al crear la plantilla');
    }
  };

  const handleAddField = () => {
    if (!newField.name || !newField.label) return;
    
    setNewTemplate(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [newField.name]: { label: newField.label, type: 'textarea' }
      }
    }));
    setNewField({ name: '', label: '' });
  };

  const handleRemoveField = (fieldName: string) => {
    const { [fieldName]: _, ...remainingFields } = newTemplate.fields;
    setNewTemplate(prev => ({
      ...prev,
      fields: remainingFields
    }));
  };

  const handleSaveTemplate = async () => {
    try {
      if (!newTemplate.name || Object.keys(newTemplate.fields).length === 0) {
        setError('Por favor complete todos los campos requeridos');
        return;
      }

      const { error } = await supabase
        .from('physical_exam_templates')
        .insert({
          doctor_id: doctorId,
          name: newTemplate.name,
          fields: newTemplate.fields
        });

      if (error) throw error;
      
      setIsCreating(false);
      setNewTemplate({ name: '', fields: {} });
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Error al guardar la plantilla');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('physical_exam_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Error al eliminar la plantilla');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Template Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div key={template.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => onSelectTemplate(template)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {Object.entries(template.fields as Record<string, { label: string }>).map(([key, value]) => (
                <div key={key} className="mb-1">• {value.label}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Default Templates */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Plantillas Predefinidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleCreateDefaultTemplate('general')}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h4 className="font-medium text-gray-900">Exploración Física General</h4>
            <p className="text-sm text-gray-600 mt-1">
              Incluye evaluación de cabeza, cuello, tórax, abdomen y extremidades
            </p>
          </button>
          <button
            onClick={() => handleCreateDefaultTemplate('musculoskeletal')}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h4 className="font-medium text-gray-900">Exploración Musculoesquelética</h4>
            <p className="text-sm text-gray-600 mt-1">
              Evaluación completa del sistema musculoesquelético
            </p>
          </button>
          <button
            onClick={() => handleCreateDefaultTemplate('neurological')}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h4 className="font-medium text-gray-900">Exploración Neurológica</h4>
            <p className="text-sm text-gray-600 mt-1">
              Evaluación neurológica detallada
            </p>
          </button>
        </div>
      </div>

      {/* Create Custom Template */}
      {!isCreating ? (
        <div className="flex justify-center pt-6">
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear Plantilla Personalizada
          </button>
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-white mt-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Nueva Plantilla Personalizada</h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la Plantilla
              </label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campos de la Exploración
              </label>
              
              <div className="space-y-4">
                {Object.entries(newTemplate.fields).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-900">{value.label}</span>
                    <button
                      onClick={() => handleRemoveField(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="ID del campo"
                      value={newField.name}
                      onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Etiqueta del campo"
                      value={newField.label}
                      onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleAddField}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                  >
                    Agregar Campo
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveTemplate}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-5 w-5 mr-2" />
                Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}