export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string
          name: string
          type: string
          address: string | null
          phone: string | null
          email: string | null
          website: string | null
          license_number: string | null
          director_name: string | null
          director_license: string | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          license_number?: string | null
          director_name?: string | null
          director_license?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          license_number?: string | null
          director_name?: string | null
          director_license?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          permissions: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          permissions?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          permissions?: Json
          is_active?: boolean
          created_at?: string
        }
      }
      medical_specialties: {
        Row: {
          id: string
          name: string
          category: string
          description: string | null
          requires_license: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          description?: string | null
          requires_license?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          description?: string | null
          requires_license?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          role: string
          specialty: string | null
          full_name: string | null
          created_at: string | null
          updated_at: string | null
          license_number: string | null
          phone: string | null
          schedule: Json | null
          clinic_id: string | null
          user_role_id: string | null
          specialty_id: string | null
          employee_id: string | null
          hire_date: string | null
          is_active: boolean
          profile_completed: boolean
          additional_info: Json
        }
        Insert: {
          id: string
          email: string
          role: string
          specialty?: string | null
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
          license_number?: string | null
          phone?: string | null
          schedule?: Json | null
          clinic_id?: string | null
          user_role_id?: string | null
          specialty_id?: string | null
          employee_id?: string | null
          hire_date?: string | null
          is_active?: boolean
          profile_completed?: boolean
          additional_info?: Json
        }
        Update: {
          id?: string
          email?: string
          role?: string
          specialty?: string | null
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
          license_number?: string | null
          phone?: string | null
          schedule?: Json | null
          clinic_id?: string | null
          user_role_id?: string | null
          specialty_id?: string | null
          employee_id?: string | null
          hire_date?: string | null
          is_active?: boolean
          profile_completed?: boolean
          additional_info?: Json
        }
      }
      clinic_user_relationships: {
        Row: {
          id: string
          clinic_id: string
          user_id: string
          role_in_clinic: 'doctor' | 'admin_staff'
          start_date: string
          end_date: string | null
          is_active: boolean
          permissions_override: Json
          status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          rejected_by: string | null
          rejected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          user_id: string
          role_in_clinic: 'doctor' | 'admin_staff'
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          permissions_override?: Json
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          user_id?: string
          role_in_clinic?: 'doctor' | 'admin_staff'
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          permissions_override?: Json
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          full_name: string
          birth_date: string
          gender: string
          email: string | null
          phone: string | null
          address: string | null
          city_of_birth: string | null
          city_of_residence: string | null
          social_security_number: string | null
          created_at: string
          updated_at: string | null
          clinic_id: string
          primary_doctor_id: string | null
          patient_user_id: string | null
          insurance_info: Json
          emergency_contact: Json
          is_active: boolean
        }
        Insert: {
          id?: string
          full_name: string
          birth_date: string
          gender: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city_of_birth?: string | null
          city_of_residence?: string | null
          social_security_number?: string | null
          created_at?: string
          updated_at?: string | null
          clinic_id?: string
          primary_doctor_id?: string | null
          patient_user_id?: string | null
          insurance_info?: Json
          emergency_contact?: Json
          is_active?: boolean
        }
        Update: {
          id?: string
          full_name?: string
          birth_date?: string
          gender?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city_of_birth?: string | null
          city_of_residence?: string | null
          social_security_number?: string | null
          created_at?: string
          updated_at?: string | null
          clinic_id?: string
          primary_doctor_id?: string | null
          patient_user_id?: string | null
          insurance_info?: Json
          emergency_contact?: Json
          is_active?: boolean
        }
      }
      patient_registration_tokens: {
        Row: {
          id: string
          token: string
          doctor_id: string
          clinic_id: string
          selected_scale_ids: string[] | null
          allowed_sections: string[]
          assigned_patient_id: string | null
          expires_at: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          doctor_id: string
          clinic_id: string
          selected_scale_ids?: string[] | null
          allowed_sections?: string[]
          assigned_patient_id?: string | null
          expires_at: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          doctor_id?: string
          clinic_id?: string
          selected_scale_ids?: string[] | null
          allowed_sections?: string[]
          assigned_patient_id?: string | null
          expires_at?: string
          status?: string
          created_at?: string
        }
      }
      hereditary_backgrounds: {
        Row: {
          id: string
          patient_id: string
          relationship: string
          condition: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          relationship: string
          condition: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          relationship?: string
          condition?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pathological_histories: {
        Row: {
          id: string
          patient_id: string
          chronic_diseases: string[]
          current_treatments: string[]
          surgeries: string[]
          fractures: string[]
          previous_hospitalizations: string[]
          substance_use: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          chronic_diseases?: string[]
          current_treatments?: string[]
          surgeries?: string[]
          fractures?: string[]
          previous_hospitalizations?: string[]
          substance_use?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          chronic_diseases?: string[]
          current_treatments?: string[]
          surgeries?: string[]
          fractures?: string[]
          previous_hospitalizations?: string[]
          substance_use?: Json
          created_at?: string
          updated_at?: string
        }
      }
      non_pathological_histories: {
        Row: {
          id: string
          patient_id: string
          handedness: string
          religion: string
          marital_status: string
          education_level: string
          diet: string
          personal_hygiene: string
          vaccination_history: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          handedness: string
          religion: string
          marital_status: string
          education_level: string
          diet: string
          personal_hygiene: string
          vaccination_history?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          handedness?: string
          religion?: string
          marital_status?: string
          education_level?: string
          diet?: string
          personal_hygiene?: string
          vaccination_history?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      consultations: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          current_condition: string
          vital_signs: Json
          physical_examination: Json
          diagnosis: string
          prognosis: string
          treatment: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          current_condition: string
          vital_signs: Json
          physical_examination: Json
          diagnosis: string
          prognosis: string
          treatment: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          current_condition?: string
          vital_signs?: Json
          physical_examination?: Json
          diagnosis?: string
          prognosis?: string
          treatment?: string
          created_at?: string
          updated_at?: string
        }
      }
      physical_exam_templates: {
        Row: {
          id: string
          created_at: string
          name: string
          doctor_id: string
          definition: PhysicalExamTemplateDefinition
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          doctor_id: string
          definition: PhysicalExamTemplateDefinition
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          doctor_id?: string
          definition?: PhysicalExamTemplateDefinition
          is_active?: boolean
        }
      }
      medical_scales: {
        Row: {
          id: string
          name: string
          specialty: string | null
          category: string | null
          description: string | null
          definition: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          specialty?: string | null
          category?: string | null
          description?: string | null
          definition: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          specialty?: string | null
          category?: string | null
          description?: string | null
          definition?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      scale_assessments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          consultation_id: string | null
          scale_id: string
          answers: Json
          score: number | null
          severity: string | null
          interpretation: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          consultation_id?: string | null
          scale_id: string
          answers: Json
          score?: number | null
          severity?: string | null
          interpretation?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          consultation_id?: string | null
          scale_id?: string
          answers?: Json
          score?: number | null
          severity?: string | null
          interpretation?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      ,
      medical_tests: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string | null
          category: 'gabinete' | 'laboratorio' | 'otro'
          test_name: string
          status: 'ordered' | 'in_progress' | 'completed'
          ordered_date: string | null
          result_date: string | null
          lab_name: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id?: string | null
          category: 'gabinete' | 'laboratorio' | 'otro'
          test_name: string
          status?: 'ordered' | 'in_progress' | 'completed'
          ordered_date?: string | null
          result_date?: string | null
          lab_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string | null
          category?: 'gabinete' | 'laboratorio' | 'otro'
          test_name?: string
          status?: 'ordered' | 'in_progress' | 'completed'
          ordered_date?: string | null
          result_date?: string | null
          lab_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ,
      medical_test_files: {
        Row: {
          id: string
          medical_test_id: string
          file_name: string
          file_path: string
          file_url: string
          file_type: string | null
          file_size: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medical_test_id: string
          file_name: string
          file_path: string
          file_url: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          medical_test_id?: string
          file_name?: string
          file_path?: string
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_values: Json | null
          new_values: Json | null
          user_id: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          timestamp?: string
        }
      }
      appointments: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          clinic_id: string
          title: string
          description: string | null
          appointment_date: string
          appointment_time: string
          duration: number
          status: 'scheduled' | 'confirmed_by_patient' | 'completed' | 'cancelled_by_clinic' | 'cancelled_by_patient' | 'no_show'
          type: 'consultation' | 'follow_up' | 'check_up' | 'procedure' | 'emergency'
          location: string | null
          notes: string | null
          reminder_sent: boolean
          external_calendar_event_id: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          clinic_id: string
          title: string
          description?: string | null
          appointment_date: string
          appointment_time: string
          duration?: number
          status?: 'scheduled' | 'confirmed_by_patient' | 'completed' | 'cancelled_by_clinic' | 'cancelled_by_patient' | 'no_show'
          type?: 'consultation' | 'follow_up' | 'check_up' | 'procedure' | 'emergency'
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean
          external_calendar_event_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          clinic_id?: string
          title?: string
          description?: string | null
          appointment_date?: string
          appointment_time?: string
          duration?: number
          status?: 'scheduled' | 'confirmed_by_patient' | 'completed' | 'cancelled_by_clinic' | 'cancelled_by_patient' | 'no_show'
          type?: 'consultation' | 'follow_up' | 'check_up' | 'procedure' | 'emergency'
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean
          external_calendar_event_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          title: string | null
          is_read: boolean
          related_entity_type: string | null
          related_entity_id: string | null
          action_url: string | null
          priority: 'low' | 'normal' | 'high' | 'urgent'
          created_at: string
          read_at: string | null
          suggested_action?: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          title?: string | null
          is_read?: boolean
          related_entity_type?: string | null
          related_entity_id?: string | null
          action_url?: string | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          created_at?: string
          read_at?: string | null
          suggested_action?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          title?: string | null
          is_read?: boolean
          related_entity_type?: string | null
          related_entity_id?: string | null
          action_url?: string | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          created_at?: string
          read_at?: string | null
          suggested_action?: Json | null
        }
      }
      data_correction_requests: {
        Row: {
          id: string
          patient_user_id: string
          patient_id: string
          request_type: 'access' | 'rectification' | 'cancellation' | 'opposition'
          field_to_correct: string | null
          current_value: string | null
          requested_value: string | null
          reason: string
          additional_details: string | null
          status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed'
          reviewed_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_user_id: string
          patient_id: string
          request_type: 'access' | 'rectification' | 'cancellation' | 'opposition'
          field_to_correct?: string | null
          current_value?: string | null
          requested_value?: string | null
          reason: string
          additional_details?: string | null
          status?: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed'
          reviewed_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_user_id?: string
          patient_id?: string
          request_type?: 'access' | 'rectification' | 'cancellation' | 'opposition'
          field_to_correct?: string | null
          current_value?: string | null
          requested_value?: string | null
          reason?: string
          additional_details?: string | null
          status?: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed'
          reviewed_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patient_access_logs: {
        Row: {
          id: string
          patient_user_id: string
          patient_id: string
          action: string
          resource_accessed: string | null
          ip_address: string | null
          user_agent: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_user_id: string
          patient_id: string
          action: string
          resource_accessed?: string | null
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_user_id?: string
          patient_id?: string
          action?: string
          resource_accessed?: string | null
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      privacy_consents: {
        Row: {
          id: string
          patient_user_id: string
          consent_type: string
          consent_version: string
          granted: boolean
          granted_at: string | null
          revoked_at: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_user_id: string
          consent_type: string
          consent_version: string
          granted?: boolean
          granted_at?: string | null
          revoked_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_user_id?: string
          consent_type?: string
          consent_version?: string
          granted?: boolean
          granted_at?: string | null
          revoked_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clinical_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          target_condition: string
          trigger_logic: string
          notification_template: string
          suggested_action: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          target_condition: string
          trigger_logic: string
          notification_template: string
          suggested_action: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          target_condition?: string
          trigger_logic?: string
          notification_template?: string
          suggested_action?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export interface ExamQuestion {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number'
  required?: boolean
  options?: string[]
  placeholder?: string
  min?: number
  max?: number
  unit?: string
  defaultValue?: string | number | boolean
}

export interface ExamSection {
  id: string
  title: string
  description?: string
  questions: ExamQuestion[]
  order: number
}

export interface PhysicalExamTemplateDefinition {
  sections: ExamSection[]
  version: string
  metadata?: {
    lastModified?: string
    author?: string
    description?: string
  }
}

export interface PhysicalExamFormData {
  examDate: string
  examTime: string
  vitalSigns: {
    systolic_pressure: string
    diastolic_pressure: string
    heart_rate: string
    respiratory_rate: string
    temperature: string
    oxygen_saturation: string
    weight: string
    height: string
    bmi: string
  }
  sections: Record<string, unknown>
  dynamic?: Record<string, Record<string, unknown>> // Datos de plantillas dinámicas
  generalObservations: string
}

// ===== NUEVOS TIPOS PARA SISTEMA DE RECETAS MEJORADO =====

export interface PrescriptionTemplate {
  id: string
  user_id: string
  style_definition: Record<string, unknown>
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface ConsultationPrescription {
  id: string
  consultation_id: string
  prescription_id: string
  created_at: string
}

export interface MedicationTemplate {
  id: string
  doctor_id: string
  name: string
  category?: string
  medications: unknown[]
  diagnosis?: string
  notes?: string
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface PrescriptionHistory {
  id: string
  prescription_id: string
  action: 'created' | 'modified' | 'dispensed' | 'cancelled'
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  performed_by?: string
  notes?: string
  created_at: string
}

export interface EnhancedPrescription {
  id: string
  patient_id: string
  doctor_id: string
  consultation_id?: string
  medications: unknown[]
  instructions?: string
  duration_days?: number
  diagnosis?: string
  notes?: string
  signature?: string
  qr_code?: string
  status: 'active' | 'completed' | 'cancelled'
  interaction_warnings?: unknown[]
  expires_at?: string
  deleted_at?: string
  created_at: string
  updated_at: string
}

// Tipos adicionales para el sistema multi-rol
export interface UserRole {
  id: string
  name: string
  display_name: string
  description?: string
  permissions: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface MedicalSpecialty {
  id: string
  name: string
  category: 'medical' | 'surgical' | 'diagnostic' | 'therapy' | 'nursing' | 'administration'
  description?: string
  requires_license: boolean
  is_active: boolean
  created_at: string
}

export interface Clinic {
  id: string
  name: string
  type: 'hospital' | 'clinic' | 'private_practice' | 'other'
  address?: string
  phone?: string
  email?: string
  website?: string
  license_number?: string
  director_name?: string
  director_license?: string
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EnhancedProfile {
  id: string
  email: string
  role: 'super_admin' | 'doctor' | 'patient' | 'health_staff' | 'admin_staff'
  specialty?: string
  full_name?: string
  created_at?: string
  updated_at?: string
  license_number?: string
  phone?: string
  schedule?: Record<string, unknown>
  clinic_id?: string
  user_role_id?: string
  specialty_id?: string
  employee_id?: string
  hire_date?: string
  is_active: boolean
  profile_completed: boolean
  additional_info: Record<string, unknown>
}

export interface ClinicUserRelationship {
  id: string
  clinic_id: string
  user_id: string
  role_in_clinic: string
  start_date: string
  end_date?: string
  is_active: boolean
  permissions_override: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EnhancedRegistrationData {
  personalInfo: {
    fullName: string
    email: string
    phone: string
    birthDate?: string
    gender?: string
    address?: string
  }
  accountInfo: {
    role: 'doctor' | 'patient' | 'health_staff' | 'admin_staff'
    password: string
    confirmPassword: string
  }
  professionalInfo?: {
    licenseNumber?: string
    specialtyId?: string
    experience?: string
    institution?: string
    employeeId?: string
  }
  clinicInfo?: {
    clinicId?: string
    isNewClinic: boolean
    clinicData?: {
      name: string
      type: 'hospital' | 'clinic' | 'private_practice' | 'other'
      address?: string
      phone?: string
      email?: string
    }
  }
  patientInfo?: {
    primaryDoctorId?: string
    insuranceInfo?: Record<string, unknown>
    emergencyContact?: Record<string, unknown>
  }
  additionalInfo?: {
    workSchedule?: string
    preferences?: Record<string, unknown>
    notes?: string
  }
}

// =====================================================
// MEDICAL TEMPLATES TYPES
// =====================================================

export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  type: 'interrogatorio' | 'exploracion' | 'prescripcion' | 'general';
  is_predefined: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicalTemplate {
  id: string;
  user_id: string;
  clinic_id?: string;
  category_id?: string;
  name: string;
  description?: string;
  type: 'interrogatorio' | 'exploracion' | 'prescripcion';
  specialty?: string;
  content: TemplateContent;
  tags: string[];
  is_public: boolean;
  is_predefined: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  category?: TemplateCategory;
}

export interface TemplateContent {
  sections: TemplateSection[];
  metadata?: Record<string, unknown>;
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  fields?: TemplateField[];
  content?: string;
  exercises?: Exercise[];
  categories?: DietCategory[];
  restrictions?: string[];
  order?: number;
}

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'time';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  validation?: FieldValidation;
  conditional?: string; // Campo que debe estar marcado para mostrar este campo
  order?: number;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface Exercise {
  name: string;
  description: string;
  repetitions: string;
  frequency: string;
  duration?: string;
  intensity?: string;
  precautions?: string[];
}

export interface DietCategory {
  category: string;
  servings: string;
  examples: string;
  notes?: string;
}

export interface TemplateFieldRecord {
  id: string;
  template_id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  field_options?: Record<string, unknown>;
  is_required: boolean;
  field_order: number;
  section?: string;
  created_at: string;
}

export interface TemplateFavorite {
  id: string;
  user_id: string;
  template_id: string;
  created_at: string;
  template?: MedicalTemplate;
}

export interface TemplateUsage {
  id: string;
  template_id: string;
  user_id: string;
  patient_id?: string;
  consultation_id?: string;
  used_at: string;
  context?: Record<string, unknown>;
}

// Form Data Types
export interface TemplateFormData {
  name: string;
  description: string;
  type: 'interrogatorio' | 'exploracion' | 'prescripcion';
  specialty?: string;
  content: TemplateContent;
  tags: string[];
  is_public: boolean;
  category_id?: string;
}

export interface TemplateSearchParams {
  search?: string;
  type?: 'interrogatorio' | 'exploracion' | 'prescripcion';
  specialty?: string;
  category_id?: string;
  is_public?: boolean;
  is_predefined?: boolean;
  user_id?: string;
  include_public?: boolean;
  limit?: number;
  offset?: number;
}

export interface TemplateSearchResult {
  templates: MedicalTemplate[];
  total: number;
  categories: TemplateCategory[];
}

// Predefined Template Types
export interface PredefinedTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'interrogatorio' | 'exploracion' | 'prescripcion';
  specialty?: string;
  fields?: number;
  content?: TemplateContent;
}

export interface TemplateStats {
  total_templates: number;
  by_type: {
    interrogatorio: number;
    exploracion: number;
    prescripcion: number;
  };
  most_used: MedicalTemplate[];
  recent: MedicalTemplate[];
}

// =====================================================
// SISTEMA DE CITAS MEJORADO - NUEVOS TIPOS
// =====================================================

export type AppointmentStatus = 'scheduled' | 'confirmed_by_patient' | 'completed' | 'cancelled_by_clinic' | 'cancelled_by_patient' | 'no_show';
export type AppointmentType = 'consultation' | 'follow_up' | 'check_up' | 'procedure' | 'emergency';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface EnhancedAppointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  clinic_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  location?: string;
  notes?: string;
  reminder_sent: boolean;
  external_calendar_event_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relaciones expandidas
  patient?: {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
    birth_date?: string;
  };
  doctor?: {
    id: string;
    full_name: string;
    specialty?: string;
    phone?: string;
  };
  clinic?: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface CreateAppointmentPayload {
  doctor_id: string;
  patient_id: string;
  clinic_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type: AppointmentType;
  location?: string;
  notes?: string;
}

export interface UpdateAppointmentPayload extends Partial<CreateAppointmentPayload> {
  status?: AppointmentStatus;
  reminder_sent?: boolean;
  external_calendar_event_id?: string;
}

export interface AppointmentFilters {
  doctor_id?: string;
  patient_id?: string;
  clinic_id?: string;
  date_from?: string;
  date_to?: string;
  status?: AppointmentStatus[];
  type?: AppointmentType[];
  search?: string;
}

export interface AppointmentConflictCheck {
  has_conflict: boolean;
  conflicting_appointments?: EnhancedAppointment[];
  available_slots?: {
    start_time: string;
    end_time: string;
  }[];
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  title?: string;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  priority: NotificationPriority;
  created_at: string;
  read_at?: string;
}

export interface CreateNotificationPayload {
  user_id: string;
  message: string;
  title?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  priority?: NotificationPriority;
}

export interface NotificationFilters {
  is_read?: boolean;
  priority?: NotificationPriority[];
  related_entity_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_priority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  recent: Notification[];
}

// Tipos para la Edge Function
export interface ScheduleAppointmentRequest {
  doctor_id: string;
  patient_id: string;
  clinic_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type: AppointmentType;
  location?: string;
  notes?: string;
}

export interface ScheduleAppointmentResponse {
  success: boolean;
  appointment?: EnhancedAppointment;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AppointmentAvailabilityRequest {
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  exclude_appointment_id?: string;
}

export interface AppointmentAvailabilityResponse {
  available: boolean;
  conflict_details?: {
    conflicting_appointment_id: string;
    conflicting_time_range: {
      start: string;
      end: string;
    };
  };
}

// =====================================================
// PORTAL DE PACIENTES - TIPOS PARA DERECHOS ARCO
// =====================================================

export type DataCorrectionRequestType = 'access' | 'rectification' | 'cancellation' | 'opposition';
export type DataCorrectionRequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';

export interface DataCorrectionRequest {
  id: string;
  patient_user_id: string;
  patient_id: string;
  request_type: DataCorrectionRequestType;
  field_to_correct?: string;
  current_value?: string;
  requested_value?: string;
  reason: string;
  additional_details?: string;
  status: DataCorrectionRequestStatus;
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDataCorrectionRequest {
  request_type: DataCorrectionRequestType;
  field_to_correct?: string;
  current_value?: string;
  requested_value?: string;
  reason: string;
  additional_details?: string;
}

export interface PatientAccessLog {
  id: string;
  patient_user_id: string;
  patient_id: string;
  action: string;
  resource_accessed?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface PrivacyConsent {
  id: string;
  patient_user_id: string;
  consent_type: string;
  consent_version: string;
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientCompleteData {
  personal_info: {
    full_name: string;
    birth_date: string;
    gender: string;
    email?: string;
    phone?: string;
    address?: string;
    city_of_birth?: string;
    city_of_residence?: string;
    social_security_number?: string;
    created_at: string;
    updated_at?: string;
  };
  consultations: Array<{
    id: string;
    current_condition: string;
    vital_signs: Json;
    physical_examination: Json;
    diagnosis: string;
    prognosis: string;
    treatment: string;
    created_at: string;
    updated_at?: string;
  }>;
  appointments: Array<{
    id: string;
    title: string;
    description?: string;
    appointment_date: string;
    appointment_time: string;
    duration: number;
    status: string;
    type: string;
    location?: string;
    notes?: string;
    created_at: string;
  }>;
  medical_tests: Array<{
    id: string;
    category: string;
    test_name: string;
    status: string;
    ordered_date?: string;
    result_date?: string;
    lab_name?: string;
    notes?: string;
    created_at: string;
  }>;
}

// =====================================================
// NOTIFICACIONES CLÍNICAS - TIPOS PARA REGLAS AUTOMÁTICAS
// =====================================================

export interface ClinicalRule {
  id: string;
  name: string;
  description?: string;
  target_condition: string;
  trigger_logic: string;
  notification_template: string;
  suggested_action: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClinicalRule {
  name: string;
  description?: string;
  target_condition: string;
  trigger_logic: string;
  notification_template: string;
  suggested_action: Json;
  is_active?: boolean;
}

export interface NotificationWithSuggestedAction extends Notification {
  suggested_action?: {
    type: 'schedule_appointment' | 'view_record' | 'call_patient' | 'send_reminder';
    label: string;
    data?: {
      patient_id?: string;
      patient_name?: string;
      recommended_date?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      notes?: string;
    };
  };
}
