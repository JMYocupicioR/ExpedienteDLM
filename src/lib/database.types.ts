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
    }
  }
}