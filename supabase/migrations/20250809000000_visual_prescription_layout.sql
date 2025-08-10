-- =============================================
-- MIGRACIÓN: Snapshot de layout visual por receta
-- Fecha: 2025-08-09
-- Descripción: Agrega el campo visual_layout a prescriptions para
--              guardar el acomodo/plantilla usada al emitir la receta
-- =============================================

-- Agregar columna JSONB para snapshot del layout visual
ALTER TABLE public.prescriptions
ADD COLUMN IF NOT EXISTS visual_layout JSONB;

COMMENT ON COLUMN public.prescriptions.visual_layout IS
'Snapshot del layout visual (elementos + configuración de canvas) usado al generar/imprimir la receta';


