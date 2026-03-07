import { supabase } from '../lib/supabase'

export interface AssessmentPayload {
  patient_id: string
  scale_id: string
  version_id: string
  responses: any
  total_score: number
  normalized_score?: number
  interpretation?: string
  duration_seconds?: number
}

export class AssessmentService {
  /**
   * Save a completed assessment
   */
  static async saveAssessment(payload: AssessmentPayload) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('scale_assessments')
      .insert({
        patient_id: payload.patient_id,
        user_id: user.id,
        scale_id: payload.scale_id,
        responses: payload.responses,
        total_score: payload.total_score,
        interpretation: payload.interpretation
          ? (typeof payload.interpretation === 'string' ? payload.interpretation : JSON.stringify(payload.interpretation))
          : null,
        duration_seconds: payload.duration_seconds,
        status: 'completed' as const,
        completion_percentage: 100,
        completed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get patient assessment history for a specific scale
   */
  static async getPatientHistory(patientId: string, scaleId: string) {
    const { data, error } = await supabase
      .from('scale_assessments')
      .select(`
        *,
        version:scale_versions(version_number)
      `)
      .eq('patient_id', patientId)
      .eq('scale_id', scaleId)
      .order('completed_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Get all assessments for a patient
   */
  static async getPatientAssessments(patientId: string) {
    const { data, error } = await supabase
      .from('scale_assessments')
      .select(`
        *,
        scale:scales(name, acronym),
        version:scale_versions(version_number)
      `)
      .eq('patient_id', patientId)
      .order('completed_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Calculate trend analysis for a patient's scale over time
   */
  static async getScoreTrend(patientId: string, scaleId: string) {
    const history = await this.getPatientHistory(patientId, scaleId)
    
    return history.map(assessment => ({
      date: assessment.completed_at,
      score: assessment.total_score,
      normalized: assessment.normalized_score,
      interpretation: assessment.interpretation,
      version: assessment.version.version_number
    }))
  }
}
