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
          doctor_id: string
          name: string
          fields: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          name: string
          fields: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          name?: string
          fields?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}