import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Plus, Trash2, GripVertical, 
  Type, TextCursor, List, RadioIcon as Radio, 
  CheckSquare, Hash, Calendar, Clock,
  Eye, EyeOff, Settings, Tag,
  Dumbbell, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  MedicalTemplate, 
  TemplateFormData, 
  TemplateSection, 
  TemplateField,
  TemplateCategory,
  Exercise
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
  const [forcePhysiotherapyMode, setForcePhysiotherapyMode] = useState(false);

  // Inicializar datos cuando se abre el editor
  useEffect(() => {
    if (isOpen) {
      if (template) {
        const initialSections = template.content.sections || [];
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
        setSections(initialSections);
        setActiveSection(initialSections[0]?.id || null);
        const hasExercises = initialSections.some(section => (section.exercises?.length || 0) > 0);
        const specialty = (template.specialty || '').toLowerCase().trim();
        const looksPhysioSpecialty = specialty.includes('fisioterapia') || specialty.includes('terapia fisica') || specialty.includes('terapia física') || specialty.includes('rehabilitación');
        setForcePhysiotherapyMode(hasExercises || looksPhysioSpecialty);
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
        setForcePhysiotherapyMode(false);
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

    // Validaciones específicas de fisioterapia
    if (isPhysiotherapyMode) {
      const hasExercises = sections.some(s => (s.exercises?.length || 0) > 0);
      if (!hasExercises) {
        alert('Las plantillas de fisioterapia deben tener al menos un ejercicio');
        return;
      }

      // Validar campos mínimos por ejercicio
      for (const section of sections) {
        if (!section.exercises) continue;
        for (let i = 0; i < section.exercises.length; i++) {
          const ex = section.exercises[i];
          if (!ex.name.trim()) {
            alert(`El ejercicio ${i + 1} en "${section.title}" requiere un nombre`);
            return;
          }
          if (!ex.repetitions.trim()) {
            alert(`El ejercicio "${ex.name}" en "${section.title}" requiere repeticiones`);
            return;
          }
          if (!ex.frequency.trim()) {
            alert(`El ejercicio "${ex.name}" en "${section.title}" requiere frecuencia`);
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      // Error log removed for security;
      alert('Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      title: isPhysiotherapyMode 
        ? `Grupo de Ejercicios ${sections.length + 1}` 
        : `Nueva Sección ${sections.length + 1}`,
      fields: isPhysiotherapyMode ? undefined : [],
      exercises: isPhysiotherapyMode ? [] : undefined
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

  // --- Detección de modo fisioterapia ---
  const isPhysiotherapyMode = useMemo(() => {
    const sp = (formData.specialty || '').toLowerCase().trim();
    const hasExercisesInAnySection = sections.some(section => (section.exercises?.length || 0) > 0);
    return formData.type === 'prescripcion' && (
      forcePhysiotherapyMode ||
      hasExercisesInAnySection ||
      sp.includes('fisioterapia') ||
      sp.includes('terapia física') ||
      sp.includes('terapia fisica') ||
      sp.includes('rehabilitación')
    );
  }, [formData.type, formData.specialty, sections, forcePhysiotherapyMode]);

  const togglePhysiotherapyMode = (enabled: boolean) => {
    setForcePhysiotherapyMode(enabled);
    if (!enabled) return;

    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty?.trim() ? prev.specialty : 'Fisioterapia'
    }));

    setSections(prev => {
      if (prev.length === 0) {
        const firstSection: TemplateSection = {
          id: `section-${Date.now()}`,
          title: 'Grupo de Ejercicios 1',
          description: '',
          exercises: []
        };
        setActiveSection(firstSection.id);
        return [firstSection];
      }

      return prev.map(section => ({
        ...section,
        exercises: section.exercises || []
      }));
    });
  };

  // --- CRUD de ejercicios ---
  const addExercise = (sectionId: string) => {
    const newExercise: Exercise = {
      name: '',
      description: '',
      repetitions: '',
      frequency: '',
      duration: '',
      intensity: '',
      precautions: []
    };

    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, exercises: [...(section.exercises || []), newExercise] }
        : section
    ));
  };

  const updateExercise = (sectionId: string, exerciseIndex: number, updates: Partial<Exercise>) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            exercises: section.exercises?.map((ex, i) =>
              i === exerciseIndex ? { ...ex, ...updates } : ex
            ) || []
          }
        : section
    ));
  };

  const deleteExercise = (sectionId: string, exerciseIndex: number) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, exercises: section.exercises?.filter((_, i) => i !== exerciseIndex) || [] }
        : section
    ));
  };

  const moveExercise = (sectionId: string, fromIndex: number, direction: 'up' | 'down') => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId || !section.exercises) return section;
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= section.exercises.length) return section;
      const newExercises = [...section.exercises];
      [newExercises[fromIndex], newExercises[toIndex]] = [newExercises[toIndex], newExercises[fromIndex]];
      return { ...section, exercises: newExercises };
    }));
  };

  // Conteo total de ejercicios
  const totalExercises = sections.reduce((total, section) => total + (section.exercises?.length || 0), 0);

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

                  {formData.type === 'prescripcion' && (
                    <label className="flex items-center justify-between rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2">
                      <span className="text-sm text-emerald-300">Plantilla de fisioterapia (ejercicios)</span>
                      <input
                        type="checkbox"
                        checked={isPhysiotherapyMode}
                        onChange={(e) => togglePhysiotherapyMode(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-400"
                      />
                    </label>
                  )}

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
                    <label className="text-sm font-medium text-gray-300 mb-2 flex items-center">
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
                            {isPhysiotherapyMode
                              ? `${section.exercises?.length || 0} ejercicio${(section.exercises?.length || 0) !== 1 ? 's' : ''}`
                              : `${section.fields?.length || 0} campos`
                            }
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
                {/* Indicador de modo fisioterapia */}
                {isPhysiotherapyMode && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 border border-emerald-700/50 rounded-lg">
                    <Dumbbell className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-emerald-300">
                      Modo Fisioterapia: edita ejercicios, repeticiones, frecuencia e intensidad por sección
                    </span>
                  </div>
                )}

                {/* Configuración de sección */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {isPhysiotherapyMode ? 'Nombre del grupo de ejercicios' : 'Título de la sección'}
                      </label>
                      <input
                        type="text"
                        value={currentSection.title}
                        onChange={(e) => updateSection(currentSection.id, { title: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder={isPhysiotherapyMode ? 'Ej: Ejercicios de estiramiento lumbar' : ''}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {isPhysiotherapyMode ? 'Instrucciones generales' : 'Descripción de la sección'}
                      </label>
                      <textarea
                        value={currentSection.description || ''}
                        onChange={(e) => updateSection(currentSection.id, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder={isPhysiotherapyMode ? 'Ej: Realizar en superficie firme, detener si hay dolor agudo' : 'Descripción opcional'}
                      />
                    </div>
                  </div>
                </div>

                {/* Ejercicios (modo fisioterapia) */}
                {isPhysiotherapyMode ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-white flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-emerald-400" />
                        Ejercicios
                      </h4>
                      <button
                        onClick={() => addExercise(currentSection.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Agregar Ejercicio</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {currentSection.exercises && currentSection.exercises.length > 0 ? (
                        currentSection.exercises.map((exercise, exIndex) => (
                          <ExerciseEditor
                            key={exIndex}
                            exercise={exercise}
                            index={exIndex}
                            total={currentSection.exercises?.length || 0}
                            onUpdate={(updates) => updateExercise(currentSection.id, exIndex, updates)}
                            onDelete={() => deleteExercise(currentSection.id, exIndex)}
                            onMove={(dir) => moveExercise(currentSection.id, exIndex, dir)}
                          />
                        ))
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-emerald-800/50 rounded-lg">
                          <Dumbbell className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400 mb-4">Esta sección no tiene ejercicios</p>
                          <button
                            onClick={() => addExercise(currentSection.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                          >
                            Agregar primer ejercicio
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Campos de la sección (modo estándar) */
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
                      {currentSection.fields?.map((field) => (
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
                )}
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
            {sections.length} sección{sections.length !== 1 ? 'es' : ''}
            {isPhysiotherapyMode
              ? `, ${totalExercises} ejercicio${totalExercises !== 1 ? 's' : ''}`
              : `, ${sections.reduce((total, section) => total + (section.fields?.length || 0), 0)} campos`
            }
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

// Componente para editar un ejercicio individual
interface ExerciseEditorProps {
  exercise: Exercise;
  index: number;
  total: number;
  onUpdate: (updates: Partial<Exercise>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function ExerciseEditor({ exercise, index, total, onUpdate, onDelete, onMove }: ExerciseEditorProps) {
  const [precautionInput, setPrecautionInput] = useState('');

  const addPrecaution = () => {
    if (precautionInput.trim()) {
      onUpdate({ precautions: [...(exercise.precautions || []), precautionInput.trim()] });
      setPrecautionInput('');
    }
  };

  const removePrecaution = (precautionIndex: number) => {
    onUpdate({
      precautions: (exercise.precautions || []).filter((_, i) => i !== precautionIndex)
    });
  };

  const hasMinimumFields = exercise.name.trim() && exercise.repetitions.trim() && exercise.frequency.trim();

  return (
    <div className={`bg-gray-700/30 rounded-lg p-4 border ${hasMinimumFields ? 'border-gray-600' : 'border-amber-700/50'}`}>
      {/* Header del ejercicio */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Dumbbell className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            Ejercicio {index + 1}
          </span>
          {!hasMinimumFields && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle className="h-3 w-3" />
              Campos requeridos incompletos
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1 rounded text-gray-400 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover arriba"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="p-1 rounded text-gray-400 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover abajo"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-400/10"
            title="Eliminar ejercicio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nombre del ejercicio *
          </label>
          <input
            type="text"
            value={exercise.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ej: Estiramiento de isquiotibiales"
          />
        </div>

        {/* Descripción */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Descripción / Instrucciones
          </label>
          <textarea
            value={exercise.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ej: Acostado boca arriba, elevar la pierna recta hasta sentir tensión en la parte posterior del muslo"
          />
        </div>

        {/* Repeticiones */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Repeticiones / Series *
          </label>
          <input
            type="text"
            value={exercise.repetitions}
            onChange={(e) => onUpdate({ repetitions: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ej: 3 series de 10 repeticiones"
          />
        </div>

        {/* Frecuencia */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Frecuencia *
          </label>
          <input
            type="text"
            value={exercise.frequency}
            onChange={(e) => onUpdate({ frequency: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ej: 2 veces al día"
          />
        </div>

        {/* Duración */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Duración
          </label>
          <input
            type="text"
            value={exercise.duration || ''}
            onChange={(e) => onUpdate({ duration: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ej: Mantener 30 segundos"
          />
        </div>

        {/* Intensidad */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Intensidad
          </label>
          <input
            type="text"
            value={exercise.intensity || ''}
            onChange={(e) => onUpdate({ intensity: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ej: Baja-Moderada, sin dolor"
          />
        </div>

        {/* Precauciones */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Precauciones
          </label>
          {(exercise.precautions?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {exercise.precautions!.map((precaution, pIdx) => (
                <span
                  key={pIdx}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-900/40 text-amber-300 border border-amber-700/40"
                >
                  {precaution}
                  <button
                    onClick={() => removePrecaution(pIdx)}
                    className="ml-1 hover:text-amber-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex">
            <input
              type="text"
              value={precautionInput}
              onChange={(e) => setPrecautionInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrecaution())}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Ej: Evitar si hay dolor agudo"
            />
            <button
              onClick={addPrecaution}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-r-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
