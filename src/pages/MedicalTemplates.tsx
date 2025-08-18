import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileEdit, Plus, Search, Filter, Star, StarOff, 
  Eye, Edit, Trash2, Copy, Download, Upload,
  Stethoscope, Bone, Activity, Brain, Heart, Hand, 
  MessageSquare, FileText, User, Calendar, Clock,
  Wand2, BookOpen, Apple, Dumbbell, Pill
} from 'lucide-react';
import { MEDICATION_CONSTRAINTS } from '@/lib/medicalConfig';
import { useTemplates } from '@/features/medical-templates/hooks/useTemplates';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { MedicalTemplate, PredefinedTemplate } from '@/lib/database.types';
import TemplateEditor from '@/features/medical-templates/components/TemplateEditor';

// Plantillas predefinidas
const PREDEFINED_INTERROGATORIO: PredefinedTemplate[] = [
  { 
    id: 'first-time', 
    name: 'Primera Consulta', 
    description: 'Evaluación inicial completa para nuevos pacientes', 
    icon: 'MessageSquare', 
    type: 'interrogatorio',
    fields: 12
  },
  { 
    id: 'preventive', 
    name: 'Chequeo Preventivo', 
    description: 'Evaluación de salud preventiva y factores de riesgo', 
    icon: 'Stethoscope', 
    type: 'interrogatorio',
    fields: 15
  },
  { 
    id: 'cardio-risk', 
    name: 'Riesgo Cardiovascular', 
    description: 'Evaluación específica de factores de riesgo cardíaco', 
    icon: 'Heart', 
    type: 'interrogatorio',
    specialty: 'Cardiología',
    fields: 10
  },
  { 
    id: 'mental-health', 
    name: 'Salud Mental (PHQ-9)', 
    description: 'Cuestionario estándar para detección de depresión', 
    icon: 'Brain', 
    type: 'interrogatorio',
    specialty: 'Psiquiatría',
    fields: 9
  }
];

const PREDEFINED_EXPLORACION: PredefinedTemplate[] = [
  { 
    id: 'cardiovascular', 
    name: 'Sistema Cardiovascular', 
    description: 'Exploración completa del sistema cardiovascular', 
    icon: 'Heart', 
    type: 'exploracion',
    specialty: 'Cardiología',
    fields: 8
  },
  { 
    id: 'respiratory', 
    name: 'Sistema Respiratorio', 
    description: 'Exploración del sistema respiratorio', 
    icon: 'Activity', 
    type: 'exploracion',
    specialty: 'Neumología',
    fields: 6
  },
  { 
    id: 'neurological', 
    name: 'Sistema Neurológico', 
    description: 'Exploración neurológica completa', 
    icon: 'Brain', 
    type: 'exploracion',
    specialty: 'Neurología',
    fields: 10
  },
  { 
    id: 'knee', 
    name: 'Exploración de Rodilla', 
    description: 'Exploración específica de articulación de rodilla', 
    icon: 'Bone', 
    type: 'exploracion',
    specialty: 'Traumatología',
    fields: 12
  },
  { 
    id: 'shoulder', 
    name: 'Exploración de Hombro', 
    description: 'Exploración específica del hombro', 
    icon: 'Hand', 
    type: 'exploracion',
    specialty: 'Traumatología',
    fields: 10
  }
];

const PREDEFINED_PRESCRIPCIONES: PredefinedTemplate[] = [
  { 
    id: 'lumbar-exercises', 
    name: 'Ejercicios para Lumbalgia', 
    description: 'Plan de ejercicios para dolor lumbar', 
    icon: 'Dumbbell', 
    type: 'prescripcion',
    specialty: 'Fisioterapia'
  },
  { 
    id: 'hypertension-diet', 
    name: 'Dieta DASH para Hipertensión', 
    description: 'Plan alimenticio para control de presión arterial', 
    icon: 'Apple', 
    type: 'prescripcion',
    specialty: 'Nutrición'
  },
  { 
    id: 'diabetes-education', 
    name: 'Educación Diabética', 
    description: 'Material educativo para pacientes diabéticos', 
    icon: 'BookOpen', 
    type: 'prescripcion',
    specialty: 'Endocrinología'
  }
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  MessageSquare, Stethoscope, Heart, Brain, Activity, Bone, Hand, 
  FileText, User, Calendar, Clock, BookOpen, Apple, Dumbbell
};

interface TabComponentProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onTemplateSelect: (template: MedicalTemplate | PredefinedTemplate) => void;
  onCreateNew: () => void;
}

export default function MedicalTemplates() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const {
    templates,
    categories,
    favorites,
    loading,
    error,
    searchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleFavorite
  } = useTemplates();

  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || 'interrogatorio'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MedicalTemplate | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Actualizar URL cuando cambia el tab
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Cargar plantillas cuando cambia el tab o término de búsqueda
  useEffect(() => {
    if (user) {
      searchTemplates({
        type: activeTab as any,
        search: searchTerm,
        include_public: true
      });
    }
  }, [activeTab, searchTerm, user, searchTemplates]);

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: MedicalTemplate) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handleSelectPredefined = (predefined: PredefinedTemplate) => {
    // Convertir plantilla predefinida a MedicalTemplate para edición
    const newTemplate: Partial<MedicalTemplate> = {
      id: `temp-${predefined.id}`,
      user_id: user?.id || '',
      name: predefined.name,
      description: predefined.description,
      type: predefined.type,
      specialty: predefined.specialty,
      content: {
        sections: [
          {
            id: 'main',
            title: `Sección principal - ${predefined.name}`,
            fields: Array(predefined.fields || 5).fill(null).map((_, i) => ({
              id: `field-${i + 1}`,
              label: `Campo ${i + 1}`,
              type: 'text' as const,
              required: i === 0
            }))
          }
        ]
      },
      tags: [],
      is_public: false,
      is_predefined: false,
      is_active: true,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setSelectedTemplate(newTemplate as MedicalTemplate);
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      if (selectedTemplate && !selectedTemplate.id.startsWith('temp-')) {
        await updateTemplate(selectedTemplate.id, templateData);
      } else {
        await createTemplate(templateData);
      }
      setIsEditorOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  const filteredTemplates = templates.filter(template => {
    if (showFavoritesOnly) {
      return favorites.some(fav => fav.template_id === template.id);
    }
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <FileEdit className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-gray-400">Debes iniciar sesión para acceder a las plantillas médicas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FileEdit className="h-8 w-8 mr-3 text-cyan-400" />
            Plantillas Médicas
          </h1>
          <p className="text-gray-400">
            Crea y gestiona plantillas para interrogatorios, exploración física y prescripciones
          </p>
        </div>

        {/* Controles principales */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Búsqueda y filtros */}
          <div className="flex flex-1 items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar plantillas..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                ${showFavoritesOnly 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {showFavoritesOnly ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
              <span>Favoritos</span>
            </button>
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCreateNew}
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Plantilla</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[ 
                { id: 'interrogatorio', label: 'Interrogatorio', icon: MessageSquare },
                { id: 'exploracion', label: 'Exploración Física', icon: Stethoscope },
                { id: 'prescripcion', label: 'Prescripciones', icon: FileText },
                { id: 'medicamentos', label: 'Medicamentos', icon: Pill },
                { id: 'ai-designer', label: 'Diseño con IA', icon: Wand2 }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-cyan-400 text-cyan-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Contenido de tabs */}
        <div className="space-y-6">
          {activeTab === 'interrogatorio' && (
            <InterrogatorioTab
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onTemplateSelect={handleSelectPredefined}
              onCreateNew={handleCreateNew}
            />
          )}
          
          {activeTab === 'exploracion' && (
            <ExploracionTab
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onTemplateSelect={handleSelectPredefined}
              onCreateNew={handleCreateNew}
            />
          )}
          
          {activeTab === 'prescripcion' && (
            <PrescripcionTab
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onTemplateSelect={handleSelectPredefined}
              onCreateNew={handleCreateNew}
            />
          )}

          {activeTab === 'medicamentos' && (
            <MedicamentosTab
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onTemplateSelect={handleSelectPredefined}
              onCreateNew={handleCreateNew}
            />
          )}

          {activeTab === 'ai-designer' && (
            <AIDesignerTab />
          )}

          {/* Plantillas del usuario */}
          {activeTab !== 'ai-designer' && (
            <UserTemplatesSection
              templates={filteredTemplates}
              favorites={favorites}
              loading={loading}
              onEdit={handleEditTemplate}
              onDelete={deleteTemplate}
              onDuplicate={duplicateTemplate}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </div>

        {/* Editor de plantillas */}
        <TemplateEditor
          template={selectedTemplate}
          categories={categories}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setSelectedTemplate(null);
          }}
          onSave={handleSaveTemplate}
        />
      </div>
    </div>
  );
}

// Componente para el tab de Interrogatorio
function InterrogatorioTab({ onTemplateSelect, onCreateNew }: TabComponentProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-cyan-400" />
          Plantillas de Interrogatorio
        </h3>
        <p className="text-gray-400 mb-6">
          Selecciona una plantilla para crear interrogatorios médicos estructurados
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREDEFINED_INTERROGATORIO.map((template) => (
            <PredefinedTemplateCard
              key={template.id}
              template={template}
              onSelect={() => onTemplateSelect(template)}
            />
          ))}
          
          <CreateNewCard onCreateNew={onCreateNew} />
        </div>
      </div>
    </div>
  );
}

// Componente para el tab de Exploración
function ExploracionTab({ onTemplateSelect, onCreateNew }: TabComponentProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Stethoscope className="h-5 w-5 mr-2 text-cyan-400" />
          Plantillas de Exploración Física
        </h3>
        <p className="text-gray-400 mb-6">
          Plantillas para realizar exploraciones físicas sistemáticas
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREDEFINED_EXPLORACION.map((template) => (
            <PredefinedTemplateCard
              key={template.id}
              template={template}
              onSelect={() => onTemplateSelect(template)}
            />
          ))}
          
          <CreateNewCard onCreateNew={onCreateNew} />
        </div>
      </div>
    </div>
  );
}

// Componente para el tab de Prescripciones
function PrescripcionTab({ onTemplateSelect, onCreateNew }: TabComponentProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-cyan-400" />
          Plantillas de Prescripciones
        </h3>
        <p className="text-gray-400 mb-6">
          Crea guías de tratamiento y material educativo para pacientes
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREDEFINED_PRESCRIPCIONES.map((template) => (
            <PredefinedTemplateCard
              key={template.id}
              template={template}
              onSelect={() => onTemplateSelect(template)}
            />
          ))}
          
          <CreateNewCard onCreateNew={onCreateNew} />
        </div>
      </div>
    </div>
  );
}

// Componente para el tab de Medicamentos (autocompletado)
function MedicamentosTab({ searchTerm, onSearch }: TabComponentProps) {
  const entries = Object.entries(MEDICATION_CONSTRAINTS)
    .filter(([name]) => name.toLowerCase().includes((searchTerm || '').toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Pill className="h-5 w-5 mr-2 text-cyan-400" />
          Medicamentos y dosis sugeridas (autocompletado)
        </h3>
        <p className="text-gray-400 mb-6">
          Consulta las dosis, frecuencias y restricciones que usa el autocompletado en las recetas.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Medicamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Dosis sugeridas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Frecuencias</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Duración máx.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Indicadores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {entries.map(([name, cfg]) => {
                const min = (cfg as any).minDosage;
                const max = (cfg as any).maxDosage;
                const freqs: string[] = (cfg as any).allowedFrequencies || [];
                const maxDays = (cfg as any).maxDurationDays;
                const controlled = (cfg as any).controlledSubstance;
                const requiresSpec = (cfg as any).requiresSpecialist;
                return (
                  <tr key={name} className="hover:bg-gray-800/40">
                    <td className="px-6 py-3 text-sm text-gray-200">{name.charAt(0).toUpperCase() + name.slice(1)}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{min}mg - {max}mg</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{freqs.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{maxDays} días</td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex gap-2 flex-wrap">
                        {controlled && <span className="px-2 py-0.5 text-xs rounded bg-red-900/40 text-red-300 border border-red-700/40">Controlado</span>}
                        {requiresSpec && <span className="px-2 py-0.5 text-xs rounded bg-yellow-900/40 text-yellow-300 border border-yellow-700/40">Requiere especialista</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente para el diseñador con IA
function AIDesignerTab() {
  const [patientProfile, setPatientProfile] = useState('');
  const [questionnaireGoal, setQuestionnaireGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);

  const handleGenerate = async () => {
    if (!patientProfile.trim() || !questionnaireGoal.trim()) {
      alert('Por favor, completa el perfil del paciente y el objetivo del cuestionario');
      return;
    }

    setIsGenerating(true);
    try {
      // Simular generación con IA (aquí integrarías con tu servicio de IA)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setRecommendations({
        rationale: `Basándome en el perfil "${patientProfile}" y el objetivo "${questionnaireGoal}", he generado las siguientes recomendaciones...`,
        suggestedCategories: [
          'Datos generales',
          'Síntomas principales',
          'Antecedentes médicos',
          'Medicación actual',
          'Estilo de vida'
        ],
        suggestedQuestions: [
          '¿Cuál es el motivo principal de su consulta?',
          '¿Cuándo comenzaron los síntomas?',
          '¿Ha tenido síntomas similares anteriormente?',
          '¿Está tomando algún medicamento actualmente?',
          '¿Tiene antecedentes familiares de esta condición?'
        ]
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Error al generar recomendaciones');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Wand2 className="h-5 w-5 mr-2 text-cyan-400" />
          Diseñador de Plantillas con IA
        </h3>
        <p className="text-gray-400 mb-6">
          Describe el perfil del paciente y objetivos para generar plantillas personalizadas
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Perfil del Paciente
            </label>
            <textarea
              value={patientProfile}
              onChange={(e) => setPatientProfile(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Ej: Hombre de 45 años con historial de hipertensión, se presenta para chequeo anual..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Objetivo del Cuestionario
            </label>
            <input
              type="text"
              value={questionnaireGoal}
              onChange={(e) => setQuestionnaireGoal(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Ej: Evaluar riesgo cardiovascular y factores de estilo de vida"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            <Wand2 className="h-4 w-4" />
            <span>{isGenerating ? 'Generando...' : 'Generar Recomendaciones'}</span>
          </button>
        </div>

        {recommendations && (
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
            <h4 className="text-lg font-medium text-white mb-3">Recomendaciones de IA</h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-300 mb-1">Justificación:</p>
                <p className="text-gray-400 text-sm">{recommendations.rationale}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Categorías sugeridas:</p>
                <div className="flex flex-wrap gap-2">
                  {recommendations.suggestedCategories.map((category: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Preguntas sugeridas:</p>
                <ul className="space-y-1">
                  {recommendations.suggestedQuestions.map((question: string, index: number) => (
                    <li key={index} className="text-gray-400 text-sm">• {question}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <button className="mt-4 w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              Crear Plantilla desde Recomendaciones
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para mostrar plantillas del usuario
interface UserTemplatesSectionProps {
  templates: MedicalTemplate[];
  favorites: any[];
  loading: boolean;
  onEdit: (template: MedicalTemplate) => void;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<MedicalTemplate>;
  onToggleFavorite: (id: string) => Promise<boolean>;
}

function UserTemplatesSection({ 
  templates, 
  favorites, 
  loading, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onToggleFavorite 
}: UserTemplatesSectionProps) {
  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-gray-400 mt-2">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
        <User className="h-5 w-5 mr-2 text-cyan-400" />
        Mis Plantillas ({templates.length})
      </h3>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <FileEdit className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No tienes plantillas personalizadas</p>
          <p className="text-gray-500 text-sm">Crea tu primera plantilla usando el botón "Nueva Plantilla"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <UserTemplateCard
              key={template.id}
              template={template}
              isFavorite={favorites.some(fav => fav.template_id === template.id)}
              onEdit={() => onEdit(template)}
              onDelete={() => onDelete(template.id)}
              onDuplicate={() => onDuplicate(template.id)}
              onToggleFavorite={() => onToggleFavorite(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente para tarjeta de plantilla predefinida
interface PredefinedTemplateCardProps {
  template: PredefinedTemplate;
  onSelect: () => void;
}

function PredefinedTemplateCard({ template, onSelect }: PredefinedTemplateCardProps) {
  const Icon = ICON_MAP[template.icon] || FileText;

  return (
    <button
      onClick={onSelect}
      className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-all transform hover:scale-105 text-left"
    >
      <div className="flex items-center mb-3">
        <Icon className="h-6 w-6 text-cyan-400 mr-3" />
        <h4 className="font-medium text-white">{template.name}</h4>
      </div>
      
      <p className="text-gray-400 text-sm mb-3">{template.description}</p>
      
      <div className="flex items-center justify-between text-xs">
        {template.specialty && (
          <span className="px-2 py-1 bg-gray-600 text-gray-300 rounded">
            {template.specialty}
          </span>
        )}
        {template.fields && (
          <span className="text-gray-500">
            {template.fields} campos
          </span>
        )}
      </div>
    </button>
  );
}

// Componente para tarjeta de "Crear nueva"
interface CreateNewCardProps {
  onCreateNew: () => void;
}

function CreateNewCard({ onCreateNew }: CreateNewCardProps) {
  return (
    <button
      onClick={onCreateNew}
      className="w-full p-4 border-2 border-dashed border-gray-600 hover:border-cyan-400 rounded-lg transition-colors text-center"
    >
      <Plus className="h-8 w-8 text-gray-500 mx-auto mb-2" />
      <h4 className="font-medium text-gray-400">Crear Nueva Plantilla</h4>
      <p className="text-gray-500 text-sm mt-1">Personalizada desde cero</p>
    </button>
  );
}

// Componente para tarjeta de plantilla del usuario
interface UserTemplateCardProps {
  template: MedicalTemplate;
  isFavorite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
}

function UserTemplateCard({ 
  template, 
  isFavorite, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onToggleFavorite 
}: UserTemplateCardProps) {
  return (
    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">{template.name}</h4>
          <p className="text-gray-400 text-sm">{template.description}</p>
        </div>
        
        <button
          onClick={onToggleFavorite}
          className={`p-1 rounded transition-colors ${
            isFavorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-500 hover:text-gray-400'
          }`}
        >
          {isFavorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs mb-4">
        <div className="flex items-center space-x-2">
          {template.specialty && (
            <span className="px-2 py-1 bg-gray-600 text-gray-300 rounded">
              {template.specialty}
            </span>
          )}
          <span className="text-gray-500">
            {template.content.sections.length} secciones
          </span>
          <span className="text-gray-500">
            Usado {template.usage_count} veces
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
        >
          <Edit className="h-3 w-3" />
          <span>Editar</span>
        </button>
        
        <button
          onClick={onDuplicate}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
        >
          <Copy className="h-3 w-3" />
        </button>
        
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}