import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Plus, Upload, FileText, Trash2, Image as ImageIcon, Video as VideoIcon, Loader2, FlaskConical, Microscope, X, ExternalLink } from 'lucide-react';
import UploadDropzone from '@/components/UploadDropzone';
import type { Database } from '@/lib/database.types';

type MedicalTest = Database['public']['Tables']['medical_tests']['Row'];
type MedicalTestInsert = Database['public']['Tables']['medical_tests']['Insert'];
type MedicalTestFile = Database['public']['Tables']['medical_test_files']['Row'];

interface StudiesSectionProps {
  patientId: string;
  doctorId?: string | null;
}

const CATEGORIES = [
  { id: 'gabinete', label: 'Gabinete', icon: FlaskConical },
  { id: 'laboratorio', label: 'Laboratorios', icon: Microscope },
  { id: 'otro', label: 'Otros', icon: FileText },
] as const;

export default function StudiesSection({ patientId, doctorId }: StudiesSectionProps) {
  const { profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]['id']>('gabinete');
  const [studies, setStudies] = useState<MedicalTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ordered' | 'in_progress' | 'completed'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [newStudy, setNewStudy] = useState<Partial<MedicalTestInsert>>({
    category: 'gabinete',
    test_name: '',
    status: 'ordered',
    ordered_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fetchStudies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medical_tests')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (!error) setStudies(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStudies(); }, [patientId]);

  const filteredStudies = useMemo(() => {
    return studies.filter(s => {
      if (s.category !== activeCategory) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (dateFrom && (!s.ordered_date || s.ordered_date < dateFrom)) return false;
      if (dateTo && (!s.ordered_date || s.ordered_date > dateTo)) return false;
      return true;
    });
  }, [studies, activeCategory, statusFilter, dateFrom, dateTo]);

  const handleAddStudy = async () => {
    if (!newStudy.test_name || !newStudy.category) return;
    setAdding(true);
    const payload: MedicalTestInsert = {
      patient_id: patientId,
      doctor_id: doctorId || null,
      category: newStudy.category as any,
      test_name: newStudy.test_name!,
      status: (newStudy.status as any) || 'ordered',
      ordered_date: newStudy.ordered_date || new Date().toISOString().slice(0, 10),
      result_date: newStudy.result_date || null,
      lab_name: newStudy.lab_name || null,
      notes: newStudy.notes || null,
    };
    const { data, error } = await supabase.from('medical_tests').insert(payload).select('id, patient_id, doctor_id, category, test_name, status, ordered_date, result_date, lab_name, notes, created_at, updated_at').single();
    if (!error && data) {
      // Subir archivos iniciales si se seleccionaron
      if (newFiles.length > 0) {
        for (const f of newFiles) {
          await handleUploadFile(data as unknown as MedicalTest, f);
        }
      }
      setNewStudy({ category: activeCategory, test_name: '', status: 'ordered', ordered_date: new Date().toISOString().slice(0, 10), notes: '' });
      setNewFiles([]);
      await fetchStudies();
    }
    setAdding(false);
  };

  const handleUploadFile = async (study: MedicalTest, file: File) => {
    try {
      setUploadingId(study.id);
      const clinicId = (profile as any)?.clinic_id as string | undefined;
      if (!clinicId) throw new Error('No hay clínica asociada en el perfil.');
      const path = `${clinicId}/${patientId}/${study.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('patient-documents').getPublicUrl(path);
      const { data: userData } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from('medical_test_files').insert({
        medical_test_id: study.id,
        file_name: file.name,
        file_path: path,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userData?.user?.id || doctorId || null,
      });
      if (insertError) throw insertError;
      fetchStudies();
    } catch (e) {
      console.error('Upload error', e);
    } finally {
      setUploadingId(null);
    }
  };

  const handlePrint = (rows: MedicalTest[], category: string) => {
    const html = `
      <html>
        <head>
          <title>Estudios - ${category}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; }
            h2 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f5f5f5; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Estudios (${category})</h2>
          <table>
            <thead>
              <tr>
                <th>Estudio</th>
                <th>Estado</th>
                <th>Solicitado</th>
                <th>Resultado</th>
                <th>Lab/Gabinete</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${r.test_name || ''}</td>
                  <td>${r.status}</td>
                  <td>${r.ordered_date || ''}</td>
                  <td>${r.result_date || ''}</td>
                  <td>${r.lab_name || ''}</td>
                  <td>${(r.notes || '').toString().slice(0,200)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 100); };</script>
        </body>
      </html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleExportCsv = (rows: MedicalTest[]) => {
    const headers = ['Estudio','Estado','Solicitado','Resultado','Categoria','LabGabinete','Notas'];
    const lines = rows.map(r => [
      safeCsv(r.test_name), safeCsv(r.status), safeCsv(r.ordered_date), safeCsv(r.result_date), safeCsv(r.category), safeCsv(r.lab_name), safeCsv(r.notes)
    ].join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estudios_${activeCategory}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const safeCsv = (v: unknown) => {
    const s = (v ?? '').toString().replace(/"/g, '""');
    return `"${s}"`;
  };

  const handleDeleteStudy = async (id: string) => {
    const { error } = await supabase.from('medical_tests').delete().eq('id', id);
    if (!error) fetchStudies();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`px-3 py-1.5 rounded border text-sm ${activeCategory === cat.id ? 'bg-cyan-700 border-cyan-600 text-white' : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-650'}`}
              onClick={() => { setActiveCategory(cat.id); setNewStudy(s => ({ ...s, category: cat.id })); }}
            >
              <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" /> {cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filtros y acciones */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Estado</label>
              <select
                className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">Todos</option>
                <option value="ordered">Solicitado</option>
                <option value="in_progress">En proceso</option>
                <option value="completed">Completado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Desde (solicitud)</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Hasta (solicitud)</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm w-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePrint(filteredStudies, activeCategory)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">Imprimir</button>
            <button onClick={() => handleExportCsv(filteredStudies)} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm">Exportar CSV</button>
          </div>
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <h3 className="text-white font-medium mb-3">Agregar estudio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="Nombre del estudio (ej. RX de Tórax, Química sanguínea)"
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            value={newStudy.test_name || ''}
            onChange={(e) => setNewStudy(s => ({ ...s, test_name: e.target.value }))}
          />
          <input
            type="date"
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            value={newStudy.ordered_date || ''}
            onChange={(e) => setNewStudy(s => ({ ...s, ordered_date: e.target.value }))}
          />
          <select
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            value={(newStudy.status as string) || 'ordered'}
            onChange={(e) => setNewStudy(s => ({ ...s, status: e.target.value as any }))}
          >
            <option value="ordered">Solicitado</option>
            <option value="in_progress">En proceso</option>
            <option value="completed">Completado</option>
          </select>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Laboratorio / Gabinete (opcional)"
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            value={newStudy.lab_name || ''}
            onChange={(e) => setNewStudy(s => ({ ...s, lab_name: e.target.value }))}
          />
          <input
            placeholder="Notas (opcional)"
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            value={newStudy.notes || ''}
            onChange={(e) => setNewStudy(s => ({ ...s, notes: e.target.value }))}
          />
        </div>
        <div className="mt-3">
          <UploadDropzone
            onFilesSelected={(files) => setNewFiles((prev) => [...prev, ...files])}
          />
        </div>
        <div className="mt-3">
          <button onClick={handleAddStudy} className="px-3 py-2 bg-blue-600 text-white rounded text-sm inline-flex items-center" disabled={adding || !newStudy.test_name}>
            {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Agregar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-gray-400 text-sm">Cargando estudios...</div>
        ) : filteredStudies.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay estudios en esta categoría.</div>
        ) : (
          filteredStudies.map(study => (
            <div key={study.id} className="rounded-lg p-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">{study.test_name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Solicitado: {study.ordered_date || '-'} {study.result_date ? ` • Resultado: ${study.result_date}` : ''} • Estado: {study.status}
                  </p>
                  {study.lab_name && <p className="text-xs text-gray-400">{study.lab_name}</p>}
                  {study.notes && <p className="text-xs text-gray-400">{study.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm inline-flex items-center cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" /> Subir archivo
                    <input type="file" accept="application/pdf,image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(study, f); }} />
                  </label>
                  <button onClick={() => handleDeleteStudy(study.id)} className="px-2 py-1 text-red-400 hover:text-red-300" title="Eliminar estudio">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <StudyFiles studyId={study.id} uploading={uploadingId === study.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StudyFiles({ studyId, uploading }: { studyId: string; uploading: boolean }) {
  const [files, setFiles] = useState<MedicalTestFile[]>([]);
  const [preview, setPreview] = useState<MedicalTestFile | null>(null);

  const fetchFiles = async () => {
    const { data } = await supabase
      .from('medical_test_files')
      .select('*')
      .eq('medical_test_id', studyId)
      .order('created_at', { ascending: false });
    setFiles(data || []);
  };

  useEffect(() => { fetchFiles(); }, [studyId, uploading]);

  const handleDeleteFile = async (f: MedicalTestFile) => {
    try {
      if (f.file_path) {
        await supabase.storage.from('medical-files').remove([f.file_path]);
      }
      await supabase.from('medical_test_files').delete().eq('id', f.id);
      fetchFiles();
    } catch (e) {
      console.error('Delete file error', e);
    }
  };

  return (
    <div className="mt-3">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {uploading && <div className="text-xs text-cyan-300">Subiendo archivo...</div>}
      {files.map(f => {
        const isImage = (f.file_type || '').startsWith('image/');
        const isVideo = (f.file_type || '').startsWith('video/');
        const isPdf = (f.file_type || '') === 'application/pdf' || f.file_name.toLowerCase().endsWith('.pdf');
        return (
          <div key={f.id} className="flex items-center justify-between p-2 bg-gray-700 rounded border border-gray-600">
            <button onClick={() => setPreview(f)} className="flex items-center gap-2 text-left flex-1 hover:underline">
              {isImage ? (
                <img src={f.file_url} alt={f.file_name} className="h-8 w-8 object-cover rounded" loading="lazy" />
              ) : isVideo ? (
                <VideoIcon className="h-4 w-4 text-gray-300" />
              ) : isPdf ? (
                <FileText className="h-4 w-4 text-gray-300" />
              ) : (
                <FileText className="h-4 w-4 text-gray-300" />
              )}
              <span className="text-xs text-gray-200 truncate">{f.file_name}</span>
            </button>
            <div className="flex items-center gap-2 ml-2">
              <a href={f.file_url} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white" title="Abrir">
                <ExternalLink className="h-4 w-4" />
              </a>
              <button onClick={() => handleDeleteFile(f)} className="text-red-400 hover:text-red-300" title="Eliminar">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
      {files.length === 0 && !uploading && (
        <div className="text-xs text-gray-400">Sin archivos adjuntos</div>
      )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-800">
              <h4 className="text-white text-sm truncate mr-2">{preview.file_name}</h4>
              <button className="text-gray-400 hover:text-white" onClick={() => setPreview(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              { (preview.file_type || '').startsWith('image/') ? (
                <img src={preview.file_url} alt={preview.file_name} className="max-h-[70vh] w-full object-contain" />
              ) : (preview.file_type || '').startsWith('video/') ? (
                <video src={preview.file_url} controls className="w-full max-h-[70vh]" />
              ) : (
                <iframe src={preview.file_url} className="w-full h-[70vh] bg-white" title={preview.file_name} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


