// =====================================================
// UTILIDADES CONSOLIDADAS DEL MÓDULO DE PRESCRIPCIONES
// =====================================================
// Consolida funciones duplicadas de:
//   - VisualPrescriptionRenderer.tsx (formatMedications, replaceTemplateVariables)
//   - prescriptionPrint.ts (formatMedications)
//   - useUnifiedPrescriptionSystem.ts (calculateExpiry)
//   - medicalConfig.ts (calculatePrescriptionExpiry)

import type { Medication, PrescriptionRenderData } from '../types';

// =====================================================
// FORMAT MEDICATIONS
// =====================================================

/**
 * Formats an array of medications into a readable string for rendering/printing.
 * Single source of truth - replaces duplicates in Renderer and PrintService.
 */
export function formatMedications(medications: Medication[], numbered = true): string {
  if (!medications || medications.length === 0) return 'Sin medicamentos';

  return medications
    .filter(m => m.name?.trim())
    .map((med, idx) => {
      const num = numbered ? `${idx + 1}. ` : '';
      const lines = [
        `${num}${med.name} ${med.dosage || ''}`.trim(),
      ];
      if (med.frequency) lines.push(`   Frecuencia: ${med.frequency}`);
      if (med.duration) lines.push(`   Duración: ${med.duration}`);
      if (med.instructions) lines.push(`   Instrucciones: ${med.instructions}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

// =====================================================
// TEMPLATE VARIABLE REPLACEMENT
// =====================================================

/**
 * Replaces template variables ({{patientName}}, {{medications}}, etc.) in content.
 * Single source of truth - replaces duplicates in Renderer and Editor.
 */
export function replaceTemplateVariables(
  content: string,
  data: PrescriptionRenderData
): string {
  if (!content) return '';

  const variables: Record<string, string> = {
    '{{patientName}}': data.patientName || '',
    '{{doctorName}}': data.doctorName || '',
    '{{doctorLicense}}': data.doctorLicense || '',
    '{{doctorSpecialty}}': data.doctorSpecialty || '',
    '{{clinicName}}': data.clinicName || '',
    '{{clinicAddress}}': data.clinicAddress || '',
    '{{clinicPhone}}': data.clinicPhone || '',
    '{{clinicEmail}}': data.clinicEmail || '',
    '{{diagnosis}}': data.diagnosis || '',
    '{{medications}}': formatMedications(data.medications || []),
    '{{notes}}': data.notes || '',
    '{{date}}': data.date || new Date().toLocaleDateString('es-ES'),
    '{{patientAge}}': data.patientAge || '',
    '{{patientWeight}}': data.patientWeight || '',
    '{{patientAllergies}}': data.patientAllergies || '',
    '{{followUpDate}}': data.followUpDate || '',
    '{{prescriptionId}}': data.prescriptionId || '',
  };

  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return result;
}

// =====================================================
// EXPIRY CALCULATION
// =====================================================

/**
 * Calculates prescription expiry date based on medication durations.
 * Single source of truth - replaces calculatePrescriptionExpiry in medicalConfig
 * and inline calculations in hooks.
 */
export function calculateExpiry(medications: Medication[]): Date {
  if (!medications || medications.length === 0) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }

  const maxDurationDays = Math.max(
    ...medications.map(m => {
      const raw = m.duration?.toLowerCase() || '';
      const num = parseInt(raw);
      if (isNaN(num)) return 30;
      if (raw.includes('mes') || raw.includes('month')) return num * 30;
      if (raw.includes('semana') || raw.includes('week')) return num * 7;
      return num; // assume days
    }),
    30 // minimum 30 days
  );

  const d = new Date();
  d.setDate(d.getDate() + maxDurationDays);
  return d;
}

// =====================================================
// STATUS HELPERS
// =====================================================

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Activa';
    case 'completed': return 'Completada';
    case 'cancelled': return 'Cancelada';
    default: return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-emerald-400';
    case 'completed': return 'text-blue-400';
    case 'cancelled': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/20';
    case 'completed': return 'bg-blue-500/20';
    case 'cancelled': return 'bg-red-500/20';
    default: return 'bg-gray-500/20';
  }
}

// =====================================================
// MEDICATION HELPERS
// =====================================================

/**
 * Checks if a medication row has meaningful content (not just empty).
 */
export function isMedicationEmpty(med: Medication): boolean {
  return !med.name?.trim() && !med.dosage?.trim();
}

/**
 * Filters out empty medication rows from an array.
 */
export function filterEmptyMedications(medications: Medication[]): Medication[] {
  return medications.filter(m => !isMedicationEmpty(m));
}

/**
 * Creates a blank medication row.
 */
export function createBlankMedication(): Medication {
  return {
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  };
}
