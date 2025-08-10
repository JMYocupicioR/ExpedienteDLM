import React, { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, FileText, Video as VideoIcon, X } from 'lucide-react';

export interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export default function UploadDropzone({ onFilesSelected, accept = 'application/pdf,image/*,video/*', multiple = true, className = '' }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setPendingFiles((prev) => [...prev, ...list]);
    onFilesSelected(list);
  }, [onFilesSelected]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-cyan-500 bg-cyan-900/20' : 'border-gray-600 bg-gray-800/50'
        }`}
      >
        <Upload className="h-6 w-6 text-gray-300 mx-auto" />
        <p className="mt-2 text-sm text-gray-300">Arrastra y suelta archivos aquí</p>
        <p className="text-xs text-gray-400">o</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
        >
          Seleccionar archivos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {pendingFiles.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {pendingFiles.map((f, idx) => {
              const isImage = f.type.startsWith('image/');
              const isVideo = f.type.startsWith('video/');
              const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
              return (
                <div key={`${f.name}-${idx}`} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    {isImage ? <ImageIcon className="h-4 w-4 text-gray-300" /> : isVideo ? <VideoIcon className="h-4 w-4 text-gray-300" /> : <FileText className="h-4 w-4 text-gray-300" />}
                    <span className="text-gray-200 truncate max-w-[14rem]">{f.name}</span>
                  </div>
                  <button type="button" className="text-gray-400 hover:text-white" onClick={() => removePending(idx)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


