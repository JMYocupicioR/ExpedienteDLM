import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  MedicalTemplate, 
  TemplateCategory, 
  TemplateFormData, 
  TemplateSearchParams,
  TemplateSearchResult,
  TemplateStats,
  TemplateFavorite,
  TemplateUsage
} from '../lib/database.types';
import { useAuth } from './useAuth';

export function useTemplates() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<MedicalTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [favorites, setFavorites] = useState<TemplateFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener categorías
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('template_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, []);

  // Buscar plantillas
  const searchTemplates = useCallback(async (params: TemplateSearchParams = {}): Promise<TemplateSearchResult> => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('medical_templates')
        .select(`
          *,
          category:template_categories(*)
        `)
        .eq('is_active', true);

      // Filtros
      if (params.type) {
        query = query.eq('type', params.type);
      }

      if (params.specialty) {
        query = query.eq('specialty', params.specialty);
      }

      if (params.category_id) {
        query = query.eq('category_id', params.category_id);
      }

      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%,specialty.ilike.%${params.search}%`);
      }

      // Filtros de acceso
      if (params.user_id && !params.include_public) {
        query = query.eq('user_id', params.user_id);
      } else if (user) {
        // Mostrar plantillas del usuario, públicas y predefinidas
        query = query.or(`user_id.eq.${user.id},is_public.eq.true,is_predefined.eq.true`);
      } else {
        // Solo plantillas públicas y predefinidas para usuarios no autenticados
        query = query.or('is_public.eq.true,is_predefined.eq.true');
      }

      // Paginación
      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      // Ordenamiento
      query = query.order('is_predefined', { ascending: false })
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const result: TemplateSearchResult = {
        templates: data || [],
        total: count || 0,
        categories: categories
      };

      setTemplates(data || []);
      return result;

    } catch (err) {
      console.error('Error searching templates:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, categories]);

  // Obtener plantilla por ID
  const getTemplate = useCallback(async (id: string): Promise<MedicalTemplate | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('medical_templates')
        .select(`
          *,
          category:template_categories(*)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;

    } catch (err) {
      console.error('Error fetching template:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear nueva plantilla
  const createTemplate = useCallback(async (templateData: TemplateFormData): Promise<MedicalTemplate> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);

      const newTemplate = {
        user_id: user.id,
        clinic_id: profile?.clinic_id,
        created_by: user.id,
        ...templateData
      };

      const { data, error } = await supabase
        .from('medical_templates')
        .insert([newTemplate])
        .select(`
          *,
          category:template_categories(*)
        `)
        .single();

      if (error) throw error;
      
      // Actualizar lista local
      setTemplates(prev => [data, ...prev]);
      
      return data;

    } catch (err) {
      console.error('Error creating template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear plantilla';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // Actualizar plantilla
  const updateTemplate = useCallback(async (id: string, templateData: Partial<TemplateFormData>): Promise<MedicalTemplate> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);

      const updates = {
        ...templateData,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('medical_templates')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id) // Solo el propietario puede actualizar
        .select(`
          *,
          category:template_categories(*)
        `)
        .single();

      if (error) throw error;

      // Actualizar lista local
      setTemplates(prev => prev.map(t => t.id === id ? data : t));
      
      return data;

    } catch (err) {
      console.error('Error updating template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar plantilla';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Eliminar plantilla
  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);

      const { error } = await supabase
        .from('medical_templates')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id); // Solo el propietario puede eliminar

      if (error) throw error;

      // Actualizar lista local
      setTemplates(prev => prev.filter(t => t.id !== id));

    } catch (err) {
      console.error('Error deleting template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar plantilla';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Duplicar plantilla
  const duplicateTemplate = useCallback(async (originalId: string, newName?: string): Promise<MedicalTemplate> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      setLoading(true);

      // Obtener plantilla original
      const original = await getTemplate(originalId);
      if (!original) throw new Error('Plantilla no encontrada');

      // Crear copia
      const duplicateData: TemplateFormData = {
        name: newName || `${original.name} (Copia)`,
        description: original.description || '',
        type: original.type,
        specialty: original.specialty,
        content: original.content,
        tags: [...original.tags],
        is_public: false, // Las copias no son públicas por defecto
        category_id: original.category_id
      };

      return await createTemplate(duplicateData);

    } catch (err) {
      console.error('Error duplicating template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al duplicar plantilla';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, getTemplate, createTemplate]);

  // Obtener favoritos del usuario
  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('template_favorites')
        .select(`
          *,
          template:medical_templates(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }, [user]);

  // Agregar/quitar favorito
  const toggleFavorite = useCallback(async (templateId: string): Promise<boolean> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      const existingFavorite = favorites.find(f => f.template_id === templateId);

      if (existingFavorite) {
        // Quitar de favoritos
        const { error } = await supabase
          .from('template_favorites')
          .delete()
          .eq('id', existingFavorite.id);

        if (error) throw error;
        setFavorites(prev => prev.filter(f => f.id !== existingFavorite.id));
        return false;
      } else {
        // Agregar a favoritos
        const { data, error } = await supabase
          .from('template_favorites')
          .insert([{ user_id: user.id, template_id: templateId }])
          .select('*')
          .single();

        if (error) throw error;
        setFavorites(prev => [...prev, data]);
        return true;
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      throw err;
    }
  }, [user, favorites]);

  // Registrar uso de plantilla
  const recordTemplateUsage = useCallback(async (
    templateId: string, 
    context: { patientId?: string; consultationId?: string; [key: string]: unknown } = {}
  ): Promise<void> => {
    if (!user) return;

    try {
      const usage: Omit<TemplateUsage, 'id' | 'used_at'> = {
        template_id: templateId,
        user_id: user.id,
        patient_id: context.patientId,
        consultation_id: context.consultationId,
        context
      };

      const { error } = await supabase
        .from('template_usage')
        .insert([usage]);

      if (error) throw error;
    } catch (err) {
      console.error('Error recording template usage:', err);
    }
  }, [user]);

  // Obtener estadísticas de plantillas
  const getTemplateStats = useCallback(async (): Promise<TemplateStats | null> => {
    if (!user) return null;

    try {
      // Obtener totales por tipo
      const { data: typeStats } = await supabase
        .from('medical_templates')
        .select('type')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Obtener más usadas
      const { data: mostUsed } = await supabase
        .from('medical_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(5);

      // Obtener recientes
      const { data: recent } = await supabase
        .from('medical_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      const stats: TemplateStats = {
        total_templates: typeStats?.length || 0,
        by_type: {
          interrogatorio: typeStats?.filter(t => t.type === 'interrogatorio').length || 0,
          exploracion: typeStats?.filter(t => t.type === 'exploracion').length || 0,
          prescripcion: typeStats?.filter(t => t.type === 'prescripcion').length || 0
        },
        most_used: mostUsed || [],
        recent: recent || []
      };

      return stats;
    } catch (err) {
      console.error('Error fetching template stats:', err);
      return null;
    }
  }, [user]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchCategories();
    if (user) {
      fetchFavorites();
    }
  }, [user, fetchCategories, fetchFavorites]);

  return {
    // Estado
    templates,
    categories,
    favorites,
    loading,
    error,
    
    // Funciones principales
    searchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    
    // Favoritos
    toggleFavorite,
    
    // Uso y estadísticas
    recordTemplateUsage,
    getTemplateStats,
    
    // Utilidades
    fetchCategories,
    fetchFavorites,
    clearError: () => setError(null)
  };
}