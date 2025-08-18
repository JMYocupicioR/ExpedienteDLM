import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, Search, Star, Clock, Users, BookOpen, X, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MedicalTemplate } from '@/lib/database.types';

interface TemplateAssistantProps {
  currentCondition: string;
  diagnosis: string;
  doctorId: string;
  clinicId?: string;
  onSelectTemplate: (template: MedicalTemplate, templateType: 'interrogatorio' | 'exploracion' | 'prescripcion') => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SuggestedTemplate extends MedicalTemplate {
  relevanceScore: number;
  matchedKeywords: string[];
  source: 'personal' | 'clinic' | 'public';
}

export default function TemplateAssistant({
  currentCondition,
  diagnosis,
  doctorId,
  clinicId,
  onSelectTemplate,
  isOpen,
  onClose
}: TemplateAssistantProps) {
  const [suggestedTemplates, setSuggestedTemplates] = useState<{
    interrogatorio: SuggestedTemplate[];
    exploracion: SuggestedTemplate[];
    prescripcion: SuggestedTemplate[];
  }>({
    interrogatorio: [],
    exploracion: [],
    prescripcion: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'interrogatorio' | 'exploracion' | 'prescripcion'>('interrogatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(true);

  // Extraer palabras clave del texto
  const extractKeywords = (text: string): string[] => {
    if (!text) return [];
    
    // Palabras clave médicas comunes que son relevantes
    const medicalKeywords = [
      'dolor', 'fiebre', 'inflamación', 'infección', 'fractura', 'lesión',
      'hipertensión', 'diabetes', 'cardiovascular', 'respiratorio', 'neurológico',
      'ortopédico', 'dermatológico', 'gastroenterológico', 'urológico',
      'cefalea', 'migraña', 'artritis', 'asma', 'bronquitis', 'neumonía',
      'angina', 'infarto', 'arritmia', 'taquicardia', 'bradicardia',
      'hepatitis', 'gastritis', 'colitis', 'úlcera', 'reflujo',
      'ansiedad', 'depresión', 'insomnio', 'vértigo', 'mareo',
      'lumbalgia', 'cervicalgia', 'dorsalgia', 'ciática', 'hernia',
      'esguince', 'contusión', 'luxación', 'tendinitis', 'bursitis',
      'conjuntivitis', 'otitis', 'faringitis', 'sinusitis', 'rinitis',
      'embarazo', 'parto', 'lactancia', 'menopausia', 'menstruación',
      'pediátrico', 'geriátrico', 'adulto', 'adolescente', 'infantil'
    ];

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const relevantWords = words.filter(word => 
      medicalKeywords.some(keyword => 
        keyword.includes(word) || word.includes(keyword)
      )
    );

    return [...new Set(relevantWords)];
  };

  // Calcular relevancia de una plantilla
  const calculateRelevance = (template: MedicalTemplate, keywords: string[]): { score: number; matches: string[] } => {
    if (keywords.length === 0) return { score: 0, matches: [] };

    const templateText = [
      template.name,
      template.description || '',
      template.specialty || '',
      ...(template.tags || []),
      JSON.stringify(template.content)
    ].join(' ').toLowerCase();

    const matches: string[] = [];
    let score = 0;

    keywords.forEach(keyword => {
      const keywordCount = (templateText.match(new RegExp(keyword, 'g')) || []).length;
      if (keywordCount > 0) {
        matches.push(keyword);
        score += keywordCount * (keyword.length > 5 ? 2 : 1); // Palabras más largas valen más
      }
    });

    // Bonus por especialidad específica
    if (template.specialty && keywords.some(k => template.specialty!.toLowerCase().includes(k))) {
      score += 5;
    }

    // Bonus por uso frecuente
    score += Math.min(template.usage_count * 0.1, 2);

    return { score, matches };
  };

  // Buscar plantillas y calcular sugerencias
  const searchTemplatesWithRelevance = async () => {
    if (!currentCondition && !diagnosis) {
      setSuggestedTemplates({ interrogatorio: [], exploracion: [], prescripcion: [] });
      return;
    }

    setLoading(true);
    try {
      const combinedText = `${currentCondition} ${diagnosis}`;
      const keywords = extractKeywords(combinedText);

      if (keywords.length === 0) {
        setSuggestedTemplates({ interrogatorio: [], exploracion: [], prescripcion: [] });
        return;
      }

      // Buscar plantillas con diferentes prioridades
      const queries = [
        // 1. Plantillas personales del doctor
        supabase
          .from('medical_templates')
          .select('*')
          .eq('user_id', doctorId)
          .eq('is_active', true),
        
        // 2. Plantillas de la clínica (si existe)
        ...(clinicId ? [
          supabase
            .from('medical_templates')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .neq('user_id', doctorId)
        ] : []),
        
        // 3. Plantillas públicas
        supabase
          .from('medical_templates')
          .select('*')
          .eq('is_public', true)
          .eq('is_active', true)
          .neq('user_id', doctorId)
      ];

      const results = await Promise.all(queries);
      
      const allTemplates: MedicalTemplate[] = [];
      const templateSources: { [id: string]: 'personal' | 'clinic' | 'public' } = {};

      // Procesar resultados con prioridad
      results.forEach((result, index) => {
        if (result.data) {
          result.data.forEach((template: MedicalTemplate) => {
            if (!allTemplates.find(t => t.id === template.id)) {
              allTemplates.push(template);
              if (index === 0) templateSources[template.id] = 'personal';
              else if (index === 1 && clinicId) templateSources[template.id] = 'clinic';
              else templateSources[template.id] = 'public';
            }
          });
        }
      });

      // Calcular relevancia y organizar por tipo
      const categorizedSuggestions = {
        interrogatorio: [] as SuggestedTemplate[],
        exploracion: [] as SuggestedTemplate[],
        prescripcion: [] as SuggestedTemplate[]
      };

      allTemplates.forEach(template => {
        const { score, matches } = calculateRelevance(template, keywords);
        
        if (score > 0) {
          const suggestedTemplate: SuggestedTemplate = {
            ...template,
            relevanceScore: score,
            matchedKeywords: matches,
            source: templateSources[template.id]
          };

          categorizedSuggestions[template.type].push(suggestedTemplate);
        }
      });

      // Ordenar por relevancia y fuente
      Object.keys(categorizedSuggestions).forEach(type => {
        const typeKey = type as keyof typeof categorizedSuggestions;
        categorizedSuggestions[typeKey].sort((a, b) => {
          // Primero por fuente (personal > clinic > public)
          const sourceOrder = { personal: 3, clinic: 2, public: 1 };
          const sourceDiff = sourceOrder[b.source] - sourceOrder[a.source];
          if (sourceDiff !== 0) return sourceDiff;
          
          // Luego por relevancia
          return b.relevanceScore - a.relevanceScore;
        });
        
        // Limitar a top 5 por categoría
        categorizedSuggestions[typeKey] = categorizedSuggestions[typeKey].slice(0, 5);
      });

      setSuggestedTemplates(categorizedSuggestions);

    } catch (error) {
      console.error('Error searching templates:', error);
      setSuggestedTemplates({ interrogatorio: [], exploracion: [], prescripcion: [] });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar plantillas por término de búsqueda
  const filteredTemplates = useMemo(() => {
    const templates = suggestedTemplates[activeTab];
    
    if (!searchTerm) {
      return showOnlyRelevant ? templates.filter(t => t.relevanceScore > 1) : templates;
    }

    return templates.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suggestedTemplates, activeTab, searchTerm, showOnlyRelevant]);

  // Ejecutar búsqueda cuando cambien los campos
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchTemplatesWithRelevance();
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timeoutId);
  }, [currentCondition, diagnosis, doctorId, clinicId]);

  // Render del icono de fuente
  const renderSourceIcon = (source: 'personal' | 'clinic' | 'public') => {
    switch (source) {
      case 'personal':
        return <Star className="h-3 w-3 text-yellow-400" title="Plantilla personal" />;
      case 'clinic':
        return <Users className="h-3 w-3 text-blue-400" title="Plantilla de clínica" />;
      case 'public':
        return <BookOpen className="h-3 w-3 text-green-400" title="Plantilla pública" />;
    }
  };

  if (!isOpen) return null;

  const totalSuggestions = Object.values(suggestedTemplates).reduce((sum, templates) => sum + templates.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lightbulb className="h-6 w-6 text-cyan-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">Asistente de Plantillas</h3>
                <p className="text-sm text-gray-400">
                  {totalSuggestions > 0 
                    ? `${totalSuggestions} plantillas sugeridas basadas en tu consulta`
                    : 'Ingresa información en "Padecimiento Actual" o "Diagnóstico" para ver sugerencias'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Controles de búsqueda y filtros */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar plantillas..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={showOnlyRelevant}
                  onChange={(e) => setShowOnlyRelevant(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <span>Solo relevantes</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex space-x-0">
            {[
              { id: 'interrogatorio', label: 'Interrogatorio', count: suggestedTemplates.interrogatorio.length },
              { id: 'exploracion', label: 'Exploración', count: suggestedTemplates.exploracion.length },
              { id: 'prescripcion', label: 'Prescripción', count: suggestedTemplates.prescripcion.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400 bg-gray-700/50'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                  }
                `}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
              <p className="text-gray-400 mt-2">Analizando consulta y buscando plantillas...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">
                {totalSuggestions === 0 
                  ? 'No se encontraron plantillas relevantes'
                  : searchTerm 
                    ? 'No se encontraron plantillas que coincidan con tu búsqueda'
                    : 'Ajusta los filtros para ver más plantillas'
                }
              </p>
              <p className="text-sm text-gray-500">
                Prueba agregando más detalles en el padecimiento actual o diagnóstico
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:border-cyan-500 transition-all cursor-pointer group"
                  onClick={() => onSelectTemplate(template, activeTab)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {renderSourceIcon(template.source)}
                        <h4 className="font-medium text-white group-hover:text-cyan-300">
                          {template.name}
                        </h4>
                        <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                          Relevancia: {template.relevanceScore.toFixed(1)}
                        </span>
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {template.specialty && (
                          <span>Especialidad: {template.specialty}</span>
                        )}
                        <span>Usado {template.usage_count} veces</span>
                        {template.matchedKeywords.length > 0 && (
                          <span>
                            Coincide: {template.matchedKeywords.slice(0, 3).join(', ')}
                            {template.matchedKeywords.length > 3 && '...'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-400">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <span>Personal</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3 text-blue-400" />
                <span>Clínica</span>
              </div>
              <div className="flex items-center space-x-1">
                <BookOpen className="h-3 w-3 text-green-400" />
                <span>Pública</span>
              </div>
            </div>
            <p className="text-gray-500">
              Selecciona una plantilla para usarla en tu consulta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
