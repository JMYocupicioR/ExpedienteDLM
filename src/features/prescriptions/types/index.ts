// =====================================================
// TIPOS UNIFICADOS DEL MÓDULO DE PRESCRIPCIONES
// =====================================================
// Fuente única de verdad para todos los tipos del módulo.
// Reemplaza las 5+ definiciones duplicadas en:
//   - PrescriptionDashboard.tsx
//   - VisualPrescriptionEditor.tsx
//   - VisualPrescriptionRenderer.tsx
//   - useUnifiedPrescriptionSystem.ts
//   - useEnhancedPrescriptions.ts
//   - AdvancedPrescriptionSystem.tsx
//   - prescriptionPrint.ts

// --- Medicamento ---
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  route?: string;
  indication?: string;
  warnings?: string;
  contraindications?: string;
}

// --- Prescripción ---
export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  consultation_id?: string;
  medications: Medication[];
  diagnosis?: string;
  instructions?: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  expires_at?: string;
  visual_layout?: PrescriptionLayoutSnapshot | null;
  prescription_date?: string;
  created_at: string;
  updated_at?: string;
  // Joined relations
  patient_name?: string;
  patients?: { full_name: string };
}

export type PrescriptionStatus = 'active' | 'completed' | 'cancelled';

// --- Layout / Plantilla visual ---
export interface TextStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export type TemplateElementType = 
  | 'text' | 'logo' | 'background' | 'signature' | 'qr' 
  | 'separator' | 'box' | 'date' | 'time' | 'table' | 'icon';

export interface TemplateElement {
  id: string;
  type: TemplateElementType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  style: Partial<TextStyle>;
  zIndex: number;
  isVisible: boolean;
  isLocked?: boolean;
  iconType?: string;
  borderColor?: string;
  backgroundColor?: string;
}

export interface CanvasSettings {
  backgroundColor: string;
  backgroundImage?: string | null;
  canvasSize: { width: number; height: number };
  pageSize?: string;
  margin?: string;
  showGrid?: boolean;
  zoom?: number;
}

export interface PrintSettings {
  pageMargins?: Record<string, string>;
  printQuality?: string;
  colorMode?: string;
  scaleFactor?: number;
  autoFitContent?: boolean;
  includeQrCode?: boolean;
  includeDigitalSignature?: boolean;
  watermarkText?: string;
  // Backward-compat aliases
  paperSize?: string;
  orientation?: string;
  margins?: any;
  // DB snake_case (prescription_print_settings table)
  page_size?: string;
  page_orientation?: 'portrait' | 'landscape';
  page_margins?: Record<string, string>;
  print_quality?: string;
  color_mode?: string;
  scale_factor?: number;
  include_qr_code?: boolean;
  include_digital_signature?: boolean;
  watermark_text?: string;
}

export interface PrescriptionLayout {
  id: string;
  doctor_id: string;
  name: string;
  description?: string;
  orientation: 'portrait' | 'landscape';
  page_size: 'A4' | 'Letter' | 'Legal';
  template_elements: TemplateElement[];
  canvas_settings: CanvasSettings;
  print_settings?: PrintSettings;
  is_default: boolean;
  is_public: boolean;
  is_predefined: boolean;
  usage_count: number;
  last_used_at?: string;
  category: string;
  created_at: string;
  updated_at?: string;
}

// Snapshot for embedding in prescriptions.visual_layout
export interface PrescriptionLayoutSnapshot {
  template_elements: TemplateElement[];
  canvas_settings: CanvasSettings;
  print_settings?: PrintSettings;
}

// --- Plantilla de medicamentos ---
export interface MedicationTemplate {
  id: string;
  doctor_id: string;
  name: string;
  category?: string;
  diagnosis?: string;
  medications: Medication[];
  notes?: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at?: string;
}

// --- Historial ---
export type PrescriptionAction = 'created' | 'updated' | 'cancelled' | 'printed' | 'dispensed';

export interface PrescriptionHistoryEntry {
  id: string;
  prescription_id: string;
  action: PrescriptionAction;
  performed_by: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  // Joined
  performed_by_profile?: { first_name?: string; last_name?: string };
}

// --- Datos para renderizado visual ---
export interface PrescriptionRenderData {
  patientName?: string;
  doctorName?: string;
  doctorLicense?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  diagnosis?: string;
  medications: Medication[];
  notes?: string;
  date?: string;
  patientAge?: string;
  patientWeight?: string;
  patientAllergies?: string;
  followUpDate?: string;
  prescriptionId?: string;
}

// --- Estadísticas ---
export interface PrescriptionStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  expiringSoon: number;
  mostPrescribed: Array<{ medication: string; count: number }>;
}

// --- Doctor Profile (para recetas) ---
export interface DoctorProfileForPrescription {
  full_name?: string;
  medical_license?: string;
  specialty?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
}

// --- DTOs ---
export interface CreatePrescriptionDTO {
  patient_id: string;
  clinic_id?: string; // resolved automatically if not provided
  consultation_id?: string;
  medications: Medication[];
  diagnosis: string;
  notes?: string;
  status?: PrescriptionStatus;
  layout_id?: string;
}

// --- Constantes del canvas ---
export const CANVAS_SIZES = {
  A4_PORTRAIT: { width: 794, height: 1123 },
  A4_LANDSCAPE: { width: 1123, height: 794 },
  LETTER_PORTRAIT: { width: 816, height: 1056 },
  LETTER_LANDSCAPE: { width: 1056, height: 816 },
  LEGAL_PORTRAIT: { width: 816, height: 1344 },
  LEGAL_LANDSCAPE: { width: 1344, height: 816 },
} as const;

export const EDITOR_DEFAULTS = {
  ZOOM: 0.8,
  GRID_SIZE: 20,
  HISTORY_LIMIT: 50,
  AUTOSAVE_DELAY_MS: 5000,
  DRAFT_SAVE_DELAY_MS: 600,
  MIN_ELEMENT_SIZE: 20,
  ZOOM_MIN: 0.25,
  ZOOM_MAX: 3,
  ALIGNMENT_THRESHOLD: 5,
} as const;
