import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PhysicalExamTemplateDefinition, ExamQuestion } from '@/lib/database.types';

interface TemplateSection {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: TemplateQuestion[];
}

interface TemplateQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

interface PhysicalExamTemplateEditorProps {
  template?: {
    id: string;
    name: string;
    definition: PhysicalExamTemplateDefinition;
  } | null;
  doctorId: string;
  onSave: (template: any) => void;
  onClose: () => void;
}

export default function PhysicalExamTemplateEditor({
  template,
  doctorId,
  onSave,
  onClose
}: PhysicalExamTemplateEditorProps) {
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template?.definition?.sections) {
      setSections(template.definition.sections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description || '',
        order: section.order || 0,
        questions: (section.questions || []).map(q => ({
          id: q.id,
          label: q.label,
          type: q.type,
          required: q.required || false,
          placeholder: q.placeholder || '',
          options: q.options || [],
          defaultValue: q.defaultValue || ''
        }))
      })));
    } else {
      // Crear una sección inicial
      addSection();
    }
  }, [template]);

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      title: `Sección ${sections.length + 1}`,
      description: '',
      order: sections.length,
      questions: []
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  const addQuestion = (sectionId: string) => {
    const newQuestion: TemplateQuestion = {
      id: `question-${Date.now()}`,
      label: 'Nueva pregunta',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      defaultValue: ''
    };

    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, questions: [...s.questions, newQuestion] }
        : s
    ));
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
        : s
    ));
  };

  const updateQuestion = (sectionId: string, questionId: string, updates: Partial<TemplateQuestion>) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { 
            ...s, 
            questions: s.questions.map(q => 
              q.id === questionId ? { ...q, ...updates } : q
            )
          }
        : s
    ));
  };

  const handleSaveTemplate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!templateName.trim()) {
        setError('El nombre de la plantilla es requerido');
        return;
      }

      if (sections.length === 0) {
        setError('Debe agregar al menos una sección');
        return;
      }

      // Validar que cada sección tenga al menos una pregunta
      for (const section of sections) {
        if (!section.title.trim()) {
          setError(`La sección "${section.title || 'sin nombre'}" debe tener un título`);
          return;
        }
        if (section.questions.length === 0) {
          setError(`La sección "${section.title}" debe tener al menos una pregunta`);
          return;
        }
        
        // Validar preguntas
        for (const question of section.questions) {
          if (!question.label.trim()) {
            setError(`Todas las preguntas deben tener una etiqueta`);
            return;
          }
          
          if (['select', 'radio', 'checkbox'].includes(question.type) && (!question.options || question.options.length === 0)) {
            setError(`La pregunta "${question.label}" debe tener opciones`);
            return;
          }
        }
      }

      const definition: PhysicalExamTemplateDefinition = {
        version: '1.0',
        sections: sections.map(section => ({
          id: section.id,
          title: section.title,
          description: section.description || '',
          order: section.order,
          questions: section.questions.map(question => ({
            id: question.id,
            label: question.label,
            type: question.type,
            required: question.required || false,
            placeholder: question.placeholder || '',
            options: question.options || [],
            defaultValue: question.defaultValue || ''
          })) as ExamQuestion[],
        })),
      };

      console.log('Guardando plantilla con definición:', definition);

      if (template) {
        // Update existing template
        const { data, error: updateError } = await supabase
          .from('physical_exam_templates')
          .update({
            name: templateName,
            definition: definition,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)
          .eq('doctor_id', doctorId)
          .select()
          .single();

        if (updateError) throw updateError;
        onSave(data);
      } else {
        // Create new template
        const { data, error: insertError } = await supabase
          .from('physical_exam_templates')
          .insert([{
            doctor_id: doctorId,
            name: templateName,
            definition: definition,
            is_active: true,
            is_public: false
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        onSave(data);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError('Error al guardar la plantilla: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Template Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Plantilla
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Exploración Cardiovascular Completa"
            />
          </div>

          {/* Sections */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Secciones</h3>
              <button
                onClick={addSection}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Sección</span>
              </button>
            </div>

            {sections.map((section, sectionIndex) => (
              <div key={section.id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-white">Sección {sectionIndex + 1}</h4>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Título de la sección"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={section.description}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descripción opcional"
                    />
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-300">Preguntas</h5>
                    <button
                      onClick={() => addQuestion(section.id)}
                      className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Pregunta</span>
                    </button>
                  </div>

                  {section.questions.map((question) => (
                    <div key={question.id} className="bg-gray-800/50 border border-gray-600 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="text-sm font-medium text-white">Pregunta</h6>
                        <button
                          onClick={() => removeQuestion(section.id, question.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Etiqueta
                          </label>
                          <input
                            type="text"
                            value={question.label}
                            onChange={(e) => updateQuestion(section.id, question.id, { label: e.target.value })}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Texto de la pregunta"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Tipo
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(section.id, question.id, { type: e.target.value as any })}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="text">Texto</option>
                            <option value="textarea">Área de texto</option>
                            <option value="select">Selección</option>
                            <option value="radio">Radio buttons</option>
                            <option value="checkbox">Checkboxes</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={question.placeholder}
                            onChange={(e) => updateQuestion(section.id, question.id, { placeholder: e.target.value })}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Texto de ayuda"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => updateQuestion(section.id, question.id, { required: e.target.checked })}
                              className="rounded border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-700"
                            />
                            <span className="ml-2 text-xs text-gray-300">Requerido</span>
                          </label>
                        </div>
                      </div>

                      {/* Options for select, radio, checkbox */}
                      {['select', 'radio', 'checkbox'].includes(question.type) && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Opciones (una por línea)
                          </label>
                          <textarea
                            value={question.options?.join('\n') || ''}
                            onChange={(e) => updateQuestion(section.id, question.id, { 
                              options: e.target.value.split('\n').filter(opt => opt.trim()) 
                            })}
                            rows={3}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {section.questions.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No hay preguntas en esta sección
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No hay secciones. Agrega una sección para comenzar.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
              isLoading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}