/**
 * Minimal database types for Pacientes app.
 * For full types, run: supabase gen types typescript --local > src/lib/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          birth_date: string | null;
          gender: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          clinic_id: string | null;
          primary_doctor_id: string;
          patient_user_id: string | null;
          created_at: string;
          updated_at: string | null;
          is_active: boolean;
          curp: string | null;
          notes: string | null;
          allergies: Json | null;
          medical_history: Json | null;
        };
      };
    };
  };
}
