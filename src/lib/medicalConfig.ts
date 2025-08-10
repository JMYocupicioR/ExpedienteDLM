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
};

export const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'default',
    name: 'Plantilla Básica',
    description: 'Estructura simple con encabezado y cuerpo',
    category: 'general',
    elements: []
  }
];

export function getTemplatesByCategory(category: PrescriptionTemplate['category'] | 'all') {
  if (category === 'all') return PRESCRIPTION_TEMPLATES;
  return PRESCRIPTION_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string) {
  return PRESCRIPTION_TEMPLATES.find(t => t.id === id);
}
