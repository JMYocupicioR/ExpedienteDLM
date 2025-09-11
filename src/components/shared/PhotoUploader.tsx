import React, { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';

interface PhotoUploaderProps {
  currentPhoto?: string | null;
  onUpload: (file: File) => Promise<{ url: string | null; error: string | null }>;
  onDelete?: () => Promise<{ success: boolean; error: string | null }>;
  type: 'profile' | 'prescription';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square' | 'rounded';
  disabled?: boolean;
  placeholder?: React.ReactNode;
}

export default function PhotoUploader({
  currentPhoto,
  onUpload,
  onDelete,
  type,
  className = '',
  size = 'md',
  shape = 'circle',
  disabled = false,
  placeholder
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dimensiones según el tamaño
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  // Formas
  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-lg'
  };

  const handleFileSelect = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      // Validar archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Solo se permiten archivos de imagen');
      }

      const result = await onUpload(file);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`${type === 'profile' ? 'Foto de perfil' : 'Icono'} actualizado correctamente`);
        setTimeout(() => setSuccess(null), 3000);
      }

    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setError(null);
      const result = await onDelete();
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Imagen eliminada correctamente');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la imagen');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Container principal */}
      <div
        className={`
          ${sizeClasses[size]} ${shapeClasses[shape]}
          relative overflow-hidden bg-gray-700 border-2 transition-all duration-200
          ${dragOver ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-500'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {/* Imagen actual */}
        {currentPhoto ? (
          <img 
            src={currentPhoto} 
            alt={type === 'profile' ? 'Foto de perfil' : 'Icono de receta'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {placeholder || (
              <Camera className={`text-gray-400 ${size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-8 w-8' : 'h-12 w-12'}`} />
            )}
          </div>
        )}

        {/* Overlay para drag & drop */}
        {dragOver && (
          <div className="absolute inset-0 bg-cyan-600/20 flex items-center justify-center">
            <Upload className="h-6 w-6 text-cyan-400" />
          </div>
        )}

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {/* Botón de upload cuando no está deshabilitado */}
        {!disabled && (
          <div className="absolute bottom-0 right-0 bg-cyan-600 rounded-full p-1 hover:bg-cyan-700 transition-colors">
            <Camera className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Botón de eliminar */}
      {currentPhoto && onDelete && !disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 hover:bg-red-700 transition-colors"
          title="Eliminar imagen"
        >
          <Trash2 className="h-3 w-3 text-white" />
        </button>
      )}

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-900/50 border border-red-700 text-red-300 p-2 rounded-lg text-xs flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {success && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-green-900/50 border border-green-700 text-green-300 p-2 rounded-lg text-xs flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Ayuda sobre tipos de archivo aceptados */}
      {!currentPhoto && (
        <div className="absolute top-full left-0 right-0 mt-1">
          <p className="text-xs text-gray-500 text-center">
            {type === 'profile' 
              ? 'JPG, PNG, WebP o GIF (máx 5MB)'
              : 'JPG, PNG, WebP o SVG (máx 2MB)'
            }
          </p>
        </div>
      )}
    </div>
  );
}
