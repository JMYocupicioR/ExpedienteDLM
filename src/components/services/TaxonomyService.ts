import { supabase } from '@/lib/supabase'

// Taxonomy item interfaces
export interface TaxonomyItem {
  id: string
  name: string
  name_es: string
  name_en: string
  description?: string
  is_active: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

export interface MedicalCategory extends TaxonomyItem {
  icon?: string
  color?: string
}

export interface MedicalSpecialty extends TaxonomyItem {
  parent_specialty_id?: string
}

export interface BodySystem extends TaxonomyItem {}

export interface MedicalCondition extends TaxonomyItem {
  icd_10_code?: string
  snomed_code?: string
  category_id?: string
}

export interface TargetPopulation extends TaxonomyItem {
  age_range?: string
}

export interface ScaleType extends TaxonomyItem {}

/**
 * Service for managing medical taxonomy data
 */
export class TaxonomyService {
  
  // ==================== GET METHODS ====================
  
  /**
   * Get all medical categories
   */
  static async getCategories(): Promise<MedicalCategory[]> {
    console.log('\n📚 [TAXONOMY] Fetching medical categories...');
    const { data, error } = await supabase
      .from('medical_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('❌ [TAXONOMY] Error fetching categories:', error);
      throw error;
    }
    
    console.log(`✅ [TAXONOMY] Loaded ${data?.length || 0} categories`);
    return data || [];
  }
  
  /**
   * Get all medical specialties
   */
  static async getSpecialties(): Promise<MedicalSpecialty[]> {
    console.log('\n🏥 [TAXONOMY] Fetching medical specialties...');
    const { data, error } = await supabase
      .from('medical_specialties')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('❌ [TAXONOMY] Error fetching specialties:', error);
      throw error;
    }
    
    console.log(`✅ [TAXONOMY] Loaded ${data?.length || 0} specialties`);
    return data || [];
  }
  
  /**
   * Get all body systems
   */
  static async getBodySystems(): Promise<BodySystem[]> {
    console.log('\n🫀 [TAXONOMY] Fetching body systems...');
    const { data, error } = await supabase
      .from('body_systems')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('❌ [TAXONOMY] Error fetching body systems:', error);
      throw error;
    }
    
    console.log(`✅ [TAXONOMY] Loaded ${data?.length || 0} body systems`);
    return data || [];
  }
  
  /**
   * Get all medical conditions
   */
  static async getConditions(categoryId?: string): Promise<MedicalCondition[]> {
    console.log('\n🩺 [TAXONOMY] Fetching medical conditions...');
    let query = supabase
      .from('medical_conditions')
      .select('*')
      .eq('is_active', true);
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query.order('name_es', { ascending: true });
    
    if (error) {
      console.error('❌ [TAXONOMY] Error fetching conditions:', error);
      throw error;
    }
    
    console.log(`✅ [TAXONOMY] Loaded ${data?.length || 0} conditions`);
    return data || [];
  }
  
  /**
   * Get all target populations
   */
  static async getPopulations(): Promise<TargetPopulation[]> {
    console.log('\n👥 [TAXONOMY] Fetching target populations...');
    const { data, error } = await supabase
      .from('target_populations')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('❌ [TAXONOMY] Error fetching populations:', error);
      throw error;
    }
    
    console.log(`✅ [TAXONOMY] Loaded ${data?.length || 0} populations`);
    return data || [];
  }
  
  /**
   * Get all scale types
   */
  static async getScaleTypes(): Promise<ScaleType[]> {
    console.log('\n📊 [TAXONOMY] Fetching scale types...');
    const { data, error } = await supabase
      .from('scale_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('❌ [TAXONOMY] Error fetching scale types:', error);
      throw error;
    }
    
    console.log(`✅ [TAXONOMY] Loaded ${data?.length || 0} scale types`);
    return data || [];
  }
  
  // ==================== ASSIGNMENT METHODS ====================
  
  /**
   * Assign categories to a scale
   */
  static async assignCategories(scaleId: string, categoryIds: string[]): Promise<void> {
    console.log(`\n🔗 [TAXONOMY] Assigning ${categoryIds.length} categories to scale ${scaleId}...`);
    
    // Delete existing assignments
    const { error: deleteError } = await supabase
      .from('scale_medical_categories')
      .delete()
      .eq('scale_id', scaleId);
    
    if (deleteError) {
      console.error('❌ [TAXONOMY] Error deleting old category assignments:', deleteError);
      throw deleteError;
    }
    
    // Insert new assignments
    if (categoryIds.length > 0) {
      const assignments = categoryIds.map(categoryId => ({
        scale_id: scaleId,
        category_id: categoryId
      }));
      
      const { error: insertError } = await supabase
        .from('scale_medical_categories')
        .insert(assignments);
      
      if (insertError) {
        console.error('❌ [TAXONOMY] Error assigning categories:', insertError);
        throw insertError;
      }
    }
    
    console.log('✅ [TAXONOMY] Categories assigned successfully');
  }
  
  /**
   * Assign specialties to a scale
   */
  static async assignSpecialties(scaleId: string, specialtyIds: string[]): Promise<void> {
    console.log(`\n🔗 [TAXONOMY] Assigning ${specialtyIds.length} specialties to scale ${scaleId}...`);
    
    const { error: deleteError } = await supabase
      .from('scale_specialties')
      .delete()
      .eq('scale_id', scaleId);
    
    if (deleteError) throw deleteError;
    
    if (specialtyIds.length > 0) {
      const assignments = specialtyIds.map(specialtyId => ({
        scale_id: scaleId,
        specialty_id: specialtyId
      }));
      
      const { error: insertError } = await supabase
        .from('scale_specialties')
        .insert(assignments);
      
      if (insertError) throw insertError;
    }
    
    console.log('✅ [TAXONOMY] Specialties assigned successfully');
  }
  
  /**
   * Assign body systems to a scale
   */
  static async assignBodySystems(scaleId: string, systemIds: string[]): Promise<void> {
    console.log(`\n🔗 [TAXONOMY] Assigning ${systemIds.length} body systems to scale ${scaleId}...`);
    
    const { error: deleteError } = await supabase
      .from('scale_body_systems')
      .delete()
      .eq('scale_id', scaleId);
    
    if (deleteError) throw deleteError;
    
    if (systemIds.length > 0) {
      const assignments = systemIds.map(systemId => ({
        scale_id: scaleId,
        system_id: systemId
      }));
      
      const { error: insertError } = await supabase
        .from('scale_body_systems')
        .insert(assignments);
      
      if (insertError) throw insertError;
    }
    
    console.log('✅ [TAXONOMY] Body systems assigned successfully');
  }
  
  /**
   * Assign populations to a scale
   */
  static async assignPopulations(scaleId: string, populationIds: string[]): Promise<void> {
    console.log(`\n🔗 [TAXONOMY] Assigning ${populationIds.length} populations to scale ${scaleId}...`);
    
    const { error: deleteError } = await supabase
      .from('scale_populations')
      .delete()
      .eq('scale_id', scaleId);
    
    if (deleteError) throw deleteError;
    
    if (populationIds.length > 0) {
      const assignments = populationIds.map(populationId => ({
        scale_id: scaleId,
        population_id: populationId
      }));
      
      const { error: insertError } = await supabase
        .from('scale_populations')
        .insert(assignments);
      
      if (insertError) throw insertError;
    }
    
    console.log('✅ [TAXONOMY] Populations assigned successfully');
  }
  
  /**
   * Assign scale types to a scale
   */
  static async assignScaleTypes(scaleId: string, typeIds: string[]): Promise<void> {
    console.log(`\n🔗 [TAXONOMY] Assigning ${typeIds.length} scale types to scale ${scaleId}...`);
    
    const { error: deleteError } = await supabase
      .from('scale_scale_types')
      .delete()
      .eq('scale_id', scaleId);
    
    if (deleteError) throw deleteError;
    
    if (typeIds.length > 0) {
      const assignments = typeIds.map(typeId => ({
        scale_id: scaleId,
        type_id: typeId
      }));
      
      const { error: insertError } = await supabase
        .from('scale_scale_types')
        .insert(assignments);
      
      if (insertError) throw insertError;
    }
    
    console.log('✅ [TAXONOMY] Scale types assigned successfully');
  }
  
  // ==================== RETRIEVAL METHODS ====================
  
  /**
   * Get all taxonomy assignments for a scale
   */
  static async getScaleTaxonomies(scaleId: string) {
    console.log(`\n📖 [TAXONOMY] Fetching taxonomies for scale ${scaleId}...`);
    
    const [categories, specialties, bodySystems, populations, scaleTypes] = await Promise.all([
      supabase
        .from('scale_medical_categories')
        .select('category_id, medical_categories(*)')
        .eq('scale_id', scaleId),
      supabase
        .from('scale_specialties')
        .select('specialty_id, medical_specialties(*)')
        .eq('scale_id', scaleId),
      supabase
        .from('scale_body_systems')
        .select('system_id, body_systems(*)')
        .eq('scale_id', scaleId),
      supabase
        .from('scale_populations')
        .select('population_id, target_populations(*)')
        .eq('scale_id', scaleId),
      supabase
        .from('scale_scale_types')
        .select('type_id, scale_types(*)')
        .eq('scale_id', scaleId)
    ]);
    
    console.log('✅ [TAXONOMY] Taxonomies retrieved');
    
    return {
      categories: categories.data || [],
      specialties: specialties.data || [],
      bodySystems: bodySystems.data || [],
      populations: populations.data || [],
      scaleTypes: scaleTypes.data || []
    };
  }

  // ==================== BULK RETRIEVAL FOR FILTERING ====================

  /**
   * Fetch all 5 taxonomy catalogs in a single parallel call.
   * Returns the catalogs keyed by dimension name.
   */
  static async getAllTaxonomyCatalogs() {
    const [categories, specialties, bodySystems, populations, scaleTypes] = await Promise.all([
      this.getCategories(),
      this.getSpecialties(),
      this.getBodySystems(),
      this.getPopulations(),
      this.getScaleTypes()
    ]);

    return { categories, specialties, bodySystems, populations, scaleTypes };
  }

  /**
   * Fetch all scale↔taxonomy junction rows and build an index:
   *   Record<scaleId, { categoryIds, specialtyIds, bodySystemIds, populationIds, scaleTypeIds }>
   * 
   * This allows pure client-side filtering without extra DB queries when
   * the user changes taxonomy filters.
   */
  static async getScaleTaxonomyIndex(): Promise<
    Record<string, {
      categoryIds: string[];
      specialtyIds: string[];
      bodySystemIds: string[];
      populationIds: string[];
      scaleTypeIds: string[];
    }>
  > {
    console.log('\n🗂️ [TAXONOMY] Building scale taxonomy index...');

    const [cats, specs, bodies, pops, types] = await Promise.all([
      supabase.from('scale_medical_categories').select('scale_id, category_id'),
      supabase.from('scale_specialties').select('scale_id, specialty_id'),
      supabase.from('scale_body_systems').select('scale_id, system_id'),
      supabase.from('scale_populations').select('scale_id, population_id'),
      supabase.from('scale_scale_types').select('scale_id, type_id')
    ]);

    const index: Record<string, {
      categoryIds: string[];
      specialtyIds: string[];
      bodySystemIds: string[];
      populationIds: string[];
      scaleTypeIds: string[];
    }> = {};

    const ensure = (id: string) => {
      if (!index[id]) {
        index[id] = { categoryIds: [], specialtyIds: [], bodySystemIds: [], populationIds: [], scaleTypeIds: [] };
      }
      return index[id];
    };

    (cats.data || []).forEach((r: any) => { ensure(r.scale_id).categoryIds.push(r.category_id); });
    (specs.data || []).forEach((r: any) => { ensure(r.scale_id).specialtyIds.push(r.specialty_id); });
    (bodies.data || []).forEach((r: any) => { ensure(r.scale_id).bodySystemIds.push(r.system_id); });
    (pops.data || []).forEach((r: any) => { ensure(r.scale_id).populationIds.push(r.population_id); });
    (types.data || []).forEach((r: any) => { ensure(r.scale_id).scaleTypeIds.push(r.type_id); });

    const scaleCount = Object.keys(index).length;
    console.log(`✅ [TAXONOMY] Index built for ${scaleCount} scales`);
    return index;
  }
}
