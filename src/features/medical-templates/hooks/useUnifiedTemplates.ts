import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTemplates } from '@/features/medical-templates/hooks/useTemplates';
import type { MedicalTemplate, PhysicalExamTemplateDefinition } from '@/lib/database.types';

interface UnifiedTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'interrogatorio' | 'exploracion' | 'prescripcion' | 'physical_exam';
  specialty?: string;
  content: any;
  is_public: boolean;
  is_predefined: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  source: 'medical_templates' | 'physical_exam_templates';
}

interface PhysicalExamTemplate {
  id: string;
  name: string;
  doctor_id: string;
  definition: PhysicalExamTemplateDefinition;
  is_active: boolean;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export function useUnifiedTemplates() {
  const [unifiedTemplates, setUnifiedTemplates] = useState<UnifiedTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const medicalTemplatesHook = useTemplates();

  // Obtener plantillas de exploración física
  const fetchPhysicalExamTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('physical_exam_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      // Error log removed for security;
      return [];
    }
  }, []);

  // Convertir plantilla de exploración física a formato unificado
  const convertPhysicalExamTemplate = (template: PhysicalExamTemplate): UnifiedTemplate => {
    return {
      id: template.id,
      name: template.name,
      description: `Plantilla de exploración física con ${template.definition?.sections?.length || 0} secciones`,
      type: 'physical_exam' as const,
      specialty: undefined,
      content: template.definition,
      is_public: template.is_public,
      is_predefined: false,
      usage_count: template.usage_count || 0,
      created_at: template.created_at,
      updated_at: template.updated_at,
      source: 'physical_exam_templates'
    };
  };

  // Convertir plantilla médica a formato unificado
  const convertMedicalTemplate = (template: MedicalTemplate): UnifiedTemplate => {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      specialty: template.specialty,
      content: template.content,
      is_public: template.is_public,
      is_predefined: template.is_predefined,
      usage_count: template.usage_count,
      created_at: template.created_at,
      updated_at: template.updated_at,
      source: 'medical_templates'
    };
  };

  // Buscar todas las plantillas
  const searchAllTemplates = useCallback(async (params: {
    type?: string;
    search?: string;
    specialty?: string;
    includePhysicalExam?: boolean;
  } = {}) => {
    try {
      setLoading(true);
      setError(null);

      const results: UnifiedTemplate[] = [];

      // Obtener plantillas médicas estándar
      if (!params.type || ['interrogatorio', 'exploracion', 'prescripcion'].includes(params.type)) {
        const medicalTemplatesResult = await medicalTemplatesHook.searchTemplates({
          type: params.type as any,
          search: params.search,
          specialty: params.specialty
        });
        
        results.push(
          ...medicalTemplatesResult.templates.map(convertMedicalTemplate)
        );
      }

      // Obtener plantillas de exploración física
      if (params.includePhysicalExam !== false && (!params.type || params.type === 'physical_exam' || params.type === 'exploracion')) {
        const physicalExamTemplates = await fetchPhysicalExamTemplates();
        
        results.push(
          ...physicalExamTemplates
            .filter(template => {
              if (params.search) {
                return template.name.toLowerCase().includes(params.search.toLowerCase());
              }
              return true;
            })
            .map(convertPhysicalExamTemplate)
        );
      }

      // Ordenar por fecha de actualización (más recientes primero)
      results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setUnifiedTemplates(results);
      return results;
    } catch (err) {
      // Error log removed for security;
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return [];
    } finally {
      setLoading(false);
    }
  }, [medicalTemplatesHook, fetchPhysicalExamTemplates]);

  // Obtener estadísticas unificadas
  const getUnifiedStats = useCallback(async () => {
    try {
      const allTemplates = await searchAllTemplates();
      
      const stats = {
        total: allTemplates.length,
        by_type: {
          interrogatorio: allTemplates.filter(t => t.type === 'interrogatorio').length,
          exploracion: allTemplates.filter(t => t.type === 'exploracion').length,
          prescripcion: allTemplates.filter(t => t.type === 'prescripcion').length,
          physical_exam: allTemplates.filter(t => t.type === 'physical_exam').length
        },
        by_source: {
          medical_templates: allTemplates.filter(t => t.source === 'medical_templates').length,
          physical_exam_templates: allTemplates.filter(t => t.source === 'physical_exam_templates').length
        },
        most_used: allTemplates
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 5),
        recent: allTemplates
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
      };

      return stats;
    } catch (err) {
      // Error log removed for security;
      return null;
    }
  }, [searchAllTemplates]);

  // Convertir plantilla unificada de vuelta a su formato original para uso
  const convertToOriginalFormat = useCallback((unifiedTemplate: UnifiedTemplate) => {
    if (unifiedTemplate.source === 'physical_exam_templates') {
      return {
        id: unifiedTemplate.id,
        name: unifiedTemplate.name,
        doctor_id: '', // Se establecerá en el componente que lo use
        definition: unifiedTemplate.content as PhysicalExamTemplateDefinition,
        is_active: true,
        created_at: unifiedTemplate.created_at
      };
    } else {
      return {
        id: unifiedTemplate.id,
        name: unifiedTemplate.name,
        description: unifiedTemplate.description,
        type: unifiedTemplate.type,
        specialty: unifiedTemplate.specialty,
        content: unifiedTemplate.content,
        is_public: unifiedTemplate.is_public,
        is_predefined: unifiedTemplate.is_predefined,
        usage_count: unifiedTemplate.usage_count,
        created_at: unifiedTemplate.created_at,
        updated_at: unifiedTemplate.updated_at
      };
    }
  }, []);

  // Eliminar plantilla (cualquier tipo)
  const deleteUnifiedTemplate = useCallback(async (templateId: string, source: 'medical_templates' | 'physical_exam_templates') => {
    try {
      if (source === 'medical_templates') {
        await medicalTemplatesHook.deleteTemplate(templateId);
      } else {
        const { error } = await supabase
          .from('physical_exam_templates')
          .update({ is_active: false })
          .eq('id', templateId);
        
        if (error) throw error;
      }
      
      // Actualizar lista local
      setUnifiedTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      // Error log removed for security;
      throw err;
    }
  }, [medicalTemplatesHook]);

  return {
    // Estado
    unifiedTemplates,
    loading,
    error,

    // Funciones principales
    searchAllTemplates,
    getUnifiedStats,
    convertToOriginalFormat,
    deleteUnifiedTemplate,

    // Hooks delegados
    medicalTemplates: medicalTemplatesHook,
    fetchPhysicalExamTemplates,

    // Utilidades
    clearError: () => setError(null)
  };
}
