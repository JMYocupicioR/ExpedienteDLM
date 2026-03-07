import { supabase } from '../lib/supabase'
import { MedicalScale } from '../medical-scale.schema'
import { logger } from '../utils/logger'


export class ScaleService {
  /**
   * Check if the current user is a super administrator
   */
  static async isSuperAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check directly in the profiles table which has the 'role' text column
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }

    return profile?.role === 'super_admin';
  }

  /**
   * Get the current user's profile information
   */
  static async getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting user profile:', error);
      return null;
    }

    return profile;
  }

  /**
   * Get the current user's role name
   */
  static async getCurrentUserRole(): Promise<string | null> {
    const profile = await this.getCurrentUserProfile();
    return profile?.role || null;
  }


  /**
   * Helper to resolve a storage path or full URL to a usable public URL
   */
  static getPublicUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const { data } = supabase.storage
      .from('scales-assets')
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Upload an image to the scales-assets bucket
   */
  static async uploadScaleImage(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('scales-assets')
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      logger.error('❌ [UPLOAD_IMAGE] Error uploading image', error);
      throw error;
    }

    return data.path;
  }

  /**
   * Fetch all published scales with their current version
   */
  /**
   * Fetch scales with optional status filter (for admins)
   */
  static async getScales(status?: 'active' | 'draft' | 'deprecated') {
    logger.log('📚 [GET_SCALES] Cargando escalas', { status: status || 'all' });
    
    let query = supabase
      .from('medical_scales')
      .select(`
        *,
        questions:scale_questions(
          *,
          options:question_options!question_id(*)
        ),
        scoring:scale_scoring(
          *,
          ranges:scoring_ranges(*)
        ),
        references:scale_references(id)
      `)
      .order('created_at', { ascending: false })
  
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: scales, error } = await query
      
    if (error) {
      logger.error('❌ [GET_SCALES] Error al cargar escalas', error);
      console.error('❌ [GET_SCALES] Error:', error);
      throw error;
    }
    
    // console.log('🔍 [GET_SCALES] RAW DATA from Supabase:', JSON.stringify(scales?.[0], null, 2));
    
    logger.log(`✅ [GET_SCALES] Escalas cargadas: ${scales?.length || 0}`);
    if (scales && scales.length > 0) {
       const firstScale = scales[0];
       logger.log('📊 [GET_SCALES] Detalles primera escala', {
         name: firstScale.name,
         questions: firstScale.questions?.length || 0,
         scoringMethod: firstScale.scoring?.scoring_method || 'N/A',
         ranges: firstScale.scoring?.ranges?.length || 0
       });
    }
    
    // Transform to MedicalScale format with synthesized current_version
    const transformed = scales?.map(scale => {
      // Transform scoring to schema format (same logic as getScaleById)
      const rawScoring = Array.isArray(scale.scoring) ? scale.scoring[0] : scale.scoring;
      const scoringData = rawScoring || { scoring_method: 'sum', ranges: [], domains: [] };
      const scoringSchema = {
        engine: scoringData.scoring_method === 'weighted' ? 'sum' : (scoringData.scoring_method || 'sum'),
        ranges: scoringData.ranges?.map((r: any) => ({
          min: r.min_value,
          max: r.max_value,
          label: r.interpretation_level,
          color: r.color_code,
          interpretation: r.interpretation_text,
          alert_level: r.severity_level || 'none'
        })) || [],
        domains: scoringData.domains || [] // Load domains
      };


      return {
        ...scale,
        categories: scale.tags || [],
        current_version: {
          version_number: scale.version || '1.0',
          status: scale.status,
          config: {
            bibliography: scale.references || [],
            instructions: scale.instructions,
            estimated_time: scale.time_to_complete ? parseInt(scale.time_to_complete) : 5,
            tags: scale.tags,
            language: scale.language,
            original_author: scale.original_author || scale.validated_by
          },
          questions: scale.questions?.sort((a: any, b: any) => a.order_index - b.order_index).map((q: any) => ({
            id: q.question_id,
            text: q.question_text,
            type: q.question_type,
            description: q.description,
            order_index: q.order_index,
            image_url: this.getPublicUrl(q.image_url),
            options: q.options?.sort((a: any, b: any) => a.order_index - b.order_index).map((o: any) => ({
              label: o.option_label,
              value: Number(o.option_value),
              score: Number(o.option_value),
              order_index: o.order_index
            })) || [],
            logic: q.conditional_logic,
            validation: q.validation_rules
          })) || [], 
          scoring: scoringSchema
        }
      };
    }) as MedicalScale[];
    
    console.log('✅ [GET_SCALES] Transformación completada');
    return transformed;
  }

  /**
   * Fetch all published scales (legacy alias)
   */
  static async getPublishedScales() {
    return this.getScales('active');
  }

  static async getScaleById(scaleId: string) {
    logger.log('🔍 [GET_SCALE_BY_ID] Cargando escala', { id: scaleId });
    
    const { data, error } = await supabase
      .from('medical_scales')
      .select(`
        *,
        questions:scale_questions(
          *,
          options:question_options!question_id(*)
        ),
        scoring:scale_scoring(
          *,
          ranges:scoring_ranges(*)
        ),
        references:scale_references(*)
      `)
      .eq('id', scaleId)
      .single()

    if (error) {
      logger.error('❌ [GET_SCALE_BY_ID] Error al cargar escala', error);
      console.error('❌ [GET_SCALE_BY_ID] Error:', error);
      throw error;
    }
    
    logger.log(`✅ [GET_SCALE_BY_ID] Escala cargada: ${data.name}`);
    
    // Transform scoring to schema format
    // Supabase .single() with joins returns scoring as an object if it's 1-to-1, 
    // or an array if it's 1-to-many. Let's handle both for robustness.
    const rawScoring = Array.isArray(data.scoring) ? data.scoring[0] : data.scoring;
    const scoringData = rawScoring || { scoring_method: 'sum', ranges: [], domains: [] };
    
    const scoringSchema = {
      engine: scoringData.scoring_method === 'weighted' ? 'sum' : (scoringData.scoring_method || 'sum'),
      ranges: scoringData.ranges?.map((r: any) => ({
        min: r.min_value,
        max: r.max_value,
        label: r.interpretation_level,
        color: r.color_code,
        interpretation: r.interpretation_text,
        alert_level: r.severity_level || 'none'
      })) || [],
      domains: scoringData.domains || []
    };
    
    // Log scoring details if needed, but keep it cleaner
    // logger.log('📊 [GET_SCALE_BY_ID] Schema de scoring transformado', scoringSchema);

    // Synthesize current_version
    const currentVersion = {
      version_number: data.version || '1.0',
      status: data.status,
      config: {
        bibliography: data.references || [],
        instructions: data.instructions,
        estimated_time: data.time_to_complete ? parseInt(data.time_to_complete) : 5,
        tags: data.tags || [],
        original_author: data.original_author,
        language: data.language,
        validation_info: data.evidence_level
      },
      questions: data.questions?.sort((a: any, b: any) => a.order_index - b.order_index).map((q: any) => ({
        id: q.question_id,
        type: q.question_type,
        text: q.question_text,
        description: q.description,
        order_index: q.order_index,
        options: q.options?.sort((a: any, b: any) => a.order_index - b.order_index).map((o: any) => ({
          label: o.option_label,
          value: Number(o.option_value),
          score: Number(o.option_value),
          order_index: o.order_index
        })),
        image_url: this.getPublicUrl(q.image_url),
        logic: q.conditional_logic,
        validation: q.validation_rules
      })) || [],
      scoring: scoringSchema
    };

    return {
      ...data,
      categories: data.tags || [],
      current_version: currentVersion
    } as MedicalScale
  }

  /**
   * Delete a scale and all its related data
   */
  static async deleteScale(scaleId: string) {
    // RLS policies should handle cascading if configured, or we rely on foreign key constraints with ON DELETE CASCADE
    // Assuming the database schema has ON DELETE CASCADE for related tables (questions, scoring, references)
    
    const { error } = await supabase
      .from('medical_scales')
      .delete()
      .eq('id', scaleId);

    if (error) throw error;
  }

  /**
   * Publish a new version of a scale
   */
  static async publishScale(scaleData: MedicalScale): Promise<string> {
    console.log('\n🚀 [PUBLISH_SCALE] === INICIO DEL GUARDADO ===');
    console.log('📦 [PUBLISH_SCALE] Datos recibidos:', JSON.stringify(scaleData, null, 2));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    console.log('👤 [PUBLISH_SCALE] Usuario:', user.id);

    // 1. Create or update the root scale
    let scaleId: string;
    
    // Check if ID is provided (Update mode)
    if (scaleData.id) {
        scaleId = scaleData.id;
        console.log('🔄 [MEDICAL_SCALES] Actualizando escala existente con ID:', scaleId);
        const { error: updateError } = await supabase.from('medical_scales').update({
            name: scaleData.name,
            acronym: scaleData.acronym,
            description: scaleData.description,
            category: scaleData.categories[0] || 'General',
            tags: scaleData.categories,
            status: scaleData.current_version?.status || 'draft', // Support status update
            updated_at: new Date().toISOString(),
            // Sync metadata
            instructions: scaleData.current_version?.config.instructions,
            time_to_complete: scaleData.current_version?.config.estimated_time?.toString(),
            language: scaleData.current_version?.config.language,
            original_author: scaleData.current_version?.config.original_author,
            evidence_level: scaleData.current_version?.config.validation_info
        }).eq('id', scaleId);
        
        if (updateError) {
          console.error('❌ [MEDICAL_SCALES] Error al actualizar escala:', updateError);
          throw updateError;
        }
        console.log('✅ [MEDICAL_SCALES] Escala actualizada correctamente.');

    } else {
        console.log('✨ [MEDICAL_SCALES] Creando nueva escala o buscando existente.');
        // Check if it already exists by acronym or name (Legacy check, maybe optional now?)
        const { data: existing } = await supabase
        .from('medical_scales')
        .select('id')
        .or(`acronym.eq.${scaleData.acronym},name.eq.${scaleData.name}`)
        .maybeSingle();

        console.log('🔍 [PUBLISH_SCALE] Buscando escala existente:', existing);

        if (existing) {
        scaleId = existing.id;
        console.log('🔄 [MEDICAL_SCALES] Escala existente encontrada por nombre/acrónimo, actualizando ID:', scaleId);
        await supabase.from('medical_scales').update({
            description: scaleData.description,
            category: scaleData.categories[0] || 'General',
            tags: scaleData.categories,
            status: scaleData.current_version?.status || 'draft',
            updated_at: new Date().toISOString()
        }).eq('id', scaleId);
        console.log('✅ [MEDICAL_SCALES] Escala existente actualizada.');
        } else {
        console.log('➕ [MEDICAL_SCALES] No se encontró escala existente, insertando nueva.');
        const { data: newScale, error: scaleError } = await supabase
            .from('medical_scales')
            .insert({
            name: scaleData.name,
            acronym: scaleData.acronym,
            description: scaleData.description,
            category: scaleData.categories[0] || 'General',
            tags: scaleData.categories,
            status: scaleData.current_version?.status || 'draft', // Default to draft
            created_by: user.id,
            // Sync metadata
            instructions: scaleData.current_version?.config.instructions,
            time_to_complete: scaleData.current_version?.config.estimated_time?.toString(),
            language: scaleData.current_version?.config.language,
            original_author: scaleData.current_version?.config.original_author,
            evidence_level: scaleData.current_version?.config.validation_info,
            version: scaleData.current_version?.version_number
            })
            .select()
            .single();

        console.log('✅ [MEDICAL_SCALES] Escala creada:', newScale);
        if (scaleError) {
          console.error('❌ [MEDICAL_SCALES] Error:', scaleError);
          throw scaleError;
        }
        scaleId = newScale.id;
        }
    }

    // 2. Insert into scale_scoring (New Logic)
    console.log('\n📊 [SCORING] === GUARDANDO SCORING ===');
    const versionData = scaleData.current_version;
    if (!versionData) throw new Error('Datos de versión faltantes');

    console.log('🗑️ [SCORING] Limpiando scoring existente para scale_id:', scaleId);
    // Clean existing scoring if updating (simplified approach)
    const { error: deleteScoringError } = await supabase.from('scale_scoring').delete().eq('scale_id', scaleId);
    if (deleteScoringError) {
      console.error('❌ [SCORING] Error al limpiar scoring existente:', deleteScoringError);
      // Decide if this should be a throw or just a warning
    } else {
      console.log('✅ [SCORING] Scoring existente limpiado.');
    }

    console.log('➕ [SCORING] Insertando nuevo scoring para scale_id:', scaleId);
    const { data: scoringComp, error: scoringError } = await supabase
      .from('scale_scoring')
      .insert({
        scale_id: scaleId,
        scoring_method: versionData.scoring.engine === 'json-logic' ? 'complex' : versionData.scoring.engine,
        domains: versionData.scoring.domains || [] // Save domains
        // formula: ... if needed
      })
      .select()
      .single();
    
    console.log('✅ [SCORING] Scoring guardado:', scoringComp);
    if (scoringError) {
      console.error('❌ [SCORING] Error:', scoringError);
      throw scoringError;
    }

    if (scoringComp && versionData.scoring.ranges) {
        console.log('🗑️ [SCORING_RANGES] Limpiando rangos de scoring existentes para scoring_id:', scoringComp.id);
        const { error: deleteRangesError } = await supabase.from('scoring_ranges').delete().eq('scoring_id', scoringComp.id);
        if (deleteRangesError) {
          console.error('❌ [SCORING_RANGES] Error al limpiar rangos existentes:', deleteRangesError);
        } else {
          console.log('✅ [SCORING_RANGES] Rangos existentes limpiados.');
        }

        const rangesToInsert = versionData.scoring.ranges.map((r, idx) => ({
            scoring_id: scoringComp.id,
            min_value: r.min,
            max_value: r.max,
            interpretation_level: r.label,
            interpretation_text: r.interpretation,
            color_code: r.color,
            order_index: idx + 1,
            severity_level: r.alert_level
        }));
        
        console.log('📈 [SCORING_RANGES] Insertando rangos:', rangesToInsert.length);
        const { error: rangeError } = await supabase.from('scoring_ranges').insert(rangesToInsert);
        if (rangeError) {
          console.error('❌ [SCORING_RANGES] Error:', rangeError);
          throw rangeError;
        } else {
          console.log('✅ [SCORING_RANGES] Rangos guardados correctamente');
        }
    } else {
      console.log('⚠️ [SCORING_RANGES] No hay rangos de scoring para guardar.');
    }

    // 3. Create questions and options
    console.log('\n❓ [QUESTIONS] === GUARDANDO PREGUNTAS ===');
    console.log('❓ [QUESTIONS] Total de preguntas:', versionData.questions.length);
    // First clear existing if updating
    console.log('🗑️ [QUESTIONS] Limpiando preguntas existentes para scale_id:', scaleId);
    const { error: deleteQuestionsError } = await supabase.from('scale_questions').delete().eq('scale_id', scaleId);
    if (deleteQuestionsError) {
      console.error('❌ [QUESTIONS] Error al limpiar preguntas existentes:', deleteQuestionsError);
    } else {
      console.log('✅ [QUESTIONS] Preguntas existentes limpiadas.');
    }

    for (const [index, q] of versionData.questions.entries()) {
      console.log(`\n❓ [QUESTION ${index + 1}] Procesando pregunta:`, q.id);
      console.log(`❓ [QUESTION ${index + 1}] Tipo:`, q.type);
      console.log(`❓ [QUESTION ${index + 1}] Opciones:`, q.options?.length || 0);
      const { data: question, error: qError } = await supabase
        .from('scale_questions')
        .insert({
          scale_id: scaleId,
          question_id: q.id,
          question_text: q.text,
          description: q.description,
          question_type: q.type,
          order_index: index + 1,
          image_url: q.image_url,
          conditional_logic: q.logic,
          validation_rules: q.validation
        })
        .select()
        .single();

      if (qError) {
        console.error(`❌ [QUESTION ${index + 1}] Error al guardar pregunta:`, qError);
        throw qError;
      }
      console.log(`✅ [QUESTION ${index + 1}] Pregunta guardada con ID:`, question.id);

      if (q.options?.length) {
          const optionsToInsert = q.options.map((opt, optIdx) => ({
          question_id: question.id,
          option_label: opt.label,
          option_value: typeof opt.score === 'number' ? opt.score : (Number(opt.value) || 0),
          order_index: optIdx + 1
        }));

        console.log(`🔘 [OPTIONS ${index + 1}] Opciones a insertar:`, JSON.stringify(optionsToInsert, null, 2));

        const { error: optError } = await supabase
          .from('question_options')
          .insert(optionsToInsert);

        if (optError) {
          console.error(`❌ [OPTIONS ${index + 1}] Error al guardar opciones:`, optError);
          throw optError;
        } else {
          console.log(`✅ [OPTIONS ${index + 1}] ${optionsToInsert.length} opciones guardadas correctamente`);
        }
      } else {
        console.log(`⚠️ [QUESTION ${index + 1}] Sin opciones para guardar`);
      }
    }

    // 4. Create Bibliography/References
    console.log('\n📚 [REFERENCES] === GUARDANDO REFERENCIAS ===');
    if (versionData.config.bibliography?.length) {
      console.log('🗑️ [REFERENCES] Limpiando referencias existentes para scale_id:', scaleId);
      // First clean up old references
      await supabase.from('scale_references').delete().eq('scale_id', scaleId);

      const referencesToInsert = versionData.config.bibliography.map(ref => ({
        scale_id: scaleId,
        title: ref.title,
        authors: ref.authors,
        year: ref.year,
        journal: ref.journal,
        doi: ref.doi,
        pmid: ref.pmid,
        url: ref.url,
        reference_type: ref.reference_type,
        is_primary: ref.is_primary
      }));

      const { error: refError } = await supabase
        .from('scale_references')
        .insert(referencesToInsert);

      if (refError) {
        console.error('❌ [REFERENCES] Error saving bibliography:', refError);
      } else {
        console.log('✅ [REFERENCES] Referencias guardadas correctamente');
      }
    }

    console.log('\n🎉 [PUBLISH_SCALE] === GUARDADO COMPLETADO ===');
    console.log('🆔 [PUBLISH_SCALE] Scale ID:', scaleId);
    return scaleId;
  }

  /**
   * Get detailed information for a specific scale
   */
  /**
   * Get detailed information for a specific scale (Alias for getScaleById)
   */
  static async getScaleDetails(id: string): Promise<MedicalScale | null> {
    try {
        return await this.getScaleById(id);
    } catch (error) {
        console.error('Error fetching scale details:', error);
        return null;
    }
  }

  /**
   * Publish a version (makes it immutable)
   */
  /**
   * Publish a version (Just updates status in main table now)
   */
  static async publishVersion(scaleId: string) {
    const { data, error } = await supabase
      .from('medical_scales')
      .update({ 
        status: 'active', // Using 'active' instead of published to match enum
        updated_at: new Date().toISOString()
      })
      .eq('id', scaleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Search scales by name or category
   */
  static async searchScales(query: string) {
    const { data, error } = await supabase
      .from('medical_scales')
      .select(`
        *,
        questions:scale_questions(id)
      `)
      .or(`name.ilike.%${query}%,acronym.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(20)

    if (error) throw error

    return data?.map(scale => ({
      ...scale,
      categories: scale.tags || [],
      current_version: {
        version_number: scale.version || '1.0',
        config: {
            estimated_time: scale.time_to_complete ? parseInt(scale.time_to_complete) : 5,
        },
        questions: scale.questions || []
      }
    }))
  }
}
