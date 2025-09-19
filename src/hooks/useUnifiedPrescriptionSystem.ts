import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { HorizontalTemplate } from '@/components/HorizontalPrescriptionTemplates';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface UnifiedPrescriptionLayout {
  id: string;
  doctor_id: string;
  name: string;
  description?: string;
  orientation: 'portrait' | 'landscape';
  page_size: 'A4' | 'Letter' | 'Legal';
  template_elements: any[];
  canvas_settings: {
    backgroundColor: string;
    canvasSize: { width: number; height: number };
    pageSize: string;
    margin: string;
    showGrid?: boolean;
    zoom?: number;
  };
  print_settings: {
    pageMargins: Record<string, string>;
    printQuality: string;
    colorMode: string;
    scaleFactor: number;
    autoFitContent: boolean;
    includeQrCode: boolean;
    includeDigitalSignature: boolean;
    watermarkText?: string;
  };
  is_horizontal: boolean;
  is_default: boolean;
  is_public: boolean;
  is_predefined: boolean;
  usage_count: number;
  last_used_at: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionData {
  patient_id: string;
  doctor_id?: string;
  consultation_id?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    indication?: string;
    route?: string;
  }>;
  diagnosis: string;
  notes?: string;
  expires_at?: string;
  status?: 'active' | 'completed' | 'cancelled';
  visual_layout?: any;
}

export interface PrescriptionHistoryEntry {
  id: string;
  patient_id: string;
  prescription_id: string;
  layout_id?: string;
  layout_snapshot: any;
  medications_snapshot: any[];
  visual_preview_url?: string;
  prescribed_at: string;
  expires_at?: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
}

export function useUnifiedPrescriptionSystem() {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState<UnifiedPrescriptionLayout[]>([]);
  const [prescriptionHistory, setPrescriptionHistory] = useState<PrescriptionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<UnifiedPrescriptionLayout | null>(null);

  // Load all available layouts (user's + public + predefined)
  const loadLayouts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescription_layouts_unified')
        .select('*')
        .or(`doctor_id.eq.${user.id},is_public.eq.true,is_predefined.eq.true`)
        .order('is_predefined', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setLayouts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load prescription history for a patient
  const loadPrescriptionHistory = useCallback(async (patientId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('patient_prescription_history')
        .select(`
          *,
          prescription:prescriptions(
            id, medications, diagnosis, notes, created_at, status
          )
        `)
        .eq('patient_id', patientId)
        .order('prescribed_at', { ascending: false });

      if (error) throw error;
      setPrescriptionHistory(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [user]);

  // Create prescription with automatic history saving
  const createPrescriptionWithHistory = useCallback(async (
    prescriptionData: PrescriptionData,
    layoutId?: string
  ): Promise<{ prescription: any; historyEntry: PrescriptionHistoryEntry }> => {
    if (!user) throw new Error('Usuario no autenticado');

    setLoading(true);
    try {
      // 1. Get layout if specified
      let layoutSnapshot = null;
      if (layoutId) {
        const layout = layouts.find(l => l.id === layoutId);
        if (layout) {
          layoutSnapshot = {
            template_elements: layout.template_elements,
            canvas_settings: layout.canvas_settings,
            print_settings: layout.print_settings
          };
          
          // Increment usage count
          await supabase.rpc('increment_layout_usage', { layout_id: layoutId });
        }
      }

      // 2. Calculate expiry date
      const maxDuration = Math.max(
        ...prescriptionData.medications.map(m => parseInt(m.duration) || 30),
        30
      );
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + maxDuration);

      // 3. Create prescription
      const prescriptionPayload = {
        ...prescriptionData,
        doctor_id: user.id,
        expires_at: expiresAt.toISOString(),
        status: prescriptionData.status || 'active',
        visual_layout: layoutSnapshot,
        created_at: new Date().toISOString()
      };

      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert([prescriptionPayload])
        .select('*')
        .single();

      if (prescriptionError) throw prescriptionError;

      // 4. Create history entry automatically
      const historyPayload = {
        patient_id: prescriptionData.patient_id,
        prescription_id: prescription.id,
        layout_id: layoutId || null,
        layout_snapshot: layoutSnapshot,
        medications_snapshot: prescriptionData.medications,
        prescribed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active'
      };

      const { data: historyEntry, error: historyError } = await supabase
        .from('patient_prescription_history')
        .insert([historyPayload])
        .select('*')
        .single();

      if (historyError) {
        // Log warning but don't fail the prescription creation
        console.warn('Failed to create prescription history entry:', historyError);
      }

      // 5. Link to consultation if provided
      if (prescriptionData.consultation_id) {
        await supabase
          .from('consultation_prescriptions')
          .insert([{
            consultation_id: prescriptionData.consultation_id,
            prescription_id: prescription.id
          }]);
      }

      return {
        prescription,
        historyEntry: historyEntry || historyPayload
      };
    } finally {
      setLoading(false);
    }
  }, [user, layouts]);

  // Save custom layout
  const saveCustomLayout = useCallback(async (
    layoutData: Omit<UnifiedPrescriptionLayout, 'id' | 'doctor_id' | 'usage_count' | 'last_used_at' | 'created_at' | 'updated_at' | 'is_horizontal'>
  ): Promise<UnifiedPrescriptionLayout> => {
    if (!user) throw new Error('Usuario no autenticado');

    const payload = {
      ...layoutData,
      doctor_id: user.id,
      usage_count: 0,
      last_used_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('prescription_layouts_unified')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;

    // Update local state
    setLayouts(prev => [data, ...prev]);
    return data;
  }, [user]);

  // Update layout
  const updateLayout = useCallback(async (
    layoutId: string,
    updates: Partial<UnifiedPrescriptionLayout>
  ): Promise<UnifiedPrescriptionLayout> => {
    const { data, error } = await supabase
      .from('prescription_layouts_unified')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', layoutId)
      .select('*')
      .single();

    if (error) throw error;

    // Update local state
    setLayouts(prev => prev.map(l => l.id === layoutId ? data : l));
    return data;
  }, []);

  // Delete layout
  const deleteLayout = useCallback(async (layoutId: string) => {
    const { error } = await supabase
      .from('prescription_layouts_unified')
      .delete()
      .eq('id', layoutId);

    if (error) throw error;

    // Update local state
    setLayouts(prev => prev.filter(l => l.id !== layoutId));
  }, []);

  // Get horizontal templates
  const getHorizontalTemplates = useCallback(() => {
    return layouts.filter(layout => layout.orientation === 'landscape');
  }, [layouts]);

  // Get vertical templates
  const getVerticalTemplates = useCallback(() => {
    return layouts.filter(layout => layout.orientation === 'portrait');
  }, [layouts]);

  // Get default layout for user
  const getDefaultLayout = useCallback(() => {
    return layouts.find(l => l.doctor_id === user?.id && l.is_default) || 
           layouts.find(l => l.is_predefined && l.orientation === 'landscape') ||
           layouts[0] || null;
  }, [layouts, user]);

  // Set default layout
  const setDefaultLayout = useCallback(async (layoutId: string) => {
    if (!user) return;

    // First, unset current default
    await supabase
      .from('prescription_layouts_unified')
      .update({ is_default: false })
      .eq('doctor_id', user.id)
      .eq('is_default', true);

    // Set new default
    await updateLayout(layoutId, { is_default: true });
  }, [user, updateLayout]);

  // Convert horizontal template to unified layout
  const convertHorizontalTemplate = useCallback((template: HorizontalTemplate): UnifiedPrescriptionLayout => {
    return {
      id: template.id,
      doctor_id: user?.id || '',
      name: template.name,
      description: template.description,
      orientation: template.orientation,
      page_size: template.pageSize,
      template_elements: template.templateElements,
      canvas_settings: template.canvasSettings,
      print_settings: template.printSettings,
      is_horizontal: true,
      is_default: false,
      is_public: false,
      is_predefined: true,
      usage_count: template.usageCount,
      last_used_at: new Date().toISOString(),
      category: template.category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }, [user]);

  // Generate preview image for layout
  const generateLayoutPreview = useCallback(async (
    layout: UnifiedPrescriptionLayout,
    prescriptionData: PrescriptionData
  ): Promise<string> => {
    try {
      // Create a canvas element for generating preview
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas size (scaled down for preview)
      const scale = 0.2;
      canvas.width = (layout.canvas_settings.canvasSize.width || 794) * scale;
      canvas.height = (layout.canvas_settings.canvasSize.height || 1123) * scale;

      // Fill background
      ctx.fillStyle = layout.canvas_settings.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw simplified elements
      layout.template_elements.forEach((element: any) => {
        const x = (element.position?.x || 0) * scale;
        const y = (element.position?.y || 0) * scale;
        const width = (element.size?.width || 50) * scale;
        const height = (element.size?.height || 20) * scale;

        ctx.fillStyle = element.backgroundColor || '#e5e7eb';
        ctx.fillRect(x, y, width, height);
        
        ctx.strokeStyle = element.borderColor || '#9ca3af';
        ctx.strokeRect(x, y, width, height);

        // Add element type label
        ctx.fillStyle = '#374151';
        ctx.font = `${8 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(element.type || 'element', x + width/2, y + height/2);
      });

      return canvas.toDataURL('image/png', 0.8);
    } catch (error) {
      console.error('Error generating preview:', error);
      
      // Fallback to SVG preview
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="150" fill="${layout.canvas_settings.backgroundColor || '#f9fafb'}" stroke="#e5e7eb"/>
          <text x="100" y="60" text-anchor="middle" fill="#6b7280" font-size="12" font-weight="bold">
            ${layout.name}
          </text>
          <text x="100" y="80" text-anchor="middle" fill="#9ca3af" font-size="10">
            ${layout.orientation} • ${layout.page_size}
          </text>
          <text x="100" y="100" text-anchor="middle" fill="#9ca3af" font-size="8">
            ${layout.template_elements.length} elementos
          </text>
          <text x="100" y="120" text-anchor="middle" fill="#9ca3af" font-size="8">
            ${layout.category}
          </text>
        </svg>
      `)}`;
    }
  }, []);

  // Auto-save draft functionality
  const saveDraft = useCallback((prescriptionData: Partial<PrescriptionData>) => {
    if (!user) return;
    
    const draftKey = `prescription_draft_${user.id}`;
    localStorage.setItem(draftKey, JSON.stringify({
      ...prescriptionData,
      lastSaved: new Date().toISOString()
    }));
  }, [user]);

  const loadDraft = useCallback((): Partial<PrescriptionData> | null => {
    if (!user) return null;
    
    const draftKey = `prescription_draft_${user.id}`;
    const draft = localStorage.getItem(draftKey);
    return draft ? JSON.parse(draft) : null;
  }, [user]);

  const clearDraft = useCallback(() => {
    if (!user) return;
    
    const draftKey = `prescription_draft_${user.id}`;
    localStorage.removeItem(draftKey);
  }, [user]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadLayouts();
    }
  }, [user, loadLayouts]);

  return {
    // State
    layouts,
    prescriptionHistory,
    loading,
    error,
    selectedLayout,
    
    // Layout management
    loadLayouts,
    saveCustomLayout,
    updateLayout,
    deleteLayout,
    setSelectedLayout,
    
    // Template utilities
    getHorizontalTemplates,
    getVerticalTemplates,
    getDefaultLayout,
    setDefaultLayout,
    convertHorizontalTemplate,
    
    // Prescription management
    createPrescriptionWithHistory,
    loadPrescriptionHistory,
    generateLayoutPreview,
    
    // Draft management
    saveDraft,
    loadDraft,
    clearDraft,
    
    // Utilities
    setError
  };
}

// Hook specifically for horizontal templates
export function useHorizontalPrescriptionLayouts() {
  const unified = useUnifiedPrescriptionSystem();
  
  const horizontalLayouts = unified.getHorizontalTemplates();
  
  const createFromHorizontalTemplate = useCallback(async (
    template: HorizontalTemplate,
    customizations?: Partial<UnifiedPrescriptionLayout>
  ) => {
    const baseLayout = unified.convertHorizontalTemplate(template);
    const layoutData = { ...baseLayout, ...customizations };
    
    // Remove computed fields before saving
    const { id, doctor_id, usage_count, last_used_at, created_at, updated_at, is_horizontal, ...saveData } = layoutData;
    
    return unified.saveCustomLayout(saveData);
  }, [unified]);

  return {
    ...unified,
    horizontalLayouts,
    createFromHorizontalTemplate
  };
}

// Hook for prescription history in patient records
export function usePrescriptionHistory(patientId: string) {
  const [history, setHistory] = useState<PrescriptionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!patientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_prescription_history')
        .select(`
          *,
          prescription:prescriptions(
            id, medications, diagnosis, notes, created_at, status, doctor_id
          ),
          layout:prescription_layouts_unified(
            id, name, orientation, page_size
          )
        `)
        .eq('patient_id', patientId)
        .order('prescribed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const reprintPrescription = useCallback(async (historyEntryId: string) => {
    const entry = history.find(h => h.id === historyEntryId);
    if (!entry) throw new Error('Entrada de historial no encontrada');

    // Get complete prescription data
    const { data: fullPrescription, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(full_name, birth_date),
        doctor:profiles(full_name, license_number),
        clinic:clinics(name, phone, email)
      `)
      .eq('id', entry.prescription_id)
      .single();

    if (error) throw error;

    // Use the original layout snapshot for accurate reprint
    const layoutSnapshot = entry.layout_snapshot;
    const prescriptionData = {
      patientName: fullPrescription.patient?.full_name || 'Paciente',
      doctorName: fullPrescription.doctor?.full_name || 'Dr. Médico',
      doctorLicense: fullPrescription.doctor?.license_number || '00000000',
      clinicName: fullPrescription.clinic?.name || 'Clínica',
      clinicPhone: fullPrescription.clinic?.phone || '',
      clinicEmail: fullPrescription.clinic?.email || '',
      diagnosis: fullPrescription.diagnosis || '',
      medications: entry.medications_snapshot,
      notes: fullPrescription.notes || '',
      date: format(new Date(entry.prescribed_at), 'dd/MM/yyyy', { locale: es }),
      time: format(new Date(entry.prescribed_at), 'HH:mm'),
      prescriptionId: fullPrescription.id,
      patientAge: fullPrescription.patient?.birth_date ? 
        `${new Date().getFullYear() - new Date(fullPrescription.patient.birth_date).getFullYear()} años` : ''
    };

    // Generate print window with original layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('No se pudo abrir ventana de impresión');

    const canvasSettings = layoutSnapshot?.canvas_settings || {
      backgroundColor: '#ffffff',
      canvasSize: { width: 794, height: 1123 }
    };

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receta - ${prescriptionData.patientName}</title>
          <style>
            @media print {
              @page { 
                size: A4 ${entry.layout?.orientation || 'portrait'}; 
                margin: 15mm; 
              }
              body { margin: 0; padding: 0; }
            }
            body { 
              font-family: Arial, sans-serif; 
              background: white; 
              margin: 0; 
              padding: 0; 
            }
            .prescription-canvas { 
              position: relative; 
              margin: 0 auto; 
              background: ${canvasSettings.backgroundColor};
              width: ${canvasSettings.canvasSize?.width || 794}px;
              height: ${canvasSettings.canvasSize?.height || 1123}px;
            }
            .print-element {
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="prescription-canvas" id="prescription-container">
            <!-- Layout elements will be rendered here -->
          </div>
          <script>
            window.print();
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    return { layoutSnapshot, prescriptionData };
  }, [history]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    loadHistory,
    reprintPrescription
  };
}

// Hook for layout versioning
export function useLayoutVersioning(layoutId: string) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!layoutId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescription_layout_versions')
        .select('*')
        .eq('layout_id', layoutId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (err) {
      console.error('Error loading layout versions:', err);
    } finally {
      setLoading(false);
    }
  }, [layoutId]);

  const createVersion = useCallback(async (
    changes: {
      template_elements: any[];
      canvas_settings: any;
      changes_summary: string;
    }
  ) => {
    if (!layoutId) throw new Error('Layout ID requerido');

    const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;

    const { data, error } = await supabase
      .from('prescription_layout_versions')
      .insert([{
        layout_id: layoutId,
        version_number: nextVersion,
        changes_summary: changes.changes_summary,
        template_elements: changes.template_elements,
        canvas_settings: changes.canvas_settings,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select('*')
      .single();

    if (error) throw error;
    
    setVersions(prev => [data, ...prev]);
    return data;
  }, [layoutId, versions]);

  const restoreVersion = useCallback(async (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) throw new Error('Versión no encontrada');

    // Update the main layout with version data
    const { error } = await supabase
      .from('prescription_layouts_unified')
      .update({
        template_elements: version.template_elements,
        canvas_settings: version.canvas_settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', layoutId);

    if (error) throw error;
  }, [layoutId, versions]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  return {
    versions,
    loading,
    loadVersions,
    createVersion,
    restoreVersion
  };
}
