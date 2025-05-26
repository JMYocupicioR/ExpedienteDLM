import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PhysicalExamTemplateDefinition } from '../lib/database.types';

interface PhysicalExamTemplate {
  id: string;
  name: string;
  doctor_id: string;
  definition: PhysicalExamTemplateDefinition;
  created_at: string;
  is_active: boolean;
}

interface PhysicalExamTemplatesProps {
  onSelectTemplate: (template: PhysicalExamTemplate) => void;
  doctorId: string;
}

export default function PhysicalExamTemplates({ onSelectTemplate, doctorId }: PhysicalExamTemplatesProps) {
  const [templates, setTemplates] = useState<PhysicalExamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [doctorId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('physical_exam_templates')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setTemplates(data || []);

    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-400 mb-4">No hay plantillas disponibles</p>
        <button
          onClick={() => onSelectTemplate({
            id: 'new',
            name: 'Nueva Plantilla',
            doctor_id: doctorId,
            definition: {
              sections: [],
              version: '1.0'
            },
            created_at: new Date().toISOString(),
            is_active: true
          })}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Nueva Plantilla
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">Plantillas Disponibles</h3>
        <button
          onClick={() => onSelectTemplate({
            id: 'new',
            name: 'Nueva Plantilla',
            doctor_id: doctorId,
            definition: {
              sections: [],
              version: '1.0'
            },
            created_at: new Date().toISOString(),
            is_active: true
          })}
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-white font-medium">{template.name}</h4>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(template);
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Implementar lógica de eliminación
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              <p>{template.definition?.sections?.length || 0} secciones</p>
              <p className="text-xs mt-1">
                Creada: {new Date(template.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}