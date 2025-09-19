-- Add prescription visual layouts system for persistent design storage

-- Create table for prescription visual layouts
CREATE TABLE IF NOT EXISTS prescription_visual_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    description TEXT,
    template_elements JSON NOT NULL DEFAULT '[]'::JSON,
    canvas_settings JSON NOT NULL DEFAULT '{
        "backgroundColor": "#ffffff",
        "backgroundImage": null,
        "canvasSize": {"width": 794, "height": 1123},
        "pageSize": "A4",
        "margin": "20mm",
        "showGrid": false,
        "zoom": 1
    }'::JSON,
    category TEXT DEFAULT 'general',
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for prescription print settings per doctor
CREATE TABLE IF NOT EXISTS prescription_print_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    default_layout_id UUID REFERENCES prescription_visual_layouts(id) ON DELETE SET NULL,
    page_size TEXT DEFAULT 'A4',
    page_orientation TEXT DEFAULT 'portrait',
    page_margins JSON DEFAULT '{"top": "20mm", "right": "15mm", "bottom": "20mm", "left": "15mm"}'::JSON,
    print_quality TEXT DEFAULT 'high',
    color_mode TEXT DEFAULT 'color',
    scale_factor FLOAT DEFAULT 1.0,
    auto_fit_content BOOLEAN DEFAULT true,
    include_qr_code BOOLEAN DEFAULT true,
    include_digital_signature BOOLEAN DEFAULT true,
    watermark_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id)
);

-- Enable RLS
ALTER TABLE prescription_visual_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_print_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prescription_visual_layouts
CREATE POLICY "Users can view their own and public layouts" ON prescription_visual_layouts
    FOR SELECT USING (doctor_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can insert their own layouts" ON prescription_visual_layouts
    FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Users can update their own layouts" ON prescription_visual_layouts
    FOR UPDATE USING (doctor_id = auth.uid());

CREATE POLICY "Users can delete their own layouts" ON prescription_visual_layouts
    FOR DELETE USING (doctor_id = auth.uid());

-- RLS Policies for prescription_print_settings
CREATE POLICY "Users can view their own print settings" ON prescription_print_settings
    FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "Users can insert their own print settings" ON prescription_print_settings
    FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Users can update their own print settings" ON prescription_print_settings
    FOR UPDATE USING (doctor_id = auth.uid());

CREATE POLICY "Users can delete their own print settings" ON prescription_print_settings
    FOR DELETE USING (doctor_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prescription_visual_layouts_doctor_id ON prescription_visual_layouts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_visual_layouts_category ON prescription_visual_layouts(category);
CREATE INDEX IF NOT EXISTS idx_prescription_visual_layouts_usage_count ON prescription_visual_layouts(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_visual_layouts_is_default ON prescription_visual_layouts(doctor_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_prescription_print_settings_doctor_id ON prescription_print_settings(doctor_id);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_prescription_visual_layouts_updated_at
    BEFORE UPDATE ON prescription_visual_layouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescription_print_settings_updated_at
    BEFORE UPDATE ON prescription_print_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add function to increment usage count
CREATE OR REPLACE FUNCTION increment_layout_usage(layout_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE prescription_visual_layouts
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = layout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE prescription_visual_layouts IS 'Stores visual layout templates for prescription printing with element positioning and styling';
COMMENT ON COLUMN prescription_visual_layouts.template_elements IS 'JSON array of visual elements with position, size, style, and content data';
COMMENT ON COLUMN prescription_visual_layouts.canvas_settings IS 'JSON object with canvas configuration including size, background, and display settings';
COMMENT ON TABLE prescription_print_settings IS 'Per-doctor settings for prescription printing preferences and default layouts';
COMMENT ON COLUMN prescription_print_settings.page_margins IS 'JSON object with top, right, bottom, left margin specifications';

-- Insert default layout templates
INSERT INTO prescription_visual_layouts (
    doctor_id,
    template_name,
    description,
    template_elements,
    canvas_settings,
    category,
    is_public
) SELECT
    id as doctor_id,
    'Plantilla Clásica',
    'Diseño tradicional de receta médica con información esencial',
    '[
        {
            "id": "header-clinic",
            "type": "text",
            "position": {"x": 50, "y": 50},
            "size": {"width": 694, "height": 60},
            "content": "{{clinicName}}",
            "style": {
                "fontSize": 24,
                "fontFamily": "Arial",
                "color": "#1f2937",
                "fontWeight": "bold",
                "textAlign": "center"
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "doctor-info",
            "type": "text",
            "position": {"x": 50, "y": 120},
            "size": {"width": 400, "height": 40},
            "content": "Dr. {{doctorName}} - Cédula: {{doctorLicense}}",
            "style": {
                "fontSize": 14,
                "fontFamily": "Arial",
                "color": "#374151",
                "fontWeight": "normal",
                "textAlign": "left"
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "date-location",
            "type": "text",
            "position": {"x": 500, "y": 120},
            "size": {"width": 244, "height": 40},
            "content": "Fecha: {{date}}",
            "style": {
                "fontSize": 12,
                "fontFamily": "Arial",
                "color": "#6b7280",
                "fontWeight": "normal",
                "textAlign": "right"
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "patient-info",
            "type": "text",
            "position": {"x": 50, "y": 180},
            "size": {"width": 694, "height": 60},
            "content": "Paciente: {{patientName}}\nEdad: {{patientAge}} años - Peso: {{patientWeight}} kg",
            "style": {
                "fontSize": 14,
                "fontFamily": "Arial",
                "color": "#1f2937",
                "fontWeight": "normal",
                "textAlign": "left",
                "lineHeight": 1.5
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "diagnosis",
            "type": "text",
            "position": {"x": 50, "y": 260},
            "size": {"width": 694, "height": 40},
            "content": "Diagnóstico: {{diagnosis}}",
            "style": {
                "fontSize": 14,
                "fontFamily": "Arial",
                "color": "#1f2937",
                "fontWeight": "bold",
                "textAlign": "left"
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "medications-header",
            "type": "text",
            "position": {"x": 50, "y": 320},
            "size": {"width": 694, "height": 30},
            "content": "PRESCRIPCIÓN:",
            "style": {
                "fontSize": 16,
                "fontFamily": "Arial",
                "color": "#1f2937",
                "fontWeight": "bold",
                "textAlign": "left"
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "medications-list",
            "type": "text",
            "position": {"x": 50, "y": 360},
            "size": {"width": 694, "height": 300},
            "content": "{{medications}}",
            "style": {
                "fontSize": 12,
                "fontFamily": "Arial",
                "color": "#1f2937",
                "fontWeight": "normal",
                "textAlign": "left",
                "lineHeight": 1.8
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "notes",
            "type": "text",
            "position": {"x": 50, "y": 680},
            "size": {"width": 694, "height": 80},
            "content": "Notas: {{notes}}",
            "style": {
                "fontSize": 11,
                "fontFamily": "Arial",
                "color": "#6b7280",
                "fontWeight": "normal",
                "textAlign": "left",
                "lineHeight": 1.4
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        },
        {
            "id": "signature-area",
            "type": "text",
            "position": {"x": 450, "y": 800},
            "size": {"width": 294, "height": 60},
            "content": "________________________\nFirma del Médico",
            "style": {
                "fontSize": 12,
                "fontFamily": "Arial",
                "color": "#374151",
                "fontWeight": "normal",
                "textAlign": "center",
                "lineHeight": 1.5
            },
            "zIndex": 1,
            "isVisible": true,
            "isLocked": false
        }
    ]'::JSON,
    '{
        "backgroundColor": "#ffffff",
        "backgroundImage": null,
        "canvasSize": {"width": 794, "height": 1123},
        "pageSize": "A4",
        "margin": "20mm",
        "showGrid": false,
        "zoom": 1
    }'::JSON,
    'general',
    true
FROM profiles
WHERE role = 'doctor'
ON CONFLICT DO NOTHING;