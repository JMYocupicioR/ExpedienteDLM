import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PhysicalExamFormData {
  examDate: string;
  examTime: string;
  vitalSigns: {
    systolic_pressure: string;
    diastolic_pressure: string;
    heart_rate: string;
    respiratory_rate: string;
    temperature: string;
    oxygen_saturation: string;
    weight: string;
    height: string;
    bmi: string;
  };
  sections: Record<string, any>;
  generalObservations: string;
}

interface PhysicalExamTemplate {
  id: string;
  name: string;
  fields: any;
  template_type: string;
  is_active: boolean;
  version: number;
}

interface UsePhysicalExamOptions {
  patientId: string;
  doctorId: string;
  autoSaveInterval?: number;
}

interface UsePhysicalExamReturn {
  // Data
  templates: PhysicalExamTemplate[];
  currentDraft: PhysicalExamFormData | null;
  
  // Loading states
  loading: boolean;
  templatesLoading: boolean;
  savingDraft: boolean;
  
  // Error states
  error: string | null;
  
  // Functions
  loadTemplates: () => Promise<void>;
  saveDraft: (data: PhysicalExamFormData, templateId?: string) => Promise<void>;
  loadDraft: (templateId: string) => Promise<PhysicalExamFormData | null>;
  deleteDraft: (templateId: string) => Promise<void>;
  validateExamData: (data: PhysicalExamFormData) => { isValid: boolean; errors: string[] };
  generatePDF: (data: PhysicalExamFormData, patientData: any, doctorData: any) => Promise<Blob>;
  exportToJson: (data: PhysicalExamFormData) => string;
  importFromJson: (jsonString: string) => PhysicalExamFormData | null;
  
  // Template management
  createTemplate: (templateData: Partial<PhysicalExamTemplate>) => Promise<PhysicalExamTemplate>;
  updateTemplate: (id: string, templateData: Partial<PhysicalExamTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  
  // File management
  uploadFile: (file: File, sectionId: string, consultationId: string) => Promise<string>;
  deleteFile: (fileId: string) => Promise<void>;
  
  // Audit and history
  getExamHistory: (patientId: string) => Promise<any[]>;
  getChangeLog: (examId: string) => Promise<any[]>;
}

export function usePhysicalExam({ 
  patientId, 
  doctorId, 
  autoSaveInterval = 30000 
}: UsePhysicalExamOptions): UsePhysicalExamReturn {
  
  const [templates, setTemplates] = useState<PhysicalExamTemplate[]>([]);
  const [currentDraft, setCurrentDraft] = useState<PhysicalExamFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('physical_exam_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Error al cargar las plantillas');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // Save draft
  const saveDraft = useCallback(async (data: PhysicalExamFormData, templateId?: string) => {
    try {
      setSavingDraft(true);
      setError(null);

      const { data: savedDraft, error: saveError } = await supabase.rpc(
        'auto_save_physical_exam_draft',
        {
          p_patient_id: patientId,
          p_doctor_id: doctorId,
          p_template_id: templateId || null,
          p_draft_data: data
        }
      );

      if (saveError) throw saveError;
      
      setCurrentDraft(data);
      
      // Also save to localStorage as backup
      localStorage.setItem(
        `physical_exam_draft_${patientId}_${templateId || 'default'}`, 
        JSON.stringify(data)
      );
      
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Error al guardar el borrador');
    } finally {
      setSavingDraft(false);
    }
  }, [patientId, doctorId]);

  // Load draft
  const loadDraft = useCallback(async (templateId: string): Promise<PhysicalExamFormData | null> => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from database first
      const { data, error: loadError } = await supabase
        .from('physical_exam_drafts')
        .select('draft_data')
        .eq('patient_id', patientId)
        .eq('doctor_id', doctorId)
        .eq('template_id', templateId)
        .order('last_modified', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const draftData = data.draft_data as PhysicalExamFormData;
        setCurrentDraft(draftData);
        return draftData;
      }

      // Fallback to localStorage
      const localDraft = localStorage.getItem(`physical_exam_draft_${patientId}_${templateId}`);
      if (localDraft) {
        const draftData = JSON.parse(localDraft) as PhysicalExamFormData;
        setCurrentDraft(draftData);
        return draftData;
      }

      return null;
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Error al cargar el borrador');
      return null;
    } finally {
      setLoading(false);
    }
  }, [patientId, doctorId]);

  // Delete draft
  const deleteDraft = useCallback(async (templateId: string) => {
    try {
      await supabase
        .from('physical_exam_drafts')
        .delete()
        .eq('patient_id', patientId)
        .eq('doctor_id', doctorId)
        .eq('template_id', templateId);

      // Also remove from localStorage
      localStorage.removeItem(`physical_exam_draft_${patientId}_${templateId}`);
      
      if (currentDraft) {
        setCurrentDraft(null);
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
      setError('Error al eliminar el borrador');
    }
  }, [patientId, doctorId, currentDraft]);

  // Validate exam data
  const validateExamData = useCallback((data: PhysicalExamFormData) => {
    const errors: string[] = [];
    
    // Required fields validation
    if (!data.examDate) errors.push('Fecha del examen es requerida');
    if (!data.examTime) errors.push('Hora del examen es requerida');
    
    // Vital signs validation
    const vs = data.vitalSigns;
    if (!vs.systolic_pressure) errors.push('Presión sistólica es requerida');
    if (!vs.diastolic_pressure) errors.push('Presión diastólica es requerida');
    if (!vs.heart_rate) errors.push('Frecuencia cardíaca es requerida');
    if (!vs.respiratory_rate) errors.push('Frecuencia respiratoria es requerida');
    if (!vs.temperature) errors.push('Temperatura es requerida');
    
    // Validate vital signs ranges
    const systolic = parseInt(vs.systolic_pressure);
    const diastolic = parseInt(vs.diastolic_pressure);
    const heartRate = parseInt(vs.heart_rate);
    const temperature = parseFloat(vs.temperature);
    
    if (systolic && (systolic < 60 || systolic > 300)) {
      errors.push('Presión sistólica fuera del rango normal (60-300 mmHg)');
    }
    if (diastolic && (diastolic < 30 || diastolic > 200)) {
      errors.push('Presión diastólica fuera del rango normal (30-200 mmHg)');
    }
    if (heartRate && (heartRate < 30 || heartRate > 200)) {
      errors.push('Frecuencia cardíaca fuera del rango normal (30-200 lpm)');
    }
    if (temperature && (temperature < 30 || temperature > 45)) {
      errors.push('Temperatura fuera del rango normal (30-45 °C)');
    }
    
    // Validate at least one section has data
    const hasAnySection = Object.values(data.sections || {}).some(section => 
      section.observations || (section.selectedFindings && section.selectedFindings.length > 0)
    );
    
    if (!hasAnySection && !data.generalObservations) {
      errors.push('Debe completar al menos una sección del examen físico');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Generate PDF
  const generatePDF = useCallback(async (
    data: PhysicalExamFormData, 
    patientData: any, 
    doctorData: any
  ): Promise<Blob> => {
    try {
      // This would integrate with a PDF generation library like jsPDF or Puppeteer
      // For now, we'll create a simple HTML-to-PDF conversion
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Exploración Física</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .section { margin: 20px 0; page-break-inside: avoid; }
            .vital-signs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .vital-sign { text-align: center; border: 1px solid #ccc; padding: 10px; }
            .findings { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>REPORTE DE EXPLORACIÓN FÍSICA</h1>
            <p>Paciente: ${patientData.full_name} | Doctor: ${doctorData.full_name}</p>
            <p>Fecha: ${data.examDate} | Hora: ${data.examTime}</p>
          </div>
          
          <div class="section">
            <h2>Signos Vitales</h2>
            <div class="vital-signs">
              <div class="vital-sign">
                <strong>${data.vitalSigns.systolic_pressure}/${data.vitalSigns.diastolic_pressure}</strong>
                <br>Presión Arterial (mmHg)
              </div>
              <div class="vital-sign">
                <strong>${data.vitalSigns.heart_rate}</strong>
                <br>Frecuencia Cardíaca (lpm)
              </div>
              <div class="vital-sign">
                <strong>${data.vitalSigns.temperature}</strong>
                <br>Temperatura (°C)
              </div>
              <div class="vital-sign">
                <strong>${data.vitalSigns.respiratory_rate}</strong>
                <br>Frecuencia Respiratoria (rpm)
              </div>
            </div>
          </div>
          
          ${Object.entries(data.sections || {}).map(([sectionId, section]) => `
            <div class="section">
              <h3>${section.title}</h3>
              ${section.selectedFindings?.length > 0 ? `
                <div class="findings">
                  <strong>Hallazgos:</strong>
                  <ul>
                    ${section.selectedFindings.map((finding: string) => `<li>${finding}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              ${section.observations ? `
                <div class="findings">
                  <strong>Observaciones:</strong>
                  <p>${section.observations}</p>
                </div>
              ` : ''}
            </div>
          `).join('')}
          
          ${data.generalObservations ? `
            <div class="section">
              <h3>Observaciones Generales</h3>
              <p>${data.generalObservations}</p>
            </div>
          ` : ''}
        </body>
        </html>
      `;

      // Convert HTML to PDF using browser's print functionality
      // In a real implementation, you'd use a proper PDF library
      const blob = new Blob([htmlContent], { type: 'text/html' });
      return blob;
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      throw new Error('Error al generar el PDF');
    }
  }, []);

  // Export to JSON
  const exportToJson = useCallback((data: PhysicalExamFormData): string => {
    try {
      const exportData = {
        ...data,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        patientId,
        doctorId
      };
      return JSON.stringify(exportData, null, 2);
    } catch (err) {
      console.error('Error exporting to JSON:', err);
      throw new Error('Error al exportar los datos');
    }
  }, [patientId, doctorId]);

  // Import from JSON
  const importFromJson = useCallback((jsonString: string): PhysicalExamFormData | null => {
    try {
      const importedData = JSON.parse(jsonString);
      
      // Validate structure
      if (!importedData.examDate || !importedData.examTime || !importedData.vitalSigns) {
        throw new Error('Formato de datos inválido');
      }
      
      return importedData as PhysicalExamFormData;
    } catch (err) {
      console.error('Error importing from JSON:', err);
      setError('Error al importar los datos');
      return null;
    }
  }, []);

  // Create template
  const createTemplate = useCallback(async (templateData: Partial<PhysicalExamTemplate>) => {
    try {
      const { data, error: createError } = await supabase
        .from('physical_exam_templates')
        .insert({
          doctor_id: doctorId,
          ...templateData,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      if (createError) throw createError;
      
      await loadTemplates();
      return data;
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Error al crear la plantilla');
      throw err;
    }
  }, [doctorId, loadTemplates]);

  // Update template
  const updateTemplate = useCallback(async (id: string, templateData: Partial<PhysicalExamTemplate>) => {
    try {
      const { error: updateError } = await supabase
        .from('physical_exam_templates')
        .update(templateData)
        .eq('id', id);

      if (updateError) throw updateError;
      
      await loadTemplates();
    } catch (err) {
      console.error('Error updating template:', err);
      setError('Error al actualizar la plantilla');
      throw err;
    }
  }, [loadTemplates]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('physical_exam_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Error al eliminar la plantilla');
      throw err;
    }
  }, [loadTemplates]);

  // Upload file
  const uploadFile = useCallback(async (file: File, sectionId: string, consultationId: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `physical-exam-files/${consultationId}/${sectionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('medical-files')
        .getPublicUrl(filePath);

      // Save file record to database
      const { error: dbError } = await supabase
        .from('physical_exam_files')
        .insert({
          consultation_id: consultationId,
          section_id: sectionId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          uploaded_by: doctorId
        });

      if (dbError) throw dbError;

      return publicUrl;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Error al subir el archivo');
      throw err;
    }
  }, [doctorId]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('physical_exam_files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Error al eliminar el archivo');
      throw err;
    }
  }, []);

  // Get exam history
  const getExamHistory = useCallback(async (patientId: string) => {
    try {
      const { data, error: historyError } = await supabase
        .from('consultations')
        .select(`
          id,
          created_at,
          physical_examination,
          profiles!inner(full_name)
        `)
        .eq('patient_id', patientId)
        .not('physical_examination', 'is', null)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      
      return data || [];
    } catch (err) {
      console.error('Error getting exam history:', err);
      setError('Error al obtener el historial');
      return [];
    }
  }, []);

  // Get change log
  const getChangeLog = useCallback(async (examId: string) => {
    try {
      const { data, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', examId)
        .eq('entity_type', 'consultations')
        .order('timestamp', { ascending: false });

      if (logError) throw logError;
      
      return data || [];
    } catch (err) {
      console.error('Error getting change log:', err);
      setError('Error al obtener el registro de cambios');
      return [];
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!currentDraft) return;

    const autoSaveTimer = setTimeout(() => {
      saveDraft(currentDraft);
    }, autoSaveInterval);

    return () => clearTimeout(autoSaveTimer);
  }, [currentDraft, autoSaveInterval, saveDraft]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    // Data
    templates,
    currentDraft,
    
    // Loading states
    loading,
    templatesLoading,
    savingDraft,
    
    // Error states
    error,
    
    // Functions
    loadTemplates,
    saveDraft,
    loadDraft,
    deleteDraft,
    validateExamData,
    generatePDF,
    exportToJson,
    importFromJson,
    
    // Template management
    createTemplate,
    updateTemplate,
    deleteTemplate,
    
    // File management
    uploadFile,
    deleteFile,
    
    // Audit and history
    getExamHistory,
    getChangeLog
  };
} 