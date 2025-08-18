import type { Database } from '@/lib/database.types';

// Tipos base de la base de datos
export type Patient = Database['public']['Tables']['patients']['Row'];
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];

// Tipos específicos del dominio de pacientes
export interface PatientFormData {
  full_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_record_number?: string;
  notes?: string;
}

export interface PatientSearchFilters {
  searchTerm?: string;
  gender?: 'male' | 'female' | 'other';
  ageRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface PatientStats {
  total: number;
  newThisMonth: number;
  activeThisMonth: number;
  byGender: {
    male: number;
    female: number;
    other: number;
  };
  averageAge?: number;
}

// Estados para componentes
export interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  error: string | null;
}

// Props para componentes
export interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  loading?: boolean;
}

export interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

// Tipos para validación
export interface PatientValidationErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
}

// Tipos para hooks
export interface UsePatientsReturn {
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  error: string | null;
  stats?: PatientStats;
  // Acciones
  loadPatients: () => Promise<void>;
  createPatient: (data: PatientFormData) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<PatientFormData>) => Promise<boolean>;
  deletePatient: (id: string) => Promise<boolean>;
  selectPatient: (patient: Patient | null) => void;
  searchPatients: (filters: PatientSearchFilters) => Promise<void>;
  refreshStats: () => Promise<void>;
}

// Enums útiles
export enum PatientGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum PatientAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view'
}

// Constantes
export const PATIENT_FORM_DEFAULTS: Partial<PatientFormData> = {
  gender: undefined,
  notes: ''
};

export const PATIENT_VALIDATION_RULES = {
  full_name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  email: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    required: false,
    minLength: 10
  }
} as const;
