import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';

export interface LayoutElement {
  id: string;
  type: 'text' | 'logo' | 'background' | 'signature' | 'qr' | 'separator' | 'box' | 'date' | 'time' | 'table' | 'icon';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  style: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
  };
  zIndex: number;
  isVisible: boolean;
  isLocked: boolean;
  iconType?: string;
  borderColor?: string;
  backgroundColor?: string;
}

export interface CanvasSettings {
  backgroundColor: string;
  backgroundImage: string | null;
  canvasSize: { width: number; height: number };
  pageSize: string;
  margin: string;
  showGrid: boolean;
  zoom: number;
}

export interface PrescriptionLayout {
  id: string;
  doctor_id: string;
  template_name: string;
  description?: string;
  template_elements: LayoutElement[];
  canvas_settings: CanvasSettings;
  category: string;
  is_default: boolean;
  is_public: boolean;
  usage_count: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface PrintSettings {
  id?: string;
  doctor_id: string;
  default_layout_id?: string;
  page_size: string;
  page_orientation: 'portrait' | 'landscape';
  page_margins: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  print_quality: 'draft' | 'normal' | 'high';
  color_mode: 'color' | 'grayscale' | 'blackwhite';
  scale_factor: number;
  auto_fit_content: boolean;
  include_qr_code: boolean;
  include_digital_signature: boolean;
  watermark_text?: string;
}

export function usePrescriptionLayouts() {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState<PrescriptionLayout[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all layouts for the user
  const fetchLayouts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prescription_visual_layouts')
        .select('*')
        .or(`doctor_id.eq.${user.id},is_public.eq.true`)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setLayouts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching layouts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch print settings for the user
  const fetchPrintSettings = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('prescription_print_settings')
        .select('*')
        .eq('doctor_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setPrintSettings(data);
    } catch (err) {
      console.warn('Error fetching print settings:', err);
    }
  };

  // Save a new layout or update existing one
  const saveLayout = async (
    layout: Omit<PrescriptionLayout, 'id' | 'doctor_id' | 'usage_count' | 'created_at' | 'updated_at' | 'last_used_at'>,
    layoutId?: string
  ): Promise<PrescriptionLayout | null> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const layoutData = {
        ...layout,
        doctor_id: user.id,
        updated_at: new Date().toISOString()
      };

      let result;
      if (layoutId) {
        // Update existing layout
        const { data, error } = await supabase
          .from('prescription_visual_layouts')
          .update(layoutData)
          .eq('id', layoutId)
          .eq('doctor_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new layout
        const { data, error } = await supabase
          .from('prescription_visual_layouts')
          .insert(layoutData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      await fetchLayouts();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving layout');
      return null;
    }
  };

  // Delete a layout
  const deleteLayout = async (layoutId: string): Promise<boolean> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('prescription_visual_layouts')
        .delete()
        .eq('id', layoutId)
        .eq('doctor_id', user.id);

      if (error) throw error;
      await fetchLayouts();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting layout');
      return false;
    }
  };

  // Set a layout as default
  const setDefaultLayout = async (layoutId: string): Promise<boolean> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // First, remove default from all layouts
      await supabase
        .from('prescription_visual_layouts')
        .update({ is_default: false })
        .eq('doctor_id', user.id);

      // Then set the selected layout as default
      const { error } = await supabase
        .from('prescription_visual_layouts')
        .update({ is_default: true })
        .eq('id', layoutId)
        .eq('doctor_id', user.id);

      if (error) throw error;
      await fetchLayouts();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting default layout');
      return false;
    }
  };

  // Increment usage count for a layout
  const incrementUsage = async (layoutId: string) => {
    try {
      await supabase.rpc('increment_layout_usage', { layout_id: layoutId });
    } catch (err) {
      console.warn('Error incrementing usage:', err);
    }
  };

  // Save print settings
  const savePrintSettings = async (settings: Partial<PrintSettings>): Promise<boolean> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const settingsData = {
        ...settings,
        doctor_id: user.id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('prescription_print_settings')
        .upsert(settingsData, { onConflict: 'doctor_id' });

      if (error) throw error;
      await fetchPrintSettings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving print settings');
      return false;
    }
  };

  // Get default layout
  const getDefaultLayout = (): PrescriptionLayout | null => {
    return layouts.find(layout => layout.is_default) || layouts[0] || null;
  };

  // Get layouts by category
  const getLayoutsByCategory = (category: string): PrescriptionLayout[] => {
    return layouts.filter(layout => layout.category === category);
  };

  // Get public layouts (templates)
  const getPublicLayouts = (): PrescriptionLayout[] => {
    return layouts.filter(layout => layout.is_public);
  };

  // Get user's custom layouts
  const getCustomLayouts = (): PrescriptionLayout[] => {
    return layouts.filter(layout => layout.doctor_id === user?.id && !layout.is_public);
  };

  useEffect(() => {
    if (user?.id) {
      fetchLayouts();
      fetchPrintSettings();
    }
  }, [user?.id]);

  return {
    layouts,
    printSettings,
    loading,
    error,
    saveLayout,
    deleteLayout,
    setDefaultLayout,
    incrementUsage,
    savePrintSettings,
    getDefaultLayout,
    getLayoutsByCategory,
    getPublicLayouts,
    getCustomLayouts,
    fetchLayouts,
    fetchPrintSettings
  };
}