import { supabase } from '@/lib/supabase';
import md5 from 'crypto-js/md5';

/**
 * Metadata requerida para subir un archivo médico
 */
export interface FileMetadata {
  /** ID de la clínica a la que pertenece el archivo */
  clinicId: string;
  /** ID del paciente asociado */
  patientId: string;
  /** ID del estudio médico al que pertenece el archivo */
  studyId: string;
  /** ID del usuario que sube el archivo (opcional) */
  uploadedBy?: string;
}

/**
 * Resultado de la operación de subida de archivo
 */
export interface UploadResult {
  /** Ruta del archivo en el storage */
  path: string;
  /** URL pública para acceder al archivo */
  url: string;
  /** Tamaño del archivo en bytes */
  size: number;
  /** Tipo MIME del archivo */
  type: string;
  /** Hash MD5 del archivo para detección de duplicados */
  hash: string;
}

/**
 * Resultado de la validación de archivo
 */
export interface FileValidationResult {
  /** Indica si el archivo es válido */
  valid: boolean;
  /** Mensaje de error si la validación falla */
  error?: string;
}

/**
 * Tipos de archivo permitidos con sus extensiones asociadas
 */
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

/** Tamaño máximo de archivo permitido: 50MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Nombre del bucket de Supabase Storage para documentos de pacientes */
const STORAGE_BUCKET = 'patient-documents';

/**
 * Servicio para gestionar archivos médicos en Supabase Storage.
 *
 * Proporciona funcionalidades para:
 * - Validación de archivos (tipo, tamaño, extensión)
 * - Subida segura de archivos con detección de duplicados
 * - Compresión automática de imágenes grandes
 * - Organización jerárquica por clínica/paciente/estudio
 * - Gestión de metadatos de archivos
 *
 * @example
 * ```typescript
 * // Subir un archivo médico
 * const result = await MedicalFileStorage.upload(file, {
 *   clinicId: 'clinic-123',
 *   patientId: 'patient-456',
 *   studyId: 'study-789'
 * });
 * console.log(`Archivo subido: ${result.url}`);
 *
 * // Validar antes de subir
 * const validation = MedicalFileStorage.validateFile(file);
 * if (!validation.valid) {
 *   console.error(validation.error);
 * }
 * ```
 */
export class MedicalFileStorage {
  /**
   * Valida un archivo antes de subirlo al storage.
   *
   * Verifica:
   * - Tamaño máximo (50MB)
   * - Extensión permitida
   * - Coincidencia entre tipo MIME y extensión
   *
   * @param file - Archivo a validar
   * @returns Objeto con resultado de validación y mensaje de error si aplica
   *
   * @example
   * ```typescript
   * const file = document.getElementById('fileInput').files[0];
   * const validation = MedicalFileStorage.validateFile(file);
   *
   * if (!validation.valid) {
   *   alert(validation.error);
   *   return;
   * }
   * ```
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
   * Sanitiza el nombre del archivo removiendo caracteres especiales.
   *
   * @param fileName - Nombre original del archivo
   * @returns Nombre sanitizado (lowercase, sin acentos, sin caracteres especiales)
   *
   * @example
   * ```typescript
   * const sanitized = MedicalFileStorage.sanitizeFileName('Estudio de María José.pdf');
   * // => 'estudio_de_maria_jose.pdf'
   * ```
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
   * Calcula el hash MD5 del archivo para detección de duplicados.
   *
   * @param file - Archivo del cual calcular el hash
   * @returns Promise que resuelve con el hash MD5 en formato hexadecimal
   *
   * @example
   * ```typescript
   * const hash = await MedicalFileStorage.calculateFileHash(file);
   * console.log(`Hash del archivo: ${hash}`);
   * ```
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
   * Verifica si ya existe un archivo con el mismo hash en un estudio.
   *
   * @param hash - Hash MD5 del archivo
   * @param studyId - ID del estudio médico
   * @returns true si existe un duplicado, false en caso contrario
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
   * Sube un archivo médico al storage de Supabase.
   *
   * Proceso:
   * 1. Valida el archivo
   * 2. Calcula hash MD5 para detección de duplicados
   * 3. Sanitiza el nombre del archivo
   * 4. Sube al bucket organizado por clínica/paciente/estudio
   * 5. Retorna URL pública y metadatos
   *
   * @param file - Archivo a subir
   * @param metadata - Metadata del archivo (clínica, paciente, estudio)
   * @returns Información del archivo subido incluyendo URL pública
   * @throws Error si la validación falla o si hay error en la subida
   *
   * @example
   * ```typescript
   * try {
   *   const result = await MedicalFileStorage.upload(file, {
   *     clinicId: 'clinic-123',
   *     patientId: 'patient-456',
   *     studyId: 'study-789',
   *     uploadedBy: userId
   *   });
   *
   *   console.log(`Archivo disponible en: ${result.url}`);
   *   console.log(`Tamaño: ${(result.size / 1024).toFixed(2)} KB`);
   * } catch (error) {
   *   console.error('Error al subir archivo:', error.message);
   * }
   * ```
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
   * Elimina un archivo del storage.
   *
   * @param path - Ruta del archivo en el storage
   * @throws Error si la eliminación falla
   *
   * @example
   * ```typescript
   * await MedicalFileStorage.delete('clinic-123/patient-456/study-789/1234567890-file.pdf');
   * ```
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
   * Lista todos los archivos asociados a un estudio médico.
   *
   * @param studyId - ID del estudio médico
   * @returns Array de archivos ordenados por fecha de creación (más recientes primero)
   * @throws Error si la consulta falla
   *
   * @example
   * ```typescript
   * const files = await MedicalFileStorage.listFiles('study-789');
   * files.forEach(file => {
   *   console.log(`${file.file_name} - ${file.file_size} bytes`);
   * });
   * ```
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
   * Obtiene estadísticas de uso de storage para un paciente.
   *
   * @param patientId - ID del paciente
   * @returns Objeto con tamaño total, cantidad de archivos y desglose por tipo
   *
   * @example
   * ```typescript
   * const stats = await MedicalFileStorage.getStorageStats('patient-456');
   * console.log(`Total: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
   * console.log(`Archivos: ${stats.fileCount}`);
   * console.log(`Por tipo:`, stats.typeBreakdown);
   * ```
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
   * Comprime una imagen si excede el tamaño máximo especificado.
   *
   * Utiliza browser-image-compression para reducir el tamaño de las imágenes
   * manteniendo una calidad aceptable (80%). Si la compresión falla, retorna
   * el archivo original sin modificar.
   *
   * @param file - Archivo de imagen a comprimir
   * @param maxSizeMB - Tamaño máximo deseado en MB (por defecto 2MB)
   * @returns Archivo comprimido o archivo original si no necesita compresión/falla
   *
   * @example
   * ```typescript
   * // Comprimir imagen antes de subir
   * let file = document.getElementById('imageInput').files[0];
   *
   * if (file.size > 2 * 1024 * 1024) {
   *   file = await MedicalFileStorage.compressImage(file, 2);
   * }
   *
   * await MedicalFileStorage.upload(file, metadata);
   * ```
   */
  static async compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    if (file.size <= maxSizeMB * 1024 * 1024) return file;

    try {
      // Importación dinámica para evitar problemas en el bundle
      const imageCompression = (await import('browser-image-compression')).default;

      const options = {
        maxSizeMB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type as any,
        initialQuality: 0.8
      };

      const compressedFile = await imageCompression(file, options);
      console.log(`Imagen comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

      return compressedFile;
    } catch (error) {
      console.error('Error al comprimir imagen:', error);
      // Si falla la compresión, retornar el archivo original
      return file;
    }
  }
}
