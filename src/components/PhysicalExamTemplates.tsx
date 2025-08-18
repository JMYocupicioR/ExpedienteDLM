import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Heart, Brain, Bone, Hand, Stethoscope, Activity, Search, Filter, X, Star, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PhysicalExamTemplateDefinition } from '@/lib/database.types';
import PhysicalExamTemplateEditor from '@/components/PhysicalExamTemplateEditor';

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
  onSelectMultiple?: (templates: PhysicalExamTemplate[]) => void;
  doctorId: string;
  allowMultipleSelection?: boolean;
}

// Plantillas predefinidas organizadas por categorías
const PREDEFINED_TEMPLATES = {
  sistemas: [
    {
      id: 'cardiovascular',
      name: 'Sistema Cardiovascular',
      icon: Heart,
      description: 'Exploración completa del sistema cardiovascular',
      fields: {
        main: {
          title: 'Exploración Cardiovascular',
          fields: [
            { id: 'heart_rate', label: 'Frecuencia Cardíaca', type: 'number', placeholder: 'lpm', required: true },
            { id: 'blood_pressure', label: 'Presión Arterial', type: 'text', placeholder: '120/80 mmHg', required: true },
            { id: 'heart_sounds', label: 'Ruidos Cardíacos', type: 'select', options: ['Normal', 'Soplo sistólico', 'Soplo diastólico', 'Galope', 'Arritmia'] },
            { id: 'pulses', label: 'Pulsos Periféricos', type: 'checkbox', options: ['Radial normal', 'Femoral normal', 'Poplíteo normal', 'Tibial normal', 'Pedio normal'] },
            { id: 'edema', label: 'Edema', type: 'radio', options: ['Ausente', 'Grado I', 'Grado II', 'Grado III', 'Grado IV'] }
          ]
        }
      }
    },
    {
      id: 'respiratory',
      name: 'Sistema Respiratorio',
      icon: Activity,
      description: 'Exploración completa del sistema respiratorio',
      fields: {
        main: {
          title: 'Exploración Respiratoria',
          fields: [
            { id: 'respiratory_rate', label: 'Frecuencia Respiratoria', type: 'number', placeholder: 'rpm', required: true },
            { id: 'lung_sounds', label: 'Ruidos Pulmonares', type: 'select', options: ['Normal', 'Estertores', 'Sibilancias', 'Roncus', 'Disminuidos', 'Ausentes'] },
            { id: 'chest_expansion', label: 'Expansión Torácica', type: 'radio', options: ['Normal', 'Disminuida', 'Asimétrica'] },
            { id: 'percussion', label: 'Percusión', type: 'radio', options: ['Sonoridad normal', 'Matidez', 'Timpanismo', 'Hipersonoridad'] }
          ]
        }
      }
    },
    {
      id: 'neurological',
      name: 'Sistema Neurológico',
      icon: Brain,
      description: 'Exploración completa del sistema neurológico',
      fields: {
        main: {
          title: 'Exploración Neurológica',
          fields: [
            { id: 'mental_status', label: 'Estado Mental', type: 'select', options: ['Alerta', 'Somnoliento', 'Estuporoso', 'Comatoso'] },
            { id: 'cranial_nerves', label: 'Pares Craneales', type: 'textarea', placeholder: 'Evaluación de pares craneales I-XII' },
            { id: 'reflexes', label: 'Reflejos Osteotendinosos', type: 'checkbox', options: ['Bicipital normal', 'Tricipital normal', 'Rotuliano normal', 'Aquíleo normal'] },
            { id: 'gait', label: 'Marcha', type: 'radio', options: ['Normal', 'Claudicante', 'Atáxica', 'Espástica', 'No evaluable'] }
          ]
        }
      }
    }
  ],
  especificas: [
    {
      id: 'spine_column',
      name: 'Exploración de Columna',
      icon: Bone,
      description: 'Exploración específica de columna vertebral',
      fields: {
        main: {
          title: 'Exploración de Columna Vertebral',
          fields: [
            { id: 'posture', label: 'Postura', type: 'radio', options: ['Normal', 'Escoliosis', 'Cifosis', 'Lordosis', 'Rectificación'] },
            { id: 'range_motion', label: 'Rango de Movimiento', type: 'checkbox', options: ['Flexión completa', 'Extensión completa', 'Lateralización derecha', 'Lateralización izquierda', 'Rotación derecha', 'Rotación izquierda'] },
            { id: 'pain_palpation', label: 'Dolor a la Palpación', type: 'radio', options: ['Ausente', 'Cervical', 'Dorsal', 'Lumbar', 'Sacroilíaca'] },
            { id: 'muscle_spasm', label: 'Espasmo Muscular', type: 'checkbox', options: ['Paravertebrales cervicales', 'Paravertebrales dorsales', 'Paravertebrales lumbares', 'Trapecio', 'Ausente'] },
            { id: 'special_tests', label: 'Pruebas Especiales', type: 'checkbox', options: ['Lasègue positivo', 'Bragard positivo', 'Patrick positivo', 'Compresión foraminal positiva'] }
          ]
        }
      }
    },
    {
      id: 'hand_wrist',
      name: 'Exploración de Mano y Muñeca',
      icon: Hand,
      description: 'Exploración específica de mano y muñeca',
      fields: {
        main: {
          title: 'Exploración de Mano y Muñeca',
          fields: [
            { id: 'inspection', label: 'Inspección', type: 'checkbox', options: ['Deformidad', 'Inflamación', 'Cambios de coloración', 'Atrofia muscular', 'Normal'] },
            { id: 'finger_mobility', label: 'Movilidad de Dedos', type: 'checkbox', options: ['Flexión completa', 'Extensión completa', 'Oposición pulgar', 'Pinza fina conservada', 'Pinza gruesa conservada'] },
            { id: 'wrist_movement', label: 'Movimiento de Muñeca', type: 'checkbox', options: ['Flexión completa', 'Extensión completa', 'Desviación radial', 'Desviación cubital', 'Pronosupinación'] },
            { id: 'grip_strength', label: 'Fuerza de Prensión', type: 'radio', options: ['Normal', 'Disminuida leve', 'Disminuida moderada', 'Disminuida severa', 'Ausente'] },
            { id: 'special_tests', label: 'Pruebas Especiales', type: 'checkbox', options: ['Tinel positivo', 'Phalen positivo', 'Finkelstein positivo', 'Test de Watson positivo'] }
          ]
        }
      }
    },
    {
      id: 'knee',
      name: 'Exploración de Rodilla',
      icon: Bone,
      description: 'Exploración específica de rodilla',
      fields: {
        main: {
          title: 'Exploración de Rodilla',
          fields: [
            { id: 'inspection', label: 'Inspección', type: 'checkbox', options: ['Deformidad', 'Inflamación', 'Derrame articular', 'Atrofia cuadricipital', 'Normal'] },
            { id: 'range_motion', label: 'Rango de Movimiento', type: 'text', placeholder: 'Flexión: __°, Extensión: __°' },
            { id: 'ligament_tests', label: 'Pruebas Ligamentarias', type: 'checkbox', options: ['Cajón anterior negativo', 'Cajón posterior negativo', 'Lachman negativo', 'Estrés valgo negativo', 'Estrés varo negativo'] },
            { id: 'meniscus_tests', label: 'Pruebas Meniscales', type: 'checkbox', options: ['McMurray negativo', 'Apley negativo', 'Dolor en interlínea medial', 'Dolor en interlínea lateral'] },
            { id: 'stability', label: 'Estabilidad General', type: 'radio', options: ['Estable', 'Inestabilidad leve', 'Inestabilidad moderada', 'Inestabilidad severa'] }
          ]
        }
      }
    }
  ]
};

export default function PhysicalExamTemplates({ 
  onSelectTemplate, 
  onSelectMultiple, 
  doctorId, 
  allowMultipleSelection = false 
}: PhysicalExamTemplatesProps) {
  const [templates, setTemplates] = useState<PhysicalExamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PhysicalExamTemplate | null>(null);
  
  // ===== NUEVOS ESTADOS PARA BÚSQUEDA Y FILTROS =====
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // ===== FUNCIONES DE FILTRADO Y BÚSQUEDA =====
  
  // Obtener especialidades únicas
  const getUniqueSpecialties = () => {
    const specialties = new Set<string>();
    
    // De plantillas predefinidas
    PREDEFINED_TEMPLATES.sistemas.forEach(t => t.specialty && specialties.add(t.specialty));
    PREDEFINED_TEMPLATES.especificas.forEach(t => t.specialty && specialties.add(t.specialty));
    
    // De plantillas del usuario (si tienen especialidad en metadatos)
    templates.forEach(t => {
      const specialty = t.definition?.metadata?.specialty as string;
      if (specialty) specialties.add(specialty);
    });
    
    return Array.from(specialties).sort();
  };

  // Obtener sistemas únicos
  const getUniqueSystems = () => {
    return ['Cardiovascular', 'Respiratorio', 'Neurológico', 'Musculoesquelético', 'Dermatológico', 'Gastrointestinal'];
  };

  // Filtrar plantillas predefinidas
  const getFilteredPredefinedTemplates = () => {
    let allPredefined = [
      ...PREDEFINED_TEMPLATES.sistemas.map(t => ({ ...t, category: 'sistema' })),
      ...PREDEFINED_TEMPLATES.especificas.map(t => ({ ...t, category: 'específica' }))
    ];

    // Aplicar filtros
    if (searchTerm) {
      allPredefined = allPredefined.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSpecialty !== 'all') {
      allPredefined = allPredefined.filter(t => t.specialty === selectedSpecialty);
    }

    if (selectedSystem !== 'all') {
      allPredefined = allPredefined.filter(t =>
        t.name.toLowerCase().includes(selectedSystem.toLowerCase()) ||
        t.description.toLowerCase().includes(selectedSystem.toLowerCase())
      );
    }

    return allPredefined;
  };

  // Filtrar plantillas del usuario
  const getFilteredUserTemplates = () => {
    let filtered = [...templates];

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.definition?.metadata?.description as string)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Manejar selección múltiple
  const handleTemplateSelect = (templateId: string, template: any) => {
    if (allowMultipleSelection) {
      const newSelection = new Set(selectedTemplates);
      if (newSelection.has(templateId)) {
        newSelection.delete(templateId);
      } else {
        newSelection.add(templateId);
      }
      setSelectedTemplates(newSelection);
    } else {
      // Convertir plantilla predefinida a formato esperado
      if (template.category) {
        onSelectTemplate(createTemplateFromPredefined(template));
      } else {
        onSelectTemplate(template);
      }
    }
  };

  // Aplicar selección múltiple
  const applyMultipleSelection = () => {
    if (!onSelectMultiple) return;

    const allPredefined = getFilteredPredefinedTemplates();
    const selectedPredefined = allPredefined
      .filter(t => selectedTemplates.has(t.id))
      .map(t => createTemplateFromPredefined(t));
    
    const selectedUserTemplates = templates.filter(t => selectedTemplates.has(t.id));
    
    onSelectMultiple([...selectedPredefined, ...selectedUserTemplates]);
    setSelectedTemplates(new Set());
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

  const createTemplateFromPredefined = (predefinedTemplate: any) => {
    // ===== CORREGIR CONVERSIÓN PARA USAR STRUCTURE CONSISTENTE =====
    const sectionData = predefinedTemplate.fields.main;
    
    return {
      id: predefinedTemplate.id,
      name: predefinedTemplate.name,
      doctor_id: doctorId,
      definition: {
        sections: [{
          id: predefinedTemplate.id,
          title: sectionData.title,
          description: predefinedTemplate.description,
          questions: sectionData.fields.map((field: any, index: number) => ({
            id: field.id || `${predefinedTemplate.id}_${index}`,
            label: field.label || '',
            type: field.type || 'text',
            required: field.required || false,
            options: field.options || [],
            placeholder: field.placeholder || '',
            defaultValue: field.defaultValue || ''
          })),
          order: 0
        }],
        version: '1.0'
      } as PhysicalExamTemplateDefinition,
      created_at: new Date().toISOString(),
      is_active: true
    };
  };

  const saveTemplateToDatabase = async (templateData: any) => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      const { data, error: saveError } = await supabase
        .from('physical_exam_templates')
        .insert([{
          doctor_id: doctorId,
          name: templateData.name,
          definition: templateData.definition,
          is_active: true,
          is_public: false
        }])
        .select()
        .single();

      if (saveError) throw saveError;

      // Actualizar lista local
      setTemplates(prev => [data, ...prev]);
      setSuccessMessage(`Plantilla "${templateData.name}" guardada exitosamente`);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return data;
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError('Error al guardar la plantilla: ' + err.message);
      throw err;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      const { error: deleteError } = await supabase
        .from('physical_exam_templates')
        .update({ is_active: false })
        .eq('id', templateId)
        .eq('doctor_id', doctorId);

      if (deleteError) throw deleteError;

      // Actualizar lista local
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setSuccessMessage('Plantilla eliminada exitosamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting template:', err);
      setError('Error al eliminar la plantilla: ' + err.message);
    }
  };

  const handleTemplateSaved = async (savedTemplate: PhysicalExamTemplate) => {
    // Recargar la lista de plantillas
    await loadTemplates();
    setSuccessMessage(`Plantilla "${savedTemplate.name}" guardada exitosamente`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const filteredPredefined = getFilteredPredefinedTemplates();
  const filteredUserTemplates = getFilteredUserTemplates();
  const uniqueSpecialties = getUniqueSpecialties();
  const uniqueSystems = getUniqueSystems();

  return (
    <div className="space-y-6">
      {/* Mensajes de notificación */}
      {successMessage && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 p-4 rounded-lg">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Header con controles */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Biblioteca de Plantillas de Exploración
            </h3>
            <p className="text-sm text-gray-400">
              {allowMultipleSelection 
                ? 'Selecciona múltiples plantillas para combinar sus campos'
                : 'Selecciona una plantilla para usar en tu consulta'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {allowMultipleSelection && selectedTemplates.size > 0 && (
              <button
                onClick={applyMultipleSelection}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center"
              >
                <Star className="h-4 w-4 mr-2" />
                Usar {selectedTemplates.size} plantillas
              </button>
            )}
            
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowEditor(true);
              }}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Plantilla
            </button>
          </div>
        </div>

        {/* Controles de búsqueda y filtros */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Barra de búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar plantillas por nombre o descripción..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Botón de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {(selectedSpecialty !== 'all' || selectedSystem !== 'all') && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {[selectedSpecialty !== 'all', selectedSystem !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Panel de filtros desplegable */}
          {showFilters && (
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Especialidad
                  </label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="all">Todas las especialidades</option>
                    {uniqueSpecialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sistema Anatómico
                  </label>
                  <select
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="all">Todos los sistemas</option>
                    {uniqueSystems.map(system => (
                      <option key={system} value={system}>{system}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedSpecialty('all');
                    setSelectedSystem('all');
                  }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plantillas Predefinidas */}
      {filteredPredefined.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-blue-300 mb-3 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Plantillas Predefinidas ({filteredPredefined.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPredefined.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplates.has(template.id);
              const categoryColor = template.category === 'sistema' ? 'blue' : 'green';
              
              return (
                <div
                  key={template.id}
                  className={`
                    relative bg-gradient-to-br from-${categoryColor}-900/30 to-${categoryColor}-800/20 
                    border border-${categoryColor}-700 rounded-lg p-4 transition-all cursor-pointer
                    ${isSelected 
                      ? `border-cyan-400 bg-cyan-900/20 ring-2 ring-cyan-400/50` 
                      : `hover:border-${categoryColor}-500`
                    }
                  `}
                  onClick={() => handleTemplateSelect(template.id, template)}
                >
                  {allowMultipleSelection && (
                    <div className="absolute top-2 right-2">
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${isSelected 
                          ? 'bg-cyan-400 border-cyan-400' 
                          : 'border-gray-400 bg-transparent'
                        }
                      `}>
                        {isSelected && <Check className="h-3 w-3 text-gray-900" />}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center mb-2">
                    <Icon className={`h-6 w-6 text-${categoryColor}-400 mr-3`} />
                    <h5 className="text-white font-medium text-sm pr-6">{template.name}</h5>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-2">{template.description}</p>
                  
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className={`text-${categoryColor}-300`}>
                      {template.fields.main.fields.length} campos
                    </span>
                    {template.specialty && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">
                        {template.specialty}
                      </span>
                    )}
                  </div>

                  {!allowMultipleSelection && (
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(createTemplateFromPredefined(template));
                        }}
                        className={`flex-1 px-3 py-1 bg-${categoryColor}-600 hover:bg-${categoryColor}-700 text-white text-xs rounded transition-colors`}
                      >
                        Usar
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const templateData = createTemplateFromPredefined(template);
                            await saveTemplateToDatabase(templateData);
                          } catch (error) {
                            console.error('Error:', error);
                          }
                        }}
                        className="flex-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plantillas Personalizadas del Usuario */}
      {filteredUserTemplates.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-purple-300 mb-3 flex items-center">
            <Edit2 className="h-5 w-5 mr-2" />
            Mis Plantillas Personalizadas ({filteredUserTemplates.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUserTemplates.map((template) => {
              const isSelected = selectedTemplates.has(template.id);
              
              return (
                <div
                  key={template.id}
                  className={`
                    relative bg-gradient-to-br from-purple-900/30 to-purple-800/20 
                    border border-purple-700 rounded-lg p-4 transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-cyan-400 bg-cyan-900/20 ring-2 ring-cyan-400/50' 
                      : 'hover:border-purple-500'
                    }
                  `}
                  onClick={() => handleTemplateSelect(template.id, template)}
                >
                  {allowMultipleSelection && (
                    <div className="absolute top-2 right-2">
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${isSelected 
                          ? 'bg-cyan-400 border-cyan-400' 
                          : 'border-gray-400 bg-transparent'
                        }
                      `}>
                        {isSelected && <Check className="h-3 w-3 text-gray-900" />}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <h5 className="text-white font-medium pr-6">{template.name}</h5>
                    {!allowMultipleSelection && (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplate(template);
                            setShowEditor(true);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Editar plantilla"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
                              await deleteTemplate(template.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Eliminar plantilla"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    <p>{template.definition?.sections?.length || 0} secciones</p>
                    <p className="text-xs mt-1">
                      Creada: {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {filteredPredefined.length === 0 && filteredUserTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">
            {searchTerm || selectedSpecialty !== 'all' || selectedSystem !== 'all'
              ? 'No se encontraron plantillas que coincidan con los filtros'
              : 'No hay plantillas disponibles'
            }
          </p>
          <p className="text-sm text-gray-500">
            {searchTerm || selectedSpecialty !== 'all' || selectedSystem !== 'all'
              ? 'Prueba ajustando los filtros de búsqueda'
              : 'Crea tu primera plantilla personalizada o usa las predefinidas'
            }
          </p>
        </div>
      )}

      {/* Mensaje informativo */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h5 className="text-blue-300 font-medium mb-2">💡 Cómo usar las plantillas:</h5>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>Sistemas Generales:</strong> Para exploraciones amplias por sistema</li>
          <li>• <strong>Exploraciones Específicas:</strong> Para regiones anatómicas específicas</li>
          <li>• <strong>Plantillas Personalizadas:</strong> Tus plantillas creadas y guardadas</li>
          <li>• Puedes personalizar cualquier plantilla después de seleccionarla</li>
        </ul>
      </div>

      {/* Editor de plantillas */}
      {showEditor && (
        <PhysicalExamTemplateEditor
          template={editingTemplate}
          doctorId={doctorId}
          onSave={handleTemplateSaved}
          onClose={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}