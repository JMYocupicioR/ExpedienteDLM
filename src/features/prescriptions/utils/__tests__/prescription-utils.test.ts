import { describe, it, expect } from 'vitest';
import {
  formatMedications,
  replaceTemplateVariables,
  calculateExpiry,
  filterEmptyMedications,
  createBlankMedication,
} from '../prescription-utils';

describe('prescription-utils', () => {
  describe('formatMedications', () => {
    it('returns "Sin medicamentos" for empty array', () => {
      expect(formatMedications([])).toBe('Sin medicamentos');
    });

    it('formats single medication with all fields', () => {
      const meds = [
        {
          name: 'Paracetamol',
          dosage: '500mg',
          frequency: 'Cada 8 horas',
          duration: '7 días',
          instructions: 'Tomar con alimentos',
        },
      ];
      const result = formatMedications(meds);
      expect(result).toContain('1. Paracetamol 500mg');
      expect(result).toContain('Frecuencia: Cada 8 horas');
      expect(result).toContain('Duración: 7 días');
      expect(result).toContain('Instrucciones: Tomar con alimentos');
    });

    it('filters out empty medication rows', () => {
      const meds = [
        { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
        { name: 'Ibuprofeno', dosage: '400mg', frequency: '', duration: '', instructions: '' },
      ];
      const result = formatMedications(meds);
      expect(result).toContain('Ibuprofeno');
      expect(result).not.toContain('undefined');
    });
  });

  describe('replaceTemplateVariables', () => {
    it('replaces {{patientName}} and {{doctorName}}', () => {
      const result = replaceTemplateVariables(
        'Paciente: {{patientName}} - Médico: {{doctorName}}',
        {
          patientName: 'Juan Pérez',
          doctorName: 'Dr. García',
          medications: [],
        }
      );
      expect(result).toBe('Paciente: Juan Pérez - Médico: Dr. García');
    });

    it('replaces {{clinicName}} and {{clinicAddress}}', () => {
      const result = replaceTemplateVariables(
        '{{clinicName}} - {{clinicAddress}}',
        {
          clinicName: 'Clínica Central',
          clinicAddress: 'Av. Principal 123',
          medications: [],
        }
      );
      expect(result).toBe('Clínica Central - Av. Principal 123');
    });

    it('replaces {{medications}} with formatted list', () => {
      const result = replaceTemplateVariables('{{medications}}', {
        medications: [
          { name: 'A', dosage: '10mg', frequency: '', duration: '', instructions: '' },
        ],
      });
      expect(result).toContain('1. A 10mg');
    });

    it('returns empty string for empty content', () => {
      expect(replaceTemplateVariables('', { medications: [] })).toBe('');
    });
  });

  describe('calculateExpiry', () => {
    it('returns 30 days ahead for empty medications', () => {
      const result = calculateExpiry([]);
      const now = new Date();
      const expected = new Date();
      expected.setDate(expected.getDate() + 30);
      expect(result.getDate()).toBe(expected.getDate());
    });

    it('uses max duration from medications with minimum 30 days', () => {
      const meds = [
        { name: 'A', dosage: '', frequency: '', duration: '7 días', instructions: '' },
        { name: 'B', dosage: '', frequency: '', duration: '15', instructions: '' },
      ];
      const result = calculateExpiry(meds);
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 30); // minimum is 30
      expect(result.getTime()).toBeGreaterThanOrEqual(expected.getTime() - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(expected.getTime() + 1000);
    });

    it('uses "2 meses" for 60 days', () => {
      const meds = [{ name: 'A', dosage: '', frequency: '', duration: '2 meses', instructions: '' }];
      const result = calculateExpiry(meds);
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 60);
      expect(result.getTime()).toBeGreaterThanOrEqual(expected.getTime() - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(expected.getTime() + 1000);
    });
  });

  describe('filterEmptyMedications', () => {
    it('filters out rows with no name and no dosage', () => {
      const meds = [
        createBlankMedication(),
        { ...createBlankMedication(), name: 'Paracetamol' },
      ];
      expect(filterEmptyMedications(meds)).toHaveLength(1);
    });
  });
});
