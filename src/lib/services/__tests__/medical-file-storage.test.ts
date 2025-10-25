import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FileMetadata } from '../medical-file-storage';

// Mock de Supabase Storage
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
    from: mockFrom,
  },
}));

// Mock de crypto-js
vi.mock('crypto-js/md5', () => ({
  default: vi.fn((data: any) => ({
    toString: () => 'mock-hash-12345',
  })),
}));

import { MedicalFileStorage } from '../medical-file-storage';

describe('MedicalFileStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      limit: mockLimit,
      order: mockOrder,
    });
    mockLimit.mockResolvedValue({
      data: [],
      error: null,
    });
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  describe('validateFile', () => {
    it('should validate file size', () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });

      const result = MedicalFileStorage.validateFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('excede el tamaño máximo');
    });

    it('should validate allowed file extensions', () => {
      const invalidFile = new File(['test'], 'test.exe', {
        type: 'application/x-msdownload',
      });

      const result = MedicalFileStorage.validateFile(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('no permitido');
    });

    it('should validate MIME type matches extension', () => {
      const mismatchFile = new File(['test'], 'test.pdf', {
        type: 'image/jpeg',
      });

      const result = MedicalFileStorage.validateFile(mismatchFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('no coincide');
    });

    it('should pass validation for valid PDF file', () => {
      const validFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const result = MedicalFileStorage.validateFile(validFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass validation for valid image file', () => {
      const validFile = new File(['image data'], 'test.jpg', {
        type: 'image/jpeg',
      });

      const result = MedicalFileStorage.validateFile(validFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove accents from filename', () => {
      const result = MedicalFileStorage.sanitizeFileName('Estudio de María José.pdf');

      expect(result).toBe('estudio_de_maria_jose.pdf');
    });

    it('should replace special characters with underscores', () => {
      const result = MedicalFileStorage.sanitizeFileName('archivo#test@2024!.pdf');

      expect(result).toBe('archivo_test_2024_.pdf');
    });

    it('should convert to lowercase', () => {
      const result = MedicalFileStorage.sanitizeFileName('DOCUMENTO.PDF');

      expect(result).toBe('documento.pdf');
    });

    it('should remove multiple consecutive underscores', () => {
      const result = MedicalFileStorage.sanitizeFileName('archivo___test.pdf');

      expect(result).toBe('archivo_test.pdf');
    });

    it('should preserve dots and hyphens', () => {
      const result = MedicalFileStorage.sanitizeFileName('archivo-test.v1.pdf');

      expect(result).toBe('archivo-test.v1.pdf');
    });
  });

  describe('calculateFileHash', () => {
    it('should calculate MD5 hash of file', async () => {
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const hash = await MedicalFileStorage.calculateFileHash(file);

      expect(hash).toBe('mock-hash-12345');
    });
  });

  describe('checkDuplicate', () => {
    it('should return true when duplicate exists', async () => {
      mockLimit.mockResolvedValue({
        data: [{ id: 'file-1' }],
        error: null,
      });

      const result = await MedicalFileStorage.checkDuplicate('hash-123', 'study-1');

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('medical_test_files');
      expect(mockEq).toHaveBeenCalledWith('medical_test_id', 'study-1');
      expect(mockEq).toHaveBeenCalledWith('file_hash', 'hash-123');
    });

    it('should return false when no duplicate exists', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await MedicalFileStorage.checkDuplicate('hash-123', 'study-1');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await MedicalFileStorage.checkDuplicate('hash-123', 'study-1');

      expect(result).toBe(false);
    });
  });

  describe('upload', () => {
    const mockMetadata: FileMetadata = {
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      studyId: 'study-1',
      uploadedBy: 'user-1',
    };

    beforeEach(() => {
      mockUpload.mockResolvedValue({
        error: null,
      });
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl: 'https://example.com/file.pdf',
        },
      });
    });

    it('should upload valid file successfully', async () => {
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const result = await MedicalFileStorage.upload(file, mockMetadata);

      expect(result).toMatchObject({
        url: 'https://example.com/file.pdf',
        size: file.size,
        type: 'application/pdf',
        hash: 'mock-hash-12345',
      });
      expect(result.path).toContain('clinic-1/patient-1/study-1');
      expect(result.path).toContain('test.pdf');
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should sanitize filename before upload', async () => {
      const file = new File(['test'], 'Estudio de María.pdf', {
        type: 'application/pdf',
      });

      await MedicalFileStorage.upload(file, mockMetadata);

      const uploadCall = mockUpload.mock.calls[0];
      expect(uploadCall[0]).toContain('estudio_de_maria.pdf');
    });

    it('should throw error on invalid file', async () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });

      await expect(
        MedicalFileStorage.upload(largeFile, mockMetadata)
      ).rejects.toThrow('excede el tamaño máximo');
    });

    it('should throw error on upload failure', async () => {
      mockUpload.mockResolvedValue({
        error: { message: 'Upload failed' },
      });

      const file = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      await expect(
        MedicalFileStorage.upload(file, mockMetadata)
      ).rejects.toThrow('Error al subir archivo');
    });
  });

  describe('delete', () => {
    it('should delete file successfully', async () => {
      mockRemove.mockResolvedValue({
        error: null,
      });

      await expect(
        MedicalFileStorage.delete('clinic-1/patient-1/study-1/file.pdf')
      ).resolves.not.toThrow();

      expect(mockRemove).toHaveBeenCalledWith(['clinic-1/patient-1/study-1/file.pdf']);
    });

    it('should throw error on delete failure', async () => {
      mockRemove.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      await expect(
        MedicalFileStorage.delete('path/to/file.pdf')
      ).rejects.toThrow('Error al eliminar archivo');
    });
  });

  describe('listFiles', () => {
    it('should list files for a study', async () => {
      const mockFiles = [
        { id: 'file-1', file_name: 'test1.pdf' },
        { id: 'file-2', file_name: 'test2.pdf' },
      ];

      mockOrder.mockResolvedValue({
        data: mockFiles,
        error: null,
      });

      const result = await MedicalFileStorage.listFiles('study-1');

      expect(result).toEqual(mockFiles);
      expect(mockFrom).toHaveBeenCalledWith('medical_test_files');
      expect(mockEq).toHaveBeenCalledWith('medical_test_id', 'study-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no files exist', async () => {
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await MedicalFileStorage.listFiles('study-1');

      expect(result).toEqual([]);
    });

    it('should throw error on database error', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        MedicalFileStorage.listFiles('study-1')
      ).rejects.toThrow('Error al listar archivos');
    });
  });

  describe('getStorageStats', () => {
    it('should calculate storage statistics', async () => {
      const mockFiles = [
        { file_size: 1000, file_type: 'application/pdf' },
        { file_size: 2000, file_type: 'application/pdf' },
        { file_size: 3000, file_type: 'image/jpeg' },
      ];

      mockSelect.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockFiles,
          error: null,
        }),
      });

      const result = await MedicalFileStorage.getStorageStats('patient-1');

      expect(result.totalSize).toBe(6000);
      expect(result.fileCount).toBe(3);
      expect(result.typeBreakdown).toEqual({
        'application/pdf': 2,
        'image/jpeg': 1,
      });
    });

    it('should return zeros on error', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Error' },
        }),
      });

      const result = await MedicalFileStorage.getStorageStats('patient-1');

      expect(result).toEqual({
        totalSize: 0,
        fileCount: 0,
        typeBreakdown: {},
      });
    });
  });

  describe('compressImage', () => {
    it('should return file unchanged if not an image', async () => {
      const pdfFile = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const result = await MedicalFileStorage.compressImage(pdfFile);

      expect(result).toBe(pdfFile);
    });

    it('should return file unchanged if already small enough', async () => {
      const smallImage = new File(['small'], 'test.jpg', {
        type: 'image/jpeg',
      });

      const result = await MedicalFileStorage.compressImage(smallImage, 2);

      expect(result).toBe(smallImage);
    });

    // Note: Testing actual compression would require mocking browser-image-compression
    // which is dynamically imported. For now, we test the basic logic.
  });
});
