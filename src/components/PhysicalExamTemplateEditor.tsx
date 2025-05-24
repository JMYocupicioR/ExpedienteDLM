import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, GripVertical, Copy, Eye, FileText, Edit } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PhysicalExamTemplate = Database['public']['Tables']['physical_exam_templates']['Row'];

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  fields: TemplateField[];
  order: number;
}

interface PhysicalExamTemplateEditorProps {
  template?: PhysicalExamTemplate | null;
  doctorId: string;
  onSave: (template: PhysicalExamTemplate) => void;
  onClose: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'checkbox', label: 'Casillas de verificación' },
  { value: 'radio', label: 'Opción única' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' }
];

const SYSTEM_TEMPLATES = {
  cardiovascular: {
    title: 'Sistema Cardiovascular',
    fields: [
      { id: 'heart_rate', label: 'Frecuencia Cardíaca', type: 'number' as const, placeholder: 'lpm' },
      { id: 'blood_pressure', label: 'Presión Arterial', type: 'text' as const, placeholder: '120/80 mmHg' },
      { id: 'heart_sounds', label: 'Ruidos Cardíacos', type: 'textarea' as const },
      { id: 'pulses', label: 'Pulsos Periféricos', type: 'checkbox' as const, options: ['Radial', 'Femoral', 'Poplíteo', 'Tibial', 'Pedio'] }
    ]
  },
  respiratory: {
    title: 'Sistema Respiratorio',
    fields: [
      { id: 'respiratory_rate', label: 'Frecuencia Respiratoria', type: 'number' as const, placeholder: 'rpm' },
      { id: 'lung_sounds', label: 'Ruidos Pulmonares', type: 'select' as const, options: ['Normal', 'Estertores', 'Sibilancias', 'Roncus'] },
      { id: 'chest_expansion', label: 'Expansión Torácica', type: 'radio' as const, options: ['Normal', 'Disminuida', 'Asimétrica'] },
      { id: 'observations', label: 'Observaciones', type: 'textarea' as const }
    ]
  },
  neurological: {
    title: 'Sistema Neurológico',
    fields: [
      { id: 'mental_status', label: 'Estado Mental', type: 'select' as const, options: ['Alerta', 'Somnoliento', 'Estuporoso', 'Comatoso'] },
      { id: 'cranial_nerves', label: 'Pares Craneales', type: 'textarea' as const },
      { id: 'reflexes', label: 'Reflejos', type: 'textarea' as const },
      { id: 'gait', label: 'Marcha', type: 'text' as const }
    ]
  }
};

export default function PhysicalExamTemplateEditor({
  template,
  doctorId,
  onSave,
  onClose
}: PhysicalExamTemplateEditorProps) {
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateType, setTemplateType] = useState('general');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<{ sectionId: string; field?: TemplateField } | null>(null);

  // Field editor state
  const [fieldForm, setFieldForm] = useState<TemplateField>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    defaultValue: '',
    helpText: ''
  });

  useEffect(() => {
    if (template?.fields) {
      // Parse existing template fields into sections
      const parsedSections = parseTemplateFields(template.fields);
      setSections(parsedSections);
    }
  }, [template]);

  const parseTemplateFields = (fields: any): TemplateSection[] => {
    // Convert old format to new section-based format
    if (Array.isArray(fields)) {
      return [{
        id: 'main',
        title: 'Exploración General',
        fields: fields as TemplateField[],
        order: 0
      }];
    }
    
    // Handle object format
    const sections: TemplateSection[] = [];
    Object.entries(fields).forEach(([key, value]: [string, any], index) => {
      if (typeof value === 'object' && value.fields) {
        sections.push({
          id: key,
          title: value.title || key,
          description: value.description,
          fields: (value.fields || []) as TemplateField[],
          order: index
        });
      }
    });
    
    return sections.length > 0 ? sections : [{
      id: 'main',
      title: 'Exploración General',
      fields: [],
      order: 0
    }];
  };

  const handleAddSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: 'Nueva Sección',
      fields: [],
      order: sections.length
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const handleAddField = (sectionId: string) => {
    setEditingField({ sectionId });
    setFieldForm({
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      defaultValue: '',
      helpText: ''
    });
    setShowFieldEditor(true);
  };

  const handleEditField = (sectionId: string, field: TemplateField) => {
    setEditingField({ sectionId, field });
    setFieldForm(field);
    setShowFieldEditor(true);
  };

  const handleSaveField = () => {
    if (!editingField) return;

    const { sectionId, field } = editingField;
    
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        if (field) {
          // Update existing field
          return {
            ...section,
            fields: section.fields.map(f => f.id === field.id ? fieldForm : f)
          };
        } else {
          // Add new field
          return {
            ...section,
            fields: [...section.fields, fieldForm]
          };
        }
      }
      return section;
    }));

    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: section.fields.filter(f => f.id !== fieldId)
        };
      }
      return section;
    }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Reordering within the same section
      const sectionId = source.droppableId;
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const newFields = Array.from(section.fields);
      const [removed] = newFields.splice(source.index, 1);
      newFields.splice(destination.index, 0, removed);

      handleUpdateSection(sectionId, { fields: newFields });
    }
  };

  const handleAddSystemTemplate = (systemKey: keyof typeof SYSTEM_TEMPLATES) => {
    const systemTemplate = SYSTEM_TEMPLATES[systemKey];
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: systemTemplate.title,
      fields: systemTemplate.fields.map(field => ({
        ...field,
        id: `${field.id}_${Date.now()}`
      })),
      order: sections.length
    };
    setSections([...sections, newSection]);
  };

  const handleSaveTemplate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!templateName.trim()) {
        throw new Error('El nombre de la plantilla es requerido');
      }

      if (sections.length === 0 || sections.every(s => s.fields.length === 0)) {
        throw new Error('La plantilla debe tener al menos un campo');
      }

      // Convert sections to storable format
      const fields = sections.reduce((acc, section) => {
        acc[section.id] = {
          title: section.title,
          description: section.description,
          fields: section.fields,
          order: section.order
        };
        return acc;
      }, {} as Record<string, any>);

      if (template) {
        // Update existing template
        const { error: updateError } = await supabase
          .from('physical_exam_templates')
          .update({
            name: templateName,
            fields,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);

        if (updateError) throw updateError;
      } else {
        // Create new template
        const { data, error: insertError } = await supabase
          .from('physical_exam_templates')
          .insert({
            doctor_id: doctorId,
            name: templateName,
            fields
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (data) onSave(data);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            {template ? 'Editar Plantilla' : 'Nueva Plantilla de Exploración Física'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Template Info */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: Exploración Cardiológica Completa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Plantilla
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="specialty">Especialidad</option>
                <option value="emergency">Urgencias</option>
                <option value="pediatric">Pediátrica</option>
              </select>
            </div>
          </div>

          {/* Quick Add System Templates */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-300 mb-2">Agregar plantilla de sistema:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SYSTEM_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => handleAddSystemTemplate(key as keyof typeof SYSTEM_TEMPLATES)}
                  className="inline-flex items-center px-3 py-1 border border-gray-600 text-sm rounded-md text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {template.title}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              {sections.map((section, sectionIndex) => (
                <div key={section.id} className="border border-gray-600 rounded-lg p-4 bg-gray-750">
                  <div className="flex justify-between items-center mb-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                      className="text-lg font-medium bg-transparent text-white border-b border-transparent hover:border-gray-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Título de la sección"
                    />
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={section.description || ''}
                    onChange={(e) => handleUpdateSection(section.id, { description: e.target.value })}
                    className="w-full mb-3 text-sm bg-transparent text-gray-400 border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Descripción de la sección (opcional)"
                  />

                  <Droppable droppableId={section.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[50px]"
                      >
                        {section.fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center space-x-2 p-2 bg-gray-700 rounded ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-gray-500" />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-white">{field.label}</span>
                                  <span className="text-xs text-gray-400 ml-2">({field.type})</span>
                                  {field.required && <span className="text-xs text-red-400 ml-1">*</span>}
                                </div>
                                <button
                                  onClick={() => handleEditField(section.id, field)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteField(section.id, field.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  <button
                    onClick={() => handleAddField(section.id)}
                    className="mt-3 w-full py-2 border border-dashed border-gray-600 rounded text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Campo
                  </button>
                </div>
              ))}
            </DragDropContext>

            <button
              onClick={handleAddSection}
              className="w-full py-3 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Agregar Sección
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
          </button>
        </div>
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingField?.field ? 'Editar Campo' : 'Nuevo Campo'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Etiqueta del Campo *
                  </label>
                  <input
                    type="text"
                    value={fieldForm.label}
                    onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tipo de Campo
                  </label>
                  <select
                    value={fieldForm.type}
                    onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {(fieldForm.type === 'select' || fieldForm.type === 'checkbox' || fieldForm.type === 'radio') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Opciones (una por línea)
                    </label>
                    <textarea
                      value={fieldForm.options?.join('\n') || ''}
                      onChange={(e) => setFieldForm({ 
                        ...fieldForm, 
                        options: e.target.value.split('\n').filter(o => o.trim()) 
                      })}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={fieldForm.placeholder || ''}
                    onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Texto de Ayuda
                  </label>
                  <input
                    type="text"
                    value={fieldForm.helpText || ''}
                    onChange={(e) => setFieldForm({ ...fieldForm, helpText: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="field-required"
                    checked={fieldForm.required}
                    onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                    className="rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-700"
                  />
                  <label htmlFor="field-required" className="ml-2 text-sm text-gray-300">
                    Campo requerido
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowFieldEditor(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Campo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 