import React, { useState, useEffect } from 'react';
import { 
  X, Save, Plus, Trash2, GripVertical, 
  Type, TextCursor, List, RadioIcon as Radio, 
  CheckSquare, Hash, Calendar, Clock,
  Eye, EyeOff, Settings, Tag
} from 'lucide-react';
import { 
  MedicalTemplate, 
  TemplateFormData, 
  TemplateSection, 
  TemplateField,
  TemplateCategory 
} from '@/lib/database.types';

interface TemplateEditorProps {
  template?: MedicalTemplate | null;
  categories: TemplateCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: TemplateFormData) => Promise<void>;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: Type },
  { value: 'textarea', label: 'Área de texto', icon: TextCursor },
  { value: 'select', label: 'Selección', icon: List },
  { value: 'radio', label: 'Opción única', icon: Radio },
  { value: 'checkbox', label: 'Casillas', icon: CheckSquare },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'date', label: 'Fecha', icon: Calendar },
  { value: 'time', label: 'Hora', icon: Clock }
];

const TEMPLATE_TYPES = [
  { value: 'interrogatorio', label: 'Interrogatorio' },
  { value: 'exploracion', label: 'Exploración Física' },
  { value: 'prescripcion', label: 'Prescripción' }
];

export default function TemplateEditor({ 
  template, 
  categories, 
  isOpen, 
  onClose, 
  onSave 
}: TemplateEditorProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    type: 'interrogatorio',
    specialty: '',
    content: { sections: [] },
    tags: [],
    is_public: false,
    category_id: ''
  });
  
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [loading, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Inicializar datos cuando se abre el editor
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setFormData({
          name: template.name,
          description: template.description || '',
          type: template.type,
          specialty: template.specialty || '',
          content: template.content,
          tags: template.tags,
          is_public: template.is_public,
          category_id: template.category_id || ''
        });
        setSections(template.content.sections || []);
      } else {
        // Nuevo template
        const newSection: TemplateSection = {
          id: 'section-1',
          title: 'Sección Principal',
          fields: []
        };
        setFormData({
          name: '',
          description: '',
          type: 'interrogatorio',
          specialty: '',
          content: { sections: [newSection] },
          tags: [],
          is_public: false,
          category_id: ''
        });
        setSections([newSection]);
        setActiveSection('section-1');
      }
    }
  }, [template, isOpen]);

  // Actualizar contenido cuando cambian las secciones
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      content: { ...prev.content, sections }
    }));
  }, [sections]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre de la plantilla es requerido');
      return;
    }

    if (sections.length === 0) {
      alert('Debe tener al menos una sección');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      title: `Nueva Sección ${sections.length + 1}`,
      fields: []
    };
    setSections(prev => [...prev, newSection]);
    setActiveSection(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const deleteSection = (sectionId: string) => {
    if (sections.length === 1) {
      alert('Debe tener al menos una sección');
      return;
    }
    setSections(prev => prev.filter(section => section.id !== sectionId));
    if (activeSection === sectionId) {
      setActiveSection(sections[0]?.id || null);
    }
  };

  const addField = (sectionId: string) => {
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      label: 'Nueva pregunta',
      type: 'text',
      required: false
    };

    setSections(prev => prev.map(section =>
      section.id === sectionId 
        ? { ...section, fields: [...(section.fields || []), newField] }
        : section
    ));
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            fields: section.fields?.map(field =>
              field.id === fieldId ? { ...field, ...updates } : field
            ) || []
          }
        : section
    ));
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, fields: section.fields?.filter(field => field.id !== fieldId) || [] }
        : section
    ));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const currentSection = sections.find(s => s.id === activeSection);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </h2>
            <p className="text-gray-400">
              Crea y personaliza plantillas médicas profesionales
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Configuración */}
          <div className="w-80 border-r border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* Información básica */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Configuración
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre de la plantilla *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="Ej: Evaluación cardiovascular"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="Describe el propósito de esta plantilla"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      {TEMPLATE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Especialidad
                    </label>
                    <input
                      type="text"
                      value={formData.specialty || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="Ej: Cardiología"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Categoría
                    </label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories
                        .filter(cat => cat.type === formData.type || cat.type === 'general')
                        .map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Tag className="h-4 w-4 mr-1" />
                      Etiquetas
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-600 text-white"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-gray-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder="Nueva etiqueta"
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-r-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visibilidad */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300 flex items-center">
                      {formData.is_public ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      Plantilla pública
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_public}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Lista de secciones */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Secciones</h3>
                  <button
                    onClick={addSection}
                    className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-colors
                        ${activeSection === section.id 
                          ? 'bg-cyan-600/20 border-cyan-400 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }
                      `}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{section.title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                            {section.fields?.length || 0} campos
                          </span>
                          {sections.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSection(section.id);
                              }}
                              className="p-1 rounded text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Editor principal */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentSection ? (
              <div className="space-y-6">
                {/* Configuración de sección */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Título de la sección
                      </label>
                      <input
                        type="text"
                        value={currentSection.title}
                        onChange={(e) => updateSection(currentSection.id, { title: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Descripción de la sección
                      </label>
                      <textarea
                        value={currentSection.description || ''}
                        onChange={(e) => updateSection(currentSection.id, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder="Descripción opcional"
                      />
                    </div>
                  </div>
                </div>

                {/* Campos de la sección */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-white">Campos</h4>
                    <button
                      onClick={() => addField(currentSection.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar Campo</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentSection.fields?.map((field, fieldIndex) => (
                      <FieldEditor
                        key={field.id}
                        field={field}
                        onUpdate={(updates) => updateField(currentSection.id, field.id, updates)}
                        onDelete={() => deleteField(currentSection.id, field.id)}
                      />
                    )) || (
                      <div className="text-center py-12 border-2 border-dashed border-gray-600 rounded-lg">
                        <p className="text-gray-400 mb-4">Esta sección no tiene campos</p>
                        <button
                          onClick={() => addField(currentSection.id)}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                        >
                          Agregar primer campo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">Selecciona una sección para editar</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="text-gray-400">
            {sections.length} sección{sections.length !== 1 ? 'es' : ''}, {' '}
            {sections.reduce((total, section) => total + (section.fields?.length || 0), 0)} campos
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Plantilla'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para editar un campo individual
interface FieldEditorProps {
  field: TemplateField;
  onUpdate: (updates: Partial<TemplateField>) => void;
  onDelete: () => void;
}

function FieldEditor({ field, onUpdate, onDelete }: FieldEditorProps) {
  const fieldType = FIELD_TYPES.find(t => t.value === field.type);
  const Icon = fieldType?.icon || Type;

  const needsOptions = ['select', 'radio', 'checkbox'].includes(field.type);

  const updateOptions = (optionsText: string) => {
    const options = optionsText.split('\n').filter(opt => opt.trim());
    onUpdate({ options });
  };

  return (
    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-400">{fieldType?.label}</span>
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-400/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Etiqueta del campo
          </label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tipo de campo
          </label>
          <select
            value={field.type}
            onChange={(e) => onUpdate({ type: e.target.value as any })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {needsOptions && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Opciones (una por línea)
            </label>
            <textarea
              value={field.options?.join('\n') || ''}
              onChange={(e) => updateOptions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Placeholder
          </label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="Texto de ayuda"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="rounded border-gray-600 text-cyan-600 focus:ring-cyan-400 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300">Campo requerido</span>
          </label>
        </div>
      </div>
    </div>
  );
}