import { supabase } from './supabase';

export interface PrescriptionPrintSettings {
  paperSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  margins: { top: string; right: string; bottom: string; left: string } | 'narrow' | 'normal' | 'wide';
}

export interface PrescriptionTemplateData {
  template_elements?: any[];
  canvas_settings?: {
    backgroundColor?: string;
    backgroundImage?: string | null;
    canvasSize?: { width: number; height: number };
    zoom?: number;
  };
  print_settings?: PrescriptionPrintSettings;
  // Backward-compat props for compatibility
  visualTemplate?: {
    elements?: any[];
    canvasSettings?: any;
  };
  paperSize?: string;
  orientation?: string;
  margins?: any;
  logo_url?: string | null;
}

export interface PrescriptionTemplateRow {
  style_definition: PrescriptionTemplateData;
  logo_url?: string | null;
  user_id?: string;
  doctor_id?: string;
}

function normalizeTemplate(data: PrescriptionTemplateRow | null): PrescriptionTemplateData | null {
  if (!data) return null;
  const def = (data.style_definition || {}) as PrescriptionTemplateData;
  // If visualTemplate present, lift to canonical fields
  const templateElements = def.template_elements || def.visualTemplate?.elements || [];
  const canvasSettings = def.canvas_settings || def.visualTemplate?.canvasSettings || {};
  const printSettings: PrescriptionPrintSettings = {
    paperSize: (def.print_settings?.paperSize || (def.paperSize?.toLowerCase?.() || 'a4')) as any,
    orientation: (def.print_settings?.orientation || (def.orientation?.toLowerCase?.() || 'portrait')) as any,
    margins: def.print_settings?.margins || def.margins || 'normal'
  };
  return {
    template_elements: templateElements,
    canvas_settings: canvasSettings,
    print_settings: printSettings,
    logo_url: data.logo_url || null
  };
}

function denormalizeTemplate(data: PrescriptionTemplateData): PrescriptionTemplateData {
  // Ensure canonical fields exist and also mirror to backward-compat fields
  const result: PrescriptionTemplateData = {
    ...data,
    visualTemplate: {
      elements: data.template_elements || [],
      canvasSettings: data.canvas_settings || {}
    },
    paperSize: (data.print_settings?.paperSize || 'a4') as string,
    orientation: (data.print_settings?.orientation || 'portrait') as string,
    margins: data.print_settings?.margins || 'normal'
  };
  return result;
}

export async function getOrCreateTemplateForUser(userId: string): Promise<PrescriptionTemplateData> {
  // Try user_id
  let row: PrescriptionTemplateRow | null = null;
  try {
    const { data, error } = await supabase
      .from('prescription_templates')
      .select('style_definition, logo_url, user_id, doctor_id')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    row = data as any;
  } catch (_) {
    // fallback doctor_id
    const { data, error } = await supabase
      .from('prescription_templates')
      .select('style_definition, logo_url, user_id, doctor_id')
      .eq('doctor_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    row = data as any;
  }

  const normalized = normalizeTemplate(row);
  if (normalized) return normalized;

  // Create default
  const defaultTemplate: PrescriptionTemplateData = {
    template_elements: [],
    canvas_settings: {
      backgroundColor: '#ffffff',
      backgroundImage: null,
      canvasSize: { width: 794, height: 1123 },
      zoom: 0.8
    },
    print_settings: {
      paperSize: 'a4',
      orientation: 'portrait',
      margins: 'normal'
    }
  };

  // Persist default (try user_id, fallback doctor_id)
  try {
    const payload = { user_id: userId, style_definition: denormalizeTemplate(defaultTemplate), updated_at: new Date().toISOString() };
    const { error: upErr } = await supabase
      .from('prescription_templates')
      .upsert(payload, { onConflict: 'user_id' });
    if (upErr) {
      await supabase
        .from('prescription_templates')
        .upsert({ doctor_id: userId, style_definition: denormalizeTemplate(defaultTemplate), updated_at: new Date().toISOString() }, { onConflict: 'doctor_id' });
    }
  } catch (_) {}

  return defaultTemplate;
}

export async function saveTemplateForUser(userId: string, template: PrescriptionTemplateData): Promise<PrescriptionTemplateData> {
  const payload = denormalizeTemplate(template);
  // Try user_id first
  try {
    const { data, error } = await supabase
      .from('prescription_templates')
      .upsert({ user_id: userId, style_definition: payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('style_definition, logo_url')
      .single();
    if (error) throw error;
    return normalizeTemplate(data as any)!;
  } catch (e) {
    const { data, error } = await supabase
      .from('prescription_templates')
      .upsert({ doctor_id: userId, style_definition: payload, updated_at: new Date().toISOString() }, { onConflict: 'doctor_id' })
      .select('style_definition, logo_url')
      .single();
    if (error) throw error;
    return normalizeTemplate(data as any)!;
  }
}

export async function getActiveTemplateSnapshotForUser(userId: string): Promise<PrescriptionTemplateData | null> {
  const tpl = await getOrCreateTemplateForUser(userId);
  return tpl;
}


