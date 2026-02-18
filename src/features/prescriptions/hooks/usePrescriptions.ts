// =====================================================
// HOOK UNIFICADO DE PRESCRIPCIONES
// =====================================================
// Reemplaza usePrescriptionLayouts, useUnifiedPrescriptionSystem y useEnhancedPrescriptions.
// Una sola fuente de estado y operaciones para el módulo de recetas.

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import type { HorizontalTemplate } from '@/components/HorizontalPrescriptionTemplates';
import * as prescriptionService from '../services/prescriptionService';
import type {
  Prescription,
  PrescriptionLayout,
  PrescriptionLayoutSnapshot,
  MedicationTemplate,
  PrescriptionStats,
  CreatePrescriptionDTO,
  PrintSettings,
} from '../types';

// Layout "view" compatible con el editor visual (convertido desde HorizontalTemplate o desde DB)
export interface PrescriptionLayoutView {
  id: string;
  name: string;
  template_elements: PrescriptionLayout['template_elements'];
  canvas_settings: PrescriptionLayout['canvas_settings'];
  print_settings?: PrescriptionLayout['print_settings'];
  [key: string]: unknown;
}

export interface UsePrescriptionsOptions {
  /** Si true, carga recetas y layouts al montar. Por defecto true. */
  autoLoad?: boolean;
}

export function usePrescriptions(options: UsePrescriptionsOptions = {}) {
  const { autoLoad = true } = options;
  const { user } = useAuth();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [layouts, setLayouts] = useState<PrescriptionLayout[]>([]);
  const [medicationTemplates, setMedicationTemplates] = useState<MedicationTemplate[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
  const [stats, setStats] = useState<PrescriptionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<PrescriptionLayoutView | PrescriptionLayout | null>(null);

  const doctorId = user?.id ?? null;

  const refetchPrescriptions = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await prescriptionService.fetchPrescriptions(doctorId);
      setPrescriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar recetas');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  const refetchLayouts = useCallback(async () => {
    if (!doctorId) return;
    try {
      const data = await prescriptionService.fetchLayouts(doctorId);
      setLayouts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantillas');
    }
  }, [doctorId]);

  const refetchPrintSettings = useCallback(async () => {
    if (!doctorId) return;
    try {
      const data = await prescriptionService.fetchPrintSettings(doctorId);
      setPrintSettings(data);
    } catch {
      setPrintSettings(null);
    }
  }, [doctorId]);

  const refetchStats = useCallback(async () => {
    if (!doctorId) return;
    try {
      const data = await prescriptionService.getPrescriptionStats(doctorId);
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [doctorId]);

  const loadMedicationTemplates = useCallback(async () => {
    if (!doctorId) return;
    try {
      const data = await prescriptionService.fetchMedicationTemplates(doctorId);
      setMedicationTemplates(data);
    } catch {
      setMedicationTemplates([]);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!autoLoad || !doctorId) return;
    refetchPrescriptions();
    refetchLayouts();
    refetchPrintSettings();
    refetchStats();
  }, [doctorId, autoLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDefaultLayout = useCallback((): PrescriptionLayout | null => {
    return layouts.find((l) => l.is_default) ?? layouts[0] ?? null;
  }, [layouts]);

  const createPrescription = useCallback(
    async (dto: CreatePrescriptionDTO): Promise<Prescription> => {
      if (!user) throw new Error('Usuario no autenticado');
      setLoading(true);
      setError(null);
      try {
        const created = await prescriptionService.createPrescription(dto, user.id);
        setPrescriptions((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al crear receta';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const updatePrescription = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Prescription, 'medications' | 'diagnosis' | 'notes' | 'status'>>
    ): Promise<Prescription> => {
      if (!user) throw new Error('Usuario no autenticado');
      const updated = await prescriptionService.updatePrescription(id, updates, user.id);
      setPrescriptions((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [user]
  );

  const cancelPrescription = useCallback(
    async (id: string): Promise<void> => {
      if (!user) throw new Error('Usuario no autenticado');
      await prescriptionService.cancelPrescription(id, user.id);
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p))
      );
    },
    [user]
  );

  const saveLayout = useCallback(
    async (
      layout: Omit<
        PrescriptionLayout,
        'id' | 'usage_count' | 'last_used_at' | 'created_at' | 'updated_at'
      >,
      layoutId?: string
    ): Promise<PrescriptionLayout> => {
      if (!user) throw new Error('Usuario no autenticado');
      const layoutData = {
        ...layout,
        doctor_id: user.id,
      };
      const saved = await prescriptionService.saveLayout(layoutData, layoutId);
      await refetchLayouts();
      return saved;
    },
    [user, refetchLayouts]
  );

  const deleteLayout = useCallback(async (layoutId: string): Promise<void> => {
    await prescriptionService.deleteLayout(layoutId);
    await refetchLayouts();
  }, [refetchLayouts]);

  const setDefaultLayout = useCallback(
    async (layoutId: string): Promise<void> => {
      if (!doctorId) throw new Error('Usuario no autenticado');
      await prescriptionService.setDefaultLayout(layoutId, doctorId);
      await refetchLayouts();
    },
    [doctorId, refetchLayouts]
  );

  const savePrintSettings = useCallback(
    async (settings: Partial<PrintSettings>): Promise<void> => {
      if (!doctorId) throw new Error('Usuario no autenticado');
      await prescriptionService.savePrintSettings(doctorId, settings);
      await refetchPrintSettings();
    },
    [doctorId, refetchPrintSettings]
  );

  const fetchPrescriptionHistoryByPatient = useCallback(
    async (patientId: string): Promise<Prescription[]> => {
      return prescriptionService.fetchPrescriptionsByPatient(patientId);
    },
    []
  );

  const convertHorizontalTemplate = useCallback((template: HorizontalTemplate): PrescriptionLayoutView => {
    return {
      id: template.id,
      name: template.name,
      template_elements: template.templateElements,
      canvas_settings: template.canvasSettings as PrescriptionLayout['canvas_settings'],
      print_settings: template.printSettings as PrescriptionLayout['print_settings'],
    };
  }, []);

  return {
    prescriptions,
    layouts,
    medicationTemplates,
    printSettings,
    stats,
    loading,
    error,
    selectedLayout,
    setSelectedLayout,
    setError,

    refetchPrescriptions,
    refetchLayouts,
    refetchPrintSettings,
    refetchStats,
    loadMedicationTemplates,

    getDefaultLayout,
    getPrescriptionStats: refetchStats,

    createPrescription,
    updatePrescription,
    cancelPrescription,

    saveLayout,
    deleteLayout,
    setDefaultLayout,
    savePrintSettings,

    fetchPrescriptionHistoryByPatient,

    convertHorizontalTemplate,
  };
}
