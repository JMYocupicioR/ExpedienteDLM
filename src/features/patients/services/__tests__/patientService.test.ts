import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Patient, PatientInsert } from '../patientService';

// Mock de Supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockIlike = vi.fn();
const mockLimit = vi.fn();
const mockGte = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Mock de encryption
const mockEncrypt = vi.fn((data) => Promise.resolve(data));
const mockDecrypt = vi.fn((data) => Promise.resolve(data));

vi.mock('@/lib/encryption', () => ({
  encryptPatientPHI: mockEncrypt,
  decryptPatientPHI: mockDecrypt,
}));

import {
  getPatientsByClinic,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  searchPatients,
  getPatientStats,
} from '../patientService';

describe('patientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain setup
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
      ilike: mockIlike,
      gte: mockGte,
    });
    mockEq.mockReturnValue({
      order: mockOrder,
      single: mockSingle,
      eq: mockEq,
    });
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });
    mockIlike.mockReturnValue({
      order: mockOrder,
      limit: mockLimit,
    });
    mockLimit.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  describe('getPatientsByClinic', () => {
    it('should return decrypted patients for a clinic', async () => {
      const mockPatients = [
        { id: 'patient-1', full_name: 'Juan Pérez', clinic_id: 'clinic-1' },
        { id: 'patient-2', full_name: 'María García', clinic_id: 'clinic-1' },
      ];

      mockOrder.mockResolvedValue({
        data: mockPatients,
        error: null,
      });

      mockDecrypt.mockImplementation((patient) => Promise.resolve(patient));

      const result = await getPatientsByClinic('clinic-1');

      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledWith('patients');
      expect(mockEq).toHaveBeenCalledWith('clinic_id', 'clinic-1');
      expect(mockOrder).toHaveBeenCalledWith('full_name');
      expect(mockDecrypt).toHaveBeenCalledTimes(2);
    });

    it('should throw error on database error', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(getPatientsByClinic('clinic-1')).rejects.toThrow('Database error');
    });

    it('should return empty array when no patients exist', async () => {
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getPatientsByClinic('clinic-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPatientById', () => {
    it('should return decrypted patient by ID', async () => {
      const mockPatient = {
        id: 'patient-1',
        full_name: 'Juan Pérez',
        clinic_id: 'clinic-1',
      };

      mockSingle.mockResolvedValue({
        data: mockPatient,
        error: null,
      });

      mockDecrypt.mockResolvedValue(mockPatient);

      const result = await getPatientById('patient-1');

      expect(result).toEqual(mockPatient);
      expect(mockEq).toHaveBeenCalledWith('id', 'patient-1');
      expect(mockDecrypt).toHaveBeenCalledWith(mockPatient);
    });

    it('should filter by clinic ID when provided', async () => {
      const mockPatient = {
        id: 'patient-1',
        full_name: 'Juan Pérez',
        clinic_id: 'clinic-1',
      };

      mockEq.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });

      mockSingle.mockResolvedValue({
        data: mockPatient,
        error: null,
      });

      await getPatientById('patient-1', 'clinic-1');

      expect(mockEq).toHaveBeenCalledWith('id', 'patient-1');
      expect(mockEq).toHaveBeenCalledWith('clinic_id', 'clinic-1');
    });

    it('should throw error when patient not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(getPatientById('invalid-id')).rejects.toThrow('Not found');
    });
  });

  describe('createPatient', () => {
    const mockPatientData: PatientInsert = {
      full_name: 'Juan Pérez',
      social_security_number: 'CURP123456',
      email: 'juan@example.com',
      phone: '5551234567',
      birth_date: '1990-01-01',
      gender: 'male',
      clinic_id: 'clinic-1',
    };

    beforeEach(() => {
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });
    });

    it('should create encrypted patient and return decrypted', async () => {
      const mockCreatedPatient = {
        id: 'patient-1',
        ...mockPatientData,
      };

      mockEncrypt.mockResolvedValue(mockPatientData);
      mockDecrypt.mockResolvedValue(mockCreatedPatient);

      mockSingle.mockResolvedValue({
        data: mockCreatedPatient,
        error: null,
      });

      const result = await createPatient(mockPatientData, 'clinic-1');

      expect(result).toEqual(mockCreatedPatient);
      expect(mockEncrypt).toHaveBeenCalled();
      expect(mockDecrypt).toHaveBeenCalledWith(mockCreatedPatient);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should uppercase and trim CURP', async () => {
      const dataWithCurp = {
        ...mockPatientData,
        social_security_number: '  curp123  ',
      };

      mockSingle.mockResolvedValue({
        data: { id: 'patient-1', ...dataWithCurp },
        error: null,
      });

      await createPatient(dataWithCurp, 'clinic-1');

      const encryptCall = mockEncrypt.mock.calls[0][0];
      expect(encryptCall.social_security_number).toBe('CURP123');
    });

    it('should throw error on duplicate CURP', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "unique_clinic_social_security"',
        },
      });

      await expect(
        createPatient(mockPatientData, 'clinic-1')
      ).rejects.toThrow('Ya existe un paciente con este número de seguridad social');
    });

    it('should throw error on database error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: {
          code: '23503',
          message: 'Foreign key violation',
        },
      });

      await expect(
        createPatient(mockPatientData, 'clinic-1')
      ).rejects.toThrow('Error al crear el paciente');
    });

    it('should set default values for optional fields', async () => {
      const minimalData: PatientInsert = {
        full_name: 'Juan Pérez',
        clinic_id: 'clinic-1',
      };

      mockSingle.mockResolvedValue({
        data: { id: 'patient-1', ...minimalData },
        error: null,
      });

      await createPatient(minimalData, 'clinic-1');

      const encryptCall = mockEncrypt.mock.calls[0][0];
      expect(encryptCall.is_active).toBe(true);
      expect(encryptCall.insurance_info).toEqual({});
      expect(encryptCall.emergency_contact).toEqual({});
    });
  });

  describe('updatePatient', () => {
    beforeEach(() => {
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        eq: mockEq,
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });
    });

    it('should update and return decrypted patient', async () => {
      const updates = {
        phone: '5559999999',
        email: 'newemail@example.com',
      };

      const mockUpdatedPatient = {
        id: 'patient-1',
        full_name: 'Juan Pérez',
        ...updates,
      };

      mockSingle.mockResolvedValue({
        data: mockUpdatedPatient,
        error: null,
      });

      mockEncrypt.mockResolvedValue(updates);
      mockDecrypt.mockResolvedValue(mockUpdatedPatient);

      const result = await updatePatient('patient-1', updates, 'clinic-1');

      expect(result).toEqual(mockUpdatedPatient);
      expect(mockEncrypt).toHaveBeenCalled();
      expect(mockDecrypt).toHaveBeenCalledWith(mockUpdatedPatient);
      expect(mockEq).toHaveBeenCalledWith('id', 'patient-1');
      expect(mockEq).toHaveBeenCalledWith('clinic_id', 'clinic-1');
    });

    it('should not allow updating protected fields', async () => {
      const updates = {
        id: 'new-id',
        clinic_id: 'new-clinic',
        created_at: '2025-01-01',
        phone: '5559999999',
      };

      mockSingle.mockResolvedValue({
        data: { id: 'patient-1', phone: '5559999999' },
        error: null,
      });

      await updatePatient('patient-1', updates as any, 'clinic-1');

      const encryptCall = mockEncrypt.mock.calls[0][0];
      expect(encryptCall.id).toBeUndefined();
      expect(encryptCall.clinic_id).toBeUndefined();
      expect(encryptCall.created_at).toBeUndefined();
      expect(encryptCall.phone).toBe('5559999999');
    });

    it('should throw error when patient not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        updatePatient('invalid-id', {}, 'clinic-1')
      ).rejects.toThrow('Not found');
    });
  });

  describe('deletePatient', () => {
    beforeEach(() => {
      mockDelete.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        eq: mockEq,
      });
    });

    it('should delete patient successfully', async () => {
      mockEq.mockResolvedValue({
        error: null,
      });

      const result = await deletePatient('patient-1', 'clinic-1');

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'patient-1');
      expect(mockEq).toHaveBeenCalledWith('clinic_id', 'clinic-1');
    });

    it('should throw error on delete failure', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      await expect(
        deletePatient('patient-1', 'clinic-1')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('searchPatients', () => {
    it('should search and return decrypted patients', async () => {
      const mockResults = [
        { id: 'patient-1', full_name: 'Juan Pérez' },
        { id: 'patient-2', full_name: 'Juana García' },
      ];

      mockLimit.mockResolvedValue({
        data: mockResults,
        error: null,
      });

      mockDecrypt.mockImplementation((patient) => Promise.resolve(patient));

      const result = await searchPatients('Juan', 'clinic-1');

      expect(result).toHaveLength(2);
      expect(mockIlike).toHaveBeenCalledWith('full_name', '%Juan%');
      expect(mockDecrypt).toHaveBeenCalledTimes(2);
    });

    it('should respect limit parameter', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null,
      });

      await searchPatients('test', 'clinic-1', 10);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 20', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null,
      });

      await searchPatients('test', 'clinic-1');

      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('should throw error on search failure', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Search failed' },
      });

      await expect(
        searchPatients('test', 'clinic-1')
      ).rejects.toThrow('Search failed');
    });
  });

  describe('getPatientStats', () => {
    beforeEach(() => {
      mockSelect.mockReturnValue({
        eq: mockEq,
        gte: mockGte,
      });
    });

    it('should return patient statistics', async () => {
      // Mock total count
      mockEq.mockResolvedValueOnce({
        count: 100,
        error: null,
      });

      // Mock new patients count
      mockGte.mockResolvedValueOnce({
        count: 15,
        error: null,
      });

      const result = await getPatientStats('clinic-1');

      expect(result).toEqual({
        total: 100,
        newThisMonth: 15,
        activeThisMonth: 0,
      });
    });

    it('should return zeros on error', async () => {
      mockEq.mockResolvedValue({
        count: null,
        error: { message: 'Error' },
      });

      await expect(
        getPatientStats('clinic-1')
      ).rejects.toThrow();
    });
  });
});
