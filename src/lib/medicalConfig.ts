// Medical configuration and validation for vital signs and medications

export interface VitalSignValidation {
  isValid: boolean;
  message: string;
  level: 'normal' | 'warning' | 'critical';
}

export interface MedicationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// System limits for medical data
export const SYSTEM_LIMITS = {
  MAX_MEDICATIONS_PER_PRESCRIPTION: 10,
  MAX_TEMPLATE_NAME_LENGTH: 100,
  MAX_SECTIONS_PER_TEMPLATE: 20,
  MAX_FIELDS_PER_SECTION: 50,
  MAX_FIELD_LABEL_LENGTH: 200,
  MAX_GENERAL_OBSERVATIONS_LENGTH: 2000,
};

// Vital sign ranges (adult values)
export const VITAL_SIGNS_RANGES = {
  systolic_pressure: { min: 70, max: 200, normal: [90, 140] },
  diastolic_pressure: { min: 40, max: 120, normal: [60, 90] },
  heart_rate: { min: 30, max: 200, normal: [60, 100] },
  respiratory_rate: { min: 8, max: 40, normal: [12, 20] },
  temperature: { min: 32, max: 45, normal: [36.1, 37.2] },
  oxygen_saturation: { min: 70, max: 100, normal: [95, 100] },
  height: { min: 50, max: 250, normal: [140, 200] },
  weight: { min: 20, max: 300, normal: [40, 120] },
};

// Validate vital signs
export function validateVitalSign(field: string, value: string | number): VitalSignValidation {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return {
      isValid: false,
      message: 'Must be a valid number',
      level: 'critical'
    };
  }

  const range = VITAL_SIGNS_RANGES[field as keyof typeof VITAL_SIGNS_RANGES];
  if (!range) {
    return {
      isValid: true,
      message: 'Value recorded',
      level: 'normal'
    };
  }

  if (numValue < range.min || numValue > range.max) {
    return {
      isValid: false,
      message: `Value out of possible range (${range.min}-${range.max})`,
      level: 'critical'
    };
  }

  const [normalMin, normalMax] = range.normal;
  if (numValue < normalMin || numValue > normalMax) {
    return {
      isValid: true,
      message: `Outside normal range (${normalMin}-${normalMax})`,
      level: 'warning'
    };
  }

  return {
    isValid: true,
    message: 'Within normal range',
    level: 'normal'
  };
}

// Common medications and their typical dosage ranges
export type MedicationConstraint = {
  // legacy fields used by validateMedication
  maxDailyDose: number;
  unit: 'mg' | 'g' | 'mcg' | 'ml';
  commonDoses: number[];
  
  // extended fields used by UI helpers
  minDosage: number; // mg por toma
  maxDosage: number; // mg por toma
  allowedFrequencies: string[]; // descripciones legibles
  maxDurationDays: number;
  controlledSubstance?: boolean;
  requiresSpecialist?: boolean;
};

export const MEDICATION_CONSTRAINTS: Record<string, MedicationConstraint> = {
  'paracetamol': {
    maxDailyDose: 4000, unit: 'mg', commonDoses: [500, 1000],
    minDosage: 325, maxDosage: 1000,
    allowedFrequencies: ['cada 6 horas', 'cada 8 horas'],
    maxDurationDays: 10,
  },
  'ibuprofeno': {
    maxDailyDose: 3200, unit: 'mg', commonDoses: [400, 600, 800],
    minDosage: 200, maxDosage: 800,
    allowedFrequencies: ['cada 8 horas', 'cada 12 horas'],
    maxDurationDays: 14,
  },
  'amoxicilina': {
    maxDailyDose: 3000, unit: 'mg', commonDoses: [500, 875],
    minDosage: 250, maxDosage: 1000,
    allowedFrequencies: ['cada 8 horas', 'cada 12 horas'],
    maxDurationDays: 14,
  },
  'omeprazol': {
    maxDailyDose: 80, unit: 'mg', commonDoses: [20, 40],
    minDosage: 10, maxDosage: 40,
    allowedFrequencies: ['cada 24 horas'],
    maxDurationDays: 60,
  },
  'metformina': {
    maxDailyDose: 2000, unit: 'mg', commonDoses: [500, 850, 1000],
    minDosage: 500, maxDosage: 1000,
    allowedFrequencies: ['cada 12 horas', 'cada 24 horas'],
    maxDurationDays: 365,
    requiresSpecialist: false,
  },
  'losartan': {
    maxDailyDose: 100, unit: 'mg', commonDoses: [25, 50, 100],
    minDosage: 25, maxDosage: 100,
    allowedFrequencies: ['cada 24 horas'],
    maxDurationDays: 365,
  },
  'atorvastatina': {
    maxDailyDose: 80, unit: 'mg', commonDoses: [10, 20, 40, 80],
    minDosage: 10, maxDosage: 80,
    allowedFrequencies: ['cada 24 horas'],
    maxDurationDays: 365,
  },
  'amlodipino': {
    maxDailyDose: 10, unit: 'mg', commonDoses: [5, 10],
    minDosage: 2.5, maxDosage: 10,
    allowedFrequencies: ['cada 24 horas'],
    maxDurationDays: 365,
  },
};

// Validate medication
export function validateMedication(
  name: string, 
  dosage: number, 
  frequency: string, 
  duration: number
): MedicationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!name || name.trim().length === 0) {
    errors.push('Medication name is required');
  }

  if (dosage <= 0) {
    errors.push('Dosage must be greater than 0');
  }

  if (duration <= 0) {
    errors.push('Duration must be greater than 0');
  }

  if (duration > 365) {
    warnings.push('Duration longer than 1 year - verify if intended');
  }

  // Check against medication database
  const medInfo = MEDICATION_CONSTRAINTS[name.toLowerCase() as keyof typeof MEDICATION_CONSTRAINTS];
  if (medInfo) {
    // Calculate daily dose based on frequency
    let dailyMultiplier = 1;
    const freqLower = frequency.toLowerCase();
    
    if (freqLower.includes('dos') || freqLower.includes('twice') || freqLower.includes('bid')) {
      dailyMultiplier = 2;
    } else if (freqLower.includes('tres') || freqLower.includes('three') || freqLower.includes('tid')) {
      dailyMultiplier = 3;
    } else if (freqLower.includes('cuatro') || freqLower.includes('four') || freqLower.includes('qid')) {
      dailyMultiplier = 4;
    }

    const dailyDose = dosage * dailyMultiplier;
    
    if (dailyDose > medInfo.maxDailyDose) {
      errors.push(`Daily dose (${dailyDose}${medInfo.unit}) exceeds maximum recommended (${medInfo.maxDailyDose}${medInfo.unit})`);
    }

    if (!medInfo.commonDoses.includes(dosage)) {
      warnings.push(`Unusual dose - common doses are ${medInfo.commonDoses.join(', ')}${medInfo.unit}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Check for drug interactions
export function checkDrugInteractions(medications: string[]): string[] {
  const interactions: string[] = [];
  
  // Simple interaction checks (can be expanded)
  const lowerMeds = medications.map(med => med.toLowerCase());
  
  if (lowerMeds.includes('warfarina') && lowerMeds.includes('aspirina')) {
    interactions.push('Warfarina + Aspirina: Increased bleeding risk');
  }
  
  if (lowerMeds.includes('digoxina') && lowerMeds.includes('furosemida')) {
    interactions.push('Digoxina + Furosemida: Monitor potassium levels');
  }
  
  if (lowerMeds.includes('metformina') && lowerMeds.includes('contraste')) {
    interactions.push('Metformina + Contrast: Stop metformina before contrast studies');
  }

  return interactions;
}

// Calculate BMI
export function calculateBMI(weight: number, height: number): { bmi: number; category: string } {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 25 && bmi < 30) category = 'Overweight';
  else if (bmi >= 30) category = 'Obese';
  
  return { bmi: Math.round(bmi * 10) / 10, category };
}

// Age calculation
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// Calculate prescription expiry date based on medications (simple heuristic)
export function calculatePrescriptionExpiry(medicationNames: string[]): Date {
  // default 30 days; if antibiotics present, 10 days
  const antibiotics = ['amoxicilina'];
  const hasAntibiotic = medicationNames.some(name => antibiotics.includes(name.toLowerCase()));
  const days = hasAntibiotic ? 10 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// Visual prescription templates minimal dataset for editor
export type PrescriptionTemplate = {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'pediatric' | 'geriatric' | 'specialist' | 'emergency' | 'all';
  elements: Array<any>;
  canvasSettings: {
    backgroundColor: string;
    backgroundImage: string | null;
    canvasSize: { width: number; height: number };
    pageSize: string;
    margin: string;
    showGrid: boolean;
    zoom: number;
  };
  printSettings: {
    paperSize: 'a4' | 'letter' | 'legal';
    orientation: 'portrait' | 'landscape';
    margins: { top: string; right: string; bottom: string; left: string };
  };
};

// Shared canvas preset for A4 portrait
const A4_CANVAS = {
  backgroundColor: '#ffffff',
  backgroundImage: null,
  canvasSize: { width: 794, height: 1123 },
  pageSize: 'A4',
  margin: '20mm',
  showGrid: false,
  zoom: 1,
};

const A4_PRINT = {
  paperSize: 'a4' as const,
  orientation: 'portrait' as const,
  margins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
};

// Common element factory helpers
const makeText = (
  id: string,
  content: string,
  x: number, y: number,
  w: number, h: number,
  style: Record<string, unknown> = {},
  zIndex = 1
) => ({
  id, type: 'text', position: { x, y }, size: { width: w, height: h },
  content, style: { fontSize: 12, fontFamily: 'Arial', color: '#1f2937', textAlign: 'left', lineHeight: 1.5, ...style },
  zIndex, isVisible: true, isLocked: false,
});

const makeSeparator = (id: string, x: number, y: number, w: number, zIndex = 2) => ({
  id, type: 'separator', position: { x, y }, size: { width: w, height: 2 },
  content: '', style: {}, borderColor: '#d1d5db', zIndex, isVisible: true, isLocked: false,
});

const makeLogo = (id: string, x: number, y: number, w: number, h: number, zIndex = 1) => ({
  id, type: 'logo', position: { x, y }, size: { width: w, height: h },
  content: 'LOGO', style: {}, zIndex, isVisible: true, isLocked: false,
});

const makeQR = (id: string, x: number, y: number, size: number, zIndex = 3) => ({
  id, type: 'qr', position: { x, y }, size: { width: size, height: size },
  content: '{{prescriptionId}}', style: {}, zIndex, isVisible: true, isLocked: false,
});

export const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  // ─────────────────────────────────────────────────────
  // GENERAL – Plantilla Clásica
  // ─────────────────────────────────────────────────────
  {
    id: 'general-classic',
    name: 'Clásica',
    description: 'Encabezado con logo, datos del médico y cuerpo de receta',
    category: 'general',
    canvasSettings: A4_CANVAS,
    printSettings: A4_PRINT,
    elements: [
      makeLogo('logo', 50, 30, 80, 80),
      makeText('clinic-name', '{{clinicName}}', 145, 30, 520, 32, { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'left' }, 2),
      makeText('doctor-name', 'Dr. {{doctorName}}', 145, 68, 520, 22, { fontSize: 14, fontWeight: 'bold', color: '#374151' }, 2),
      makeText('doctor-info', '{{doctorSpecialty}}  •  Cédula: {{doctorLicense}}', 145, 93, 520, 20, { fontSize: 11, color: '#6b7280' }, 2),
      makeText('clinic-contact', '{{clinicAddress}}  |  Tel: {{clinicPhone}}  |  {{clinicEmail}}', 50, 118, 694, 18, { fontSize: 10, color: '#9ca3af', textAlign: 'center' }, 2),
      makeSeparator('sep1', 50, 142, 694, 2),
      makeText('rx-label', 'RECETA MÉDICA', 50, 155, 694, 28, { fontSize: 18, fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }, 1),
      makeSeparator('sep2', 50, 189, 694, 2),
      makeText('patient-info', 'Paciente: {{patientName}}', 50, 200, 450, 22, { fontSize: 13, fontWeight: 'bold', color: '#1f2937' }, 1),
      makeText('date', 'Fecha: {{date}}', 510, 200, 180, 22, { fontSize: 12, color: '#6b7280', textAlign: 'right' }, 1),
      makeText('diagnosis', 'Diagnóstico: {{diagnosis}}', 50, 230, 694, 24, { fontSize: 12, color: '#374151' }, 1),
      makeSeparator('sep3', 50, 260, 694, 2),
      makeText('meds-label', 'Rx', 50, 272, 80, 24, { fontSize: 18, fontStyle: 'italic', fontWeight: 'bold', color: '#374151' }, 1),
      makeText('medications', '{{medications}}', 50, 302, 694, 400, { fontSize: 12, color: '#1f2937', lineHeight: 1.8 }, 1),
      makeSeparator('sep4', 50, 720, 694, 2),
      makeText('notes', 'Indicaciones: {{notes}}', 50, 732, 694, 60, { fontSize: 11, color: '#6b7280' }, 1),
      makeText('follow-up', 'Próxima cita: {{followUpDate}}', 50, 805, 250, 20, { fontSize: 11, color: '#6b7280' }, 1),
      makeText('signature-label', '____________________________\nFirma del Médico', 450, 820, 280, 48, { fontSize: 11, color: '#374151', textAlign: 'center' }, 1),
      makeQR('qr', 50, 1020, 80, 3),
      makeText('qr-label', 'Verificar receta', 140, 1040, 150, 20, { fontSize: 9, color: '#9ca3af' }, 3),
    ],
  },

  // ─────────────────────────────────────────────────────
  // GENERAL – Plantilla Minimalista
  // ─────────────────────────────────────────────────────
  {
    id: 'general-minimal',
    name: 'Minimalista',
    description: 'Diseño limpio sin logo, ideal para impresión rápida',
    category: 'general',
    canvasSettings: A4_CANVAS,
    printSettings: A4_PRINT,
    elements: [
      makeText('clinic-name', '{{clinicName}}', 50, 40, 694, 28, { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center' }, 1),
      makeText('doctor-info', 'Dr. {{doctorName}}  –  {{doctorSpecialty}}  –  Cédula: {{doctorLicense}}', 50, 75, 694, 20, { fontSize: 12, color: '#6b7280', textAlign: 'center' }, 1),
      makeText('contact', '{{clinicPhone}}  |  {{clinicEmail}}', 50, 98, 694, 18, { fontSize: 10, color: '#9ca3af', textAlign: 'center' }, 1),
      makeSeparator('sep1', 50, 122, 694, 2),
      makeText('rx-label', 'RECETA MÉDICA', 50, 134, 694, 26, { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#1f2937' }, 1),
      makeSeparator('sep2', 50, 167, 694, 2),
      makeText('patient-row', 'Paciente: {{patientName}}    Fecha: {{date}}', 50, 178, 694, 22, { fontSize: 12, color: '#374151' }, 1),
      makeText('diagnosis', 'Diagnóstico: {{diagnosis}}', 50, 207, 694, 22, { fontSize: 12, color: '#374151' }, 1),
      makeSeparator('sep3', 50, 235, 694, 2),
      makeText('meds', '{{medications}}', 50, 248, 694, 420, { fontSize: 12, color: '#1f2937', lineHeight: 1.8 }, 1),
      makeSeparator('sep4', 50, 685, 694, 2),
      makeText('notes', 'Indicaciones: {{notes}}', 50, 697, 694, 60, { fontSize: 11, color: '#6b7280' }, 1),
      makeText('signature-label', '____________________________\nFirma del Médico', 450, 800, 280, 48, { fontSize: 11, color: '#374151', textAlign: 'center' }, 1),
      makeQR('qr', 50, 1020, 72, 3),
    ],
  },

  // ─────────────────────────────────────────────────────
  // SPECIALIST – Dos columnas
  // ─────────────────────────────────────────────────────
  {
    id: 'specialist-two-col',
    name: 'Especialista (2 columnas)',
    description: 'Encabezado con logo + datos del médico en columna lateral',
    category: 'specialist',
    canvasSettings: A4_CANVAS,
    printSettings: A4_PRINT,
    elements: [
      makeLogo('logo', 50, 30, 90, 90),
      makeText('clinic-name', '{{clinicName}}', 160, 30, 480, 30, { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f' }, 2),
      makeText('doctor-name', 'Dr. {{doctorName}}', 160, 66, 480, 22, { fontSize: 14, fontWeight: 'bold', color: '#374151' }, 2),
      makeText('specialty', '{{doctorSpecialty}}', 160, 90, 300, 18, { fontSize: 12, color: '#6b7280' }, 2),
      makeText('license', 'Cédula: {{doctorLicense}}', 160, 110, 300, 18, { fontSize: 11, color: '#6b7280' }, 2),
      makeText('address', '{{clinicAddress}}', 160, 130, 480, 18, { fontSize: 10, color: '#9ca3af' }, 2),
      makeText('phone', 'Tel: {{clinicPhone}}', 160, 148, 240, 16, { fontSize: 10, color: '#9ca3af' }, 2),
      makeSeparator('sep1', 50, 172, 694, 2),
      makeText('rx-title', 'RECETA MÉDICA', 50, 184, 694, 26, { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#1e3a5f' }, 1),
      makeSeparator('sep2', 50, 217, 694, 2),
      makeText('patient', 'Paciente: {{patientName}}', 50, 228, 400, 22, { fontSize: 13, fontWeight: 'bold' }, 1),
      makeText('date', 'Fecha: {{date}}', 510, 228, 180, 22, { fontSize: 12, color: '#6b7280', textAlign: 'right' }, 1),
      makeText('diagnosis', 'Diagnóstico: {{diagnosis}}', 50, 256, 694, 22, { fontSize: 12, color: '#374151' }, 1),
      makeSeparator('sep3', 50, 284, 694, 2),
      makeText('meds-title', 'Rx', 50, 295, 60, 24, { fontSize: 18, fontStyle: 'italic', fontWeight: 'bold', color: '#1e3a5f' }, 1),
      makeText('meds', '{{medications}}', 50, 325, 694, 380, { fontSize: 12, lineHeight: 1.8, color: '#1f2937' }, 1),
      makeSeparator('sep4', 50, 720, 694, 2),
      makeText('notes', 'Indicaciones: {{notes}}', 50, 732, 694, 60, { fontSize: 11, color: '#6b7280' }, 1),
      makeText('signature', '____________________________\nDr. {{doctorName}}\nFirma y Sello', 440, 818, 300, 60, { fontSize: 11, color: '#374151', textAlign: 'center' }, 1),
      makeQR('qr', 50, 1020, 80, 3),
    ],
  },

  // ─────────────────────────────────────────────────────
  // PEDIATRIC
  // ─────────────────────────────────────────────────────
  {
    id: 'pediatric-colorful',
    name: 'Pediátrica',
    description: 'Encabezado amigable con datos de peso y edad',
    category: 'pediatric',
    canvasSettings: { ...A4_CANVAS, backgroundColor: '#fefefe' },
    printSettings: A4_PRINT,
    elements: [
      makeLogo('logo', 50, 28, 75, 75),
      makeText('clinic-name', '{{clinicName}}', 140, 28, 500, 30, { fontSize: 20, fontWeight: 'bold', color: '#1d4ed8' }, 2),
      makeText('doctor-info', 'Dr. {{doctorName}}  •  {{doctorSpecialty}}  •  Cédula: {{doctorLicense}}', 140, 62, 500, 18, { fontSize: 11, color: '#6b7280' }, 2),
      makeText('contact', '{{clinicPhone}}  |  {{clinicAddress}}', 50, 105, 694, 16, { fontSize: 10, color: '#9ca3af', textAlign: 'center' }, 2),
      makeSeparator('sep1', 50, 126, 694, 2),
      makeText('rx-title', 'RECETA PEDIÁTRICA', 50, 138, 694, 28, { fontSize: 17, fontWeight: 'bold', textAlign: 'center', color: '#1d4ed8' }, 1),
      makeSeparator('sep2', 50, 172, 694, 2),
      makeText('patient', 'Paciente: {{patientName}}', 50, 183, 400, 22, { fontSize: 13, fontWeight: 'bold', color: '#1f2937' }, 1),
      makeText('date', 'Fecha: {{date}}', 510, 183, 180, 22, { fontSize: 12, color: '#6b7280', textAlign: 'right' }, 1),
      makeText('patient-data', 'Edad: {{patientAge}}    Peso: {{patientWeight}}', 50, 212, 400, 20, { fontSize: 12, color: '#374151' }, 1),
      makeText('allergies', 'Alergias: {{patientAllergies}}', 50, 234, 694, 20, { fontSize: 11, color: '#dc2626' }, 1),
      makeText('diagnosis', 'Diagnóstico: {{diagnosis}}', 50, 260, 694, 22, { fontSize: 12, color: '#374151' }, 1),
      makeSeparator('sep3', 50, 288, 694, 2),
      makeText('meds-title', 'Rx', 50, 299, 60, 24, { fontSize: 18, fontStyle: 'italic', fontWeight: 'bold', color: '#1d4ed8' }, 1),
      makeText('meds', '{{medications}}', 50, 328, 694, 380, { fontSize: 12, lineHeight: 1.9, color: '#1f2937' }, 1),
      makeSeparator('sep4', 50, 722, 694, 2),
      makeText('notes', 'Indicaciones: {{notes}}', 50, 734, 694, 60, { fontSize: 11, color: '#6b7280' }, 1),
      makeText('follow-up', 'Próxima revisión: {{followUpDate}}', 50, 806, 300, 20, { fontSize: 11, color: '#6b7280' }, 1),
      makeText('signature', '____________________________\nDr. {{doctorName}}', 440, 818, 300, 48, { fontSize: 11, color: '#374151', textAlign: 'center' }, 1),
      makeQR('qr', 50, 1020, 72, 3),
    ],
  },

  // ─────────────────────────────────────────────────────
  // GERIATRIC
  // ─────────────────────────────────────────────────────
  {
    id: 'geriatric-large',
    name: 'Geriátrica (letra grande)',
    description: 'Fuente más grande, espaciado amplio para adultos mayores',
    category: 'geriatric',
    canvasSettings: A4_CANVAS,
    printSettings: A4_PRINT,
    elements: [
      makeLogo('logo', 50, 30, 80, 80),
      makeText('clinic-name', '{{clinicName}}', 148, 30, 520, 32, { fontSize: 22, fontWeight: 'bold', color: '#111827' }, 2),
      makeText('doctor-info', 'Dr. {{doctorName}}  •  {{doctorSpecialty}}  •  Cédula: {{doctorLicense}}', 148, 68, 520, 20, { fontSize: 12, color: '#6b7280' }, 2),
      makeText('contact', '{{clinicPhone}}  |  {{clinicAddress}}', 50, 116, 694, 18, { fontSize: 11, color: '#9ca3af', textAlign: 'center' }, 2),
      makeSeparator('sep1', 50, 140, 694, 2),
      makeText('rx-title', 'RECETA MÉDICA', 50, 152, 694, 30, { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#111827' }, 1),
      makeSeparator('sep2', 50, 188, 694, 2),
      makeText('patient', 'Paciente: {{patientName}}', 50, 200, 450, 26, { fontSize: 15, fontWeight: 'bold', color: '#1f2937' }, 1),
      makeText('date', 'Fecha: {{date}}', 510, 200, 180, 24, { fontSize: 13, color: '#6b7280', textAlign: 'right' }, 1),
      makeText('diagnosis', 'Diagnóstico: {{diagnosis}}', 50, 234, 694, 26, { fontSize: 14, color: '#374151' }, 1),
      makeSeparator('sep3', 50, 268, 694, 2),
      makeText('meds-title', 'Rx', 50, 280, 60, 28, { fontSize: 20, fontStyle: 'italic', fontWeight: 'bold', color: '#374151' }, 1),
      makeText('meds', '{{medications}}', 50, 315, 694, 340, { fontSize: 14, lineHeight: 2.0, color: '#1f2937' }, 1),
      makeSeparator('sep4', 50, 670, 694, 2),
      makeText('notes', 'Indicaciones: {{notes}}', 50, 683, 694, 70, { fontSize: 13, color: '#6b7280', lineHeight: 1.7 }, 1),
      makeText('follow-up', 'Próxima cita: {{followUpDate}}', 50, 765, 300, 24, { fontSize: 12, color: '#6b7280' }, 1),
      makeText('signature', '____________________________\nDr. {{doctorName}}', 440, 810, 300, 52, { fontSize: 12, color: '#374151', textAlign: 'center' }, 1),
      makeQR('qr', 50, 1020, 80, 3),
    ],
  },

  // ─────────────────────────────────────────────────────
  // EMERGENCY – Sin logo, información rápida
  // ─────────────────────────────────────────────────────
  {
    id: 'emergency-compact',
    name: 'Urgencias (compacta)',
    description: 'Formato rápido para urgencias, sin logo',
    category: 'emergency',
    canvasSettings: A4_CANVAS,
    printSettings: A4_PRINT,
    elements: [
      makeText('clinic-name', '{{clinicName}}  –  URGENCIAS', 50, 30, 694, 28, { fontSize: 18, fontWeight: 'bold', color: '#b91c1c', textAlign: 'center' }, 1),
      makeText('doctor-info', 'Dr. {{doctorName}}  •  {{doctorSpecialty}}  •  Cédula: {{doctorLicense}}', 50, 64, 694, 18, { fontSize: 11, color: '#6b7280', textAlign: 'center' }, 1),
      makeSeparator('sep1', 50, 88, 694, 2),
      makeText('patient-row', 'Paciente: {{patientName}}    |    Fecha: {{date}}', 50, 100, 694, 22, { fontSize: 13, fontWeight: 'bold', color: '#1f2937' }, 1),
      makeText('patient-data', 'Edad: {{patientAge}}    Peso: {{patientWeight}}    Alergias: {{patientAllergies}}', 50, 126, 694, 18, { fontSize: 11, color: '#dc2626' }, 1),
      makeText('diagnosis', 'Diagnóstico: {{diagnosis}}', 50, 150, 694, 22, { fontSize: 13, color: '#374151', fontWeight: 'bold' }, 1),
      makeSeparator('sep2', 50, 178, 694, 2),
      makeText('meds-title', 'Rx  (Urgencia)', 50, 190, 694, 24, { fontSize: 16, fontStyle: 'italic', fontWeight: 'bold', color: '#b91c1c' }, 1),
      makeText('meds', '{{medications}}', 50, 220, 694, 400, { fontSize: 13, lineHeight: 1.8, color: '#1f2937' }, 1),
      makeSeparator('sep3', 50, 636, 694, 2),
      makeText('notes', 'Indicaciones: {{notes}}', 50, 648, 694, 60, { fontSize: 12, color: '#6b7280' }, 1),
      makeText('signature', '____________________________\nDr. {{doctorName}}', 440, 750, 300, 52, { fontSize: 12, color: '#374151', textAlign: 'center' }, 1),
      makeQR('qr', 50, 1020, 72, 3),
    ],
  },
];

export function getTemplatesByCategory(category: PrescriptionTemplate['category'] | 'all') {
  if (category === 'all') return PRESCRIPTION_TEMPLATES;
  return PRESCRIPTION_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string) {
  return PRESCRIPTION_TEMPLATES.find(t => t.id === id);
}
