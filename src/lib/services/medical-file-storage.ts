import { supabase } from '@/lib/supabase';
import md5 from 'crypto-js/md5';

export interface FileMetadata {
  clinicId: string;
  patientId: string;
  studyId: string;
  uploadedBy?: string;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  type: string;
  hash: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'application/dicom': ['.dcm'],
  'text/plain': ['.txt']
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const STORAGE_BUCKET = 'patient-documents';

export class MedicalFileStorage {
  /**
   * Valida un archivo antes de subirlo
   */
  static validateFile(file: File): FileValidationResult {
    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // Validar tipo MIME
    const allowedExtensions = Object.values(ALLOWED_TYPES).flat();
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido. Tipos permitidos: ${allowedExtensions.join(', ')}`
      };
    }

    // Validar que el tipo MIME coincida con la extensión
    if (file.type && ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]) {
      const validExtensions = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];
      if (!validExtensions.includes(fileExtension)) {
        return {
          valid: false,
          error: 'El tipo de archivo no coincide con su extensión'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Sanitiza el nombre del archivo
   */
  static sanitizeFileName(fileName: string): string {
    // Remover caracteres especiales, mantener solo alfanuméricos, guiones y puntos
    const sanitized = fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales
      .replace(/_{2,}/g, '_') // Remover guiones bajos múltiples
      .toLowerCase();

    return sanitized;
  }

  /**
   * Calcula el hash MD5 del archivo
   */
  static async calculateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const wordArray = md5(arrayBuffer.toString());
        resolve(wordArray.toString());
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Verifica si ya existe un archivo con el mismo hash
   */
  static async checkDuplicate(hash: string, studyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('medical_test_files')
      .select('id')
      .eq('medical_test_id', studyId)
      .eq('file_hash', hash)
      .limit(1);

    if (error) return false;
    return (data?.length || 0) > 0;
  }

  /**
   * Sube un archivo al storage
   */
  static async upload(
    file: File,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    // Validar archivo
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calcular hash para detectar duplicados
    const hash = await this.calculateFileHash(file);

    // Verificar duplicados (opcional, puedes comentar si quieres permitirlos)
    // const isDuplicate = await this.checkDuplicate(hash, metadata.studyId);
    // if (isDuplicate) {
    //   throw new Error('Este archivo ya fue subido anteriormente');
    // }

    // Sanitizar nombre
    const sanitizedName = this.sanitizeFileName(file.name);

    // Generar path único
    const timestamp = Date.now();
    const path = `${metadata.clinicId}/${metadata.patientId}/${metadata.studyId}/${timestamp}-${sanitizedName}`;

    // Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Error al subir archivo: ${uploadError.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return {
      path,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      hash
    };
  }

  /**
   * Elimina un archivo del storage
   */
  static async delete(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  /**
   * Lista archivos de un estudio
   */
  static async listFiles(studyId: string) {
    const { data, error } = await supabase
      .from('medical_test_files')
      .select('*')
      .eq('medical_test_id', studyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error al listar archivos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtiene estadísticas de storage
   */
  static async getStorageStats(patientId: string) {
    const { data, error } = await supabase
      .from('medical_test_files')
      .select('file_size, file_type')
      .eq('medical_test_id', patientId);

    if (error) return { totalSize: 0, fileCount: 0, typeBreakdown: {} };

    const totalSize = data?.reduce((acc, f) => acc + (f.file_size || 0), 0) || 0;
    const fileCount = data?.length || 0;
    const typeBreakdown = data?.reduce((acc, f) => {
      const type = f.file_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return { totalSize, fileCount, typeBreakdown };
  }

  /**
   * Comprime una imagen si excede cierto tamaño
   */
  static async compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    if (file.size <= maxSizeMB * 1024 * 1024) return file;

    // Aquí podrías usar una librería como browser-image-compression
    // Por ahora, retornamos el archivo original
    // TODO: Implementar compresión real
    return file;
  }
}
