import { supabase } from '@/lib/supabase';

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
  style_definition?: PrescriptionTemplateData;
  // prescription_layouts columns
  template_elements?: any[];
  canvas_settings?: any;
  print_settings?: any;
  logo_url?: string | null;
  user_id?: string;
  doctor_id?: string;
}

function normalizeFromLayout(data: any): PrescriptionTemplateData | null {
  if (!data) return null;
  // prescription_layouts stores fields at the top level, not nested in style_definition
  const templateElements = data.template_elements || data.style_definition?.template_elements || [];
  const canvasSettings = data.canvas_settings || data.style_definition?.canvas_settings || {};
  const rawPrint = data.print_settings || data.style_definition?.print_settings || {};
  const printSettings: PrescriptionPrintSettings = {
    paperSize: (rawPrint.paperSize || rawPrint.page_size || 'a4').toLowerCase() as any,
    orientation: (rawPrint.orientation || rawPrint.page_orientation || 'portrait').toLowerCase() as any,
    margins: rawPrint.margins || rawPrint.pageMargins || 'normal'
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
  // Try to get the doctor's default layout from prescription_layouts
  try {
    const { data, error } = await supabase
      .from('prescription_layouts')
      .select('*')
      .eq('doctor_id', userId)
      .eq('is_default', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const normalized = normalizeFromLayout(data);
      if (normalized) return normalized;
    }
  } catch (_) {
    // Continue to fallback
  }

  // Fallback: get any predefined/public layout
  try {
    const { data } = await supabase
      .from('prescription_layouts')
      .select('*')
      .eq('is_predefined', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const normalized = normalizeFromLayout(data);
      if (normalized) return normalized;
    }
  } catch (_) {
    // Continue to default
  }

  // Return a default template if nothing found
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

  return defaultTemplate;
}

export async function saveTemplateForUser(userId: string, template: PrescriptionTemplateData): Promise<PrescriptionTemplateData> {
  const payload = denormalizeTemplate(template);

  const layoutPayload = {
    name: 'Mi plantilla personalizada',
    template_elements: payload.template_elements || [],
    canvas_settings: payload.canvas_settings || {},
    print_settings: payload.print_settings || {},
    is_default: true,
    updated_at: new Date().toISOString(),
    logo_url: template.logo_url ?? null
  };

  const layoutPayloadWithoutLogo = {
    name: layoutPayload.name,
    template_elements: layoutPayload.template_elements,
    canvas_settings: layoutPayload.canvas_settings,
    print_settings: layoutPayload.print_settings,
    is_default: layoutPayload.is_default,
    updated_at: layoutPayload.updated_at
  };

  const isMissingLogoColumnError = (error: unknown): boolean => {
    const msg = (error as { message?: string } | null)?.message?.toLowerCase() || '';
    return msg.includes('logo_url') && (msg.includes('column') || msg.includes('does not exist'));
  };

  // Find existing layout for this doctor (before unsetting)
  const { data: existing } = await supabase
    .from('prescription_layouts')
    .select('id')
    .eq('doctor_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Unset any existing defaults
  await supabase
    .from('prescription_layouts')
    .update({ is_default: false })
    .eq('doctor_id', userId);

  let data;
  if (existing?.id) {
    let updateResult = await supabase
      .from('prescription_layouts')
      .update(layoutPayload)
      .eq('id', existing.id)
      .select('*')
      .single();

    // Backward-compatible fallback while logo_url migration is pending in remote DB
    if (updateResult.error && isMissingLogoColumnError(updateResult.error)) {
      updateResult = await supabase
        .from('prescription_layouts')
        .update(layoutPayloadWithoutLogo)
        .eq('id', existing.id)
        .select('*')
        .single();
    }

    if (updateResult.error) throw updateResult.error;
    data = updateResult.data;
  } else {
    let insertResult = await supabase
      .from('prescription_layouts')
      .insert({
        doctor_id: userId,
        ...layoutPayload
      })
      .select('*')
      .single();

    // Backward-compatible fallback while logo_url migration is pending in remote DB
    if (insertResult.error && isMissingLogoColumnError(insertResult.error)) {
      insertResult = await supabase
        .from('prescription_layouts')
        .insert({
          doctor_id: userId,
          ...layoutPayloadWithoutLogo
        })
        .select('*')
        .single();
    }

    if (insertResult.error) throw insertResult.error;
    data = insertResult.data;
  }

  return normalizeFromLayout(data)!;
}

export async function getActiveTemplateSnapshotForUser(userId: string): Promise<PrescriptionTemplateData | null> {
  const tpl = await getOrCreateTemplateForUser(userId);
  return tpl;
}
