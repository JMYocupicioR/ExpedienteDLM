-- ============================================================
-- Exercise Taxonomy System: multi-dimensional classification
-- ============================================================

-- 1. Taxonomy dimension types -----------------------------------
CREATE TABLE IF NOT EXISTS exercise_taxonomy_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,            -- lucide icon name for UI
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Taxonomy terms (hierarchical) ------------------------------
CREATE TABLE IF NOT EXISTS exercise_taxonomy_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES exercise_taxonomy_types(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES exercise_taxonomy_terms(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Link table (exercise <-> term) many-to-many ----------------
CREATE TABLE IF NOT EXISTS exercise_taxonomy_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES exercise_taxonomy_terms(id) ON DELETE CASCADE,
  UNIQUE (exercise_id, term_id)
);

-- Indexes -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tax_terms_type ON exercise_taxonomy_terms(type_id);
CREATE INDEX IF NOT EXISTS idx_tax_terms_parent ON exercise_taxonomy_terms(parent_id);
CREATE INDEX IF NOT EXISTS idx_tax_links_exercise ON exercise_taxonomy_links(exercise_id);
CREATE INDEX IF NOT EXISTS idx_tax_links_term ON exercise_taxonomy_links(term_id);

-- RLS -----------------------------------------------------------
ALTER TABLE exercise_taxonomy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_taxonomy_links ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
DROP POLICY IF EXISTS "taxonomy_types_select" ON exercise_taxonomy_types;
CREATE POLICY "taxonomy_types_select" ON exercise_taxonomy_types
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "taxonomy_terms_select" ON exercise_taxonomy_terms;
CREATE POLICY "taxonomy_terms_select" ON exercise_taxonomy_terms
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "taxonomy_links_select" ON exercise_taxonomy_links;
CREATE POLICY "taxonomy_links_select" ON exercise_taxonomy_links
  FOR SELECT USING (auth.role() = 'authenticated');

-- Doctors / admins can manage taxonomy links on their exercises
DROP POLICY IF EXISTS "taxonomy_links_manage" ON exercise_taxonomy_links;
CREATE POLICY "taxonomy_links_manage" ON exercise_taxonomy_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM exercise_library el
      WHERE el.id = exercise_id
        AND (el.doctor_id = auth.uid() OR el.doctor_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercise_library el
      WHERE el.id = exercise_id
        AND (el.doctor_id = auth.uid() OR el.doctor_id IS NULL)
    )
  );

-- Doctors / admins can manage taxonomy types and terms
DROP POLICY IF EXISTS "taxonomy_types_manage" ON exercise_taxonomy_types;
CREATE POLICY "taxonomy_types_manage" ON exercise_taxonomy_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin_staff','doctor'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin_staff','doctor'))
  );

DROP POLICY IF EXISTS "taxonomy_terms_manage" ON exercise_taxonomy_terms;
CREATE POLICY "taxonomy_terms_manage" ON exercise_taxonomy_terms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin_staff','doctor'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin_staff','doctor'))
  );

-- ============================================================
-- SEED: Taxonomy types
-- ============================================================
INSERT INTO exercise_taxonomy_types (code, label, description, icon, sort_order) VALUES
  ('anatomical_segment', 'Segmento Anatómico',   'Región del cuerpo objetivo del ejercicio',          'bone',          1),
  ('technique_method',   'Técnica / Método',      'Metodología o escuela terapéutica',                  'graduation-cap',2),
  ('pathology',          'Patología / Diagnóstico','Condición clínica para la cual está indicado',      'stethoscope',   3),
  ('target_muscle',      'Músculo Objetivo',      'Grupo muscular principal involucrado',                'dumbbell',      4),
  ('medical_specialty',  'Área Médica',           'Especialidad médica de rehabilitación',               'hospital',      5),
  ('exercise_type',      'Tipo de Ejercicio',     'Clasificación por objetivo funcional',                'target',        6),
  ('rehab_phase',        'Fase de Rehabilitación','Etapa del proceso de recuperación',                   'clock',         7),
  ('position',           'Posición del Paciente', 'Postura inicial requerida para el ejercicio',         'user',          8),
  ('equipment',          'Equipamiento',          'Material o equipo necesario',                         'wrench',        9)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: Taxonomy terms
-- ============================================================

-- Helper: get type id by code
-- We use a CTE approach for readability

-- ---- anatomical_segment ------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_columna_cervical',  'Columna Cervical / Cuello',     1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_columna_toracica',  'Columna Torácica',              2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_columna_lumbar',    'Columna Lumbar',                3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_hombro',            'Hombro',                        4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_codo',              'Codo',                          5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_muneca_mano',       'Muñeca / Mano',                 6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_cadera',            'Cadera',                        7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_rodilla',           'Rodilla',                       8),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_tobillo_pie',       'Tobillo / Pie',                 9),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_torax',             'Tórax / Pared Torácica',       10),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_pelvis',            'Pelvis / Piso Pélvico',        11),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_atm',               'ATM (Articulación Temporomandibular)', 12),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='anatomical_segment'), 'seg_cuerpo_completo',   'Cuerpo Completo',              13)
ON CONFLICT (code) DO NOTHING;

-- ---- technique_method --------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, description, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_williams',   'Williams',              'Ejercicios de flexión lumbar para lumbalgia',                   1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_mckenzie',   'McKenzie',              'Ejercicios de extensión para dolor discogénico',               2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_bobath',     'Bobath / NDT',          'Neurodesarrollo para pacientes neurológicos',                  3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_kabat_pnf',  'Kabat / PNF',           'Facilitación Neuromuscular Propioceptiva',                     4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_frenkel',    'Frenkel',               'Coordinación para ataxia cerebelosa',                          5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_codman',     'Codman',                'Ejercicios pendulares para hombro',                            6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_klapp',      'Klapp',                 'Gateo terapéutico para escoliosis',                            7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_pilates',    'Pilates Terapéutico',   'Estabilización central y control motor',                       8),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_vojta',      'Vojta',                 'Locomoción refleja para desarrollo neuromotor',                9),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_brunnstrom', 'Brunnström',            'Recuperación motora post-EVC por etapas sinérgicas',          10),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_rood',       'Rood',                  'Estimulación sensorial para facilitación motora',             11),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_mulligan',   'Mulligan',              'Movilización con movimiento (MWM)',                            12),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_maitland',   'Maitland',              'Movilización articular por grados',                            13),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_kegel',      'Kegel',                 'Fortalecimiento del piso pélvico',                             14),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_theraband',  'Theraband / Resistencia Elástica', 'Fortalecimiento progresivo con banda',          15),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='technique_method'), 'tech_cinesiterapia','Cinesiterapia Clásica','Movimiento terapéutico activo / pasivo / asistido',            16)
ON CONFLICT (code) DO NOTHING;

-- ---- pathology ---------------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_lumbalgia',          'Lumbalgia',                          1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_cervicalgia',        'Cervicalgia',                        2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_hernia_discal',      'Hernia Discal',                      3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_escoliosis',         'Escoliosis',                         4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_evc',                'EVC / Ictus',                        5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_paralisis_facial',   'Parálisis Facial',                   6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_tunel_carpiano',     'Síndrome del Túnel Carpiano',        7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_tendinitis',         'Tendinitis / Tendinopatía',          8),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_fractura',           'Fractura (Post-inmovilización)',      9),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_hombro_congelado',   'Hombro Congelado / Capsulitis',     10),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_gonartrosis',        'Gonartrosis / Artrosis de Rodilla', 11),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_coxartrosis',        'Coxartrosis / Artrosis de Cadera',  12),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_esguince',           'Esguince',                          13),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_fascitis_plantar',   'Fascitis Plantar',                  14),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_fibromialgia',       'Fibromialgia',                      15),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_parkinson',          'Enfermedad de Parkinson',           16),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_paralisis_cerebral', 'Parálisis Cerebral Infantil',       17),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_epoc',               'EPOC / Enfermedad Pulmonar',        18),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_lesion_medular',     'Lesión Medular',                    19),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_artritis_reumatoide','Artritis Reumatoide',              20),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_protesis_rodilla',   'Prótesis de Rodilla (Post-Qx)',     21),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_protesis_cadera',    'Prótesis de Cadera (Post-Qx)',      22),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='pathology'), 'pat_lca',                'Lesión de LCA (Post-Qx)',           23)
ON CONFLICT (code) DO NOTHING;

-- ---- target_muscle -----------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_cuadriceps',        'Cuádriceps',                1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_isquiotibiales',    'Isquiotibiales',            2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_gluteo_mayor',      'Glúteo Mayor',              3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_gluteo_medio',      'Glúteo Medio',              4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_aductores',         'Aductores',                 5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_gastrocnemio',      'Gastrocnemio / Pantorrilla', 6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_tibial_anterior',   'Tibial Anterior',           7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_core',              'Core / Abdominales',        8),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_erectores',         'Erectores de la Columna',   9),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_trapecio',          'Trapecio',                 10),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_deltoides',         'Deltoides',                11),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_manguito_rotador',  'Manguito Rotador',         12),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_biceps',            'Bíceps Braquial',          13),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_triceps',           'Tríceps Braquial',         14),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_flexores_antebrazo','Flexores del Antebrazo',   15),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_extensores_antebrazo','Extensores del Antebrazo',16),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_pectoral',          'Pectoral Mayor',           17),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_dorsal_ancho',      'Dorsal Ancho',             18),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_psoas_iliaco',      'Psoas Ilíaco',             19),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_peroneos',          'Peroneos',                 20),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_diafragma',         'Diafragma',                21),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_piso_pelvico',      'Piso Pélvico',             22),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_esternocleidomastoideo','Esternocleidomastoideo',23),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='target_muscle'), 'mus_romboides',         'Romboides',                24)
ON CONFLICT (code) DO NOTHING;

-- ---- medical_specialty -------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_ortopedia',     'Ortopedia / Traumatología',         1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_neurologia',    'Neurología / Neurorehabilitación',   2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_pediatria',     'Pediatría / Neurodesarrollo',        3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_geriatria',     'Geriatría',                          4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_deportiva',     'Medicina Deportiva',                  5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_reumatologia',  'Reumatología',                       6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_neumologia',    'Neumología / Rehabilitación Pulmonar',7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_cardiologia',   'Cardiología / Rehabilitación Cardíaca',8),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_uroginecologia','Uroginecología / Piso Pélvico',       9),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_oncologia',     'Oncología / Rehabilitación Oncológica',10),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='medical_specialty'), 'spec_quemados',      'Quemados / Rehabilitación de Quemaduras',11)
ON CONFLICT (code) DO NOTHING;

-- ---- exercise_type -----------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_estiramiento',    'Estiramiento / Flexibilidad',       1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_fortalecimiento', 'Fortalecimiento / Resistencia',     2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_propiocepcion',   'Propiocepción / Equilibrio',        3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_movilidad_rom',   'Movilidad / Rango de Movimiento',   4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_respiratorio',    'Respiratorio',                      5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_funcional',       'Funcional / AVD',                   6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_relajacion',      'Relajación / Control del Dolor',    7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_coordinacion',    'Coordinación / Control Motor',      8),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_marcha',          'Reeducación de la Marcha',          9),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_aerobico',        'Aeróbico / Cardiovascular',        10),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_isometrico',      'Isométrico',                       11),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='exercise_type'), 'type_neurodinamico',   'Neurodinámico / Deslizamiento Neural',12)
ON CONFLICT (code) DO NOTHING;

-- ---- rehab_phase -------------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, description, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='rehab_phase'), 'phase_aguda',         'Fase Aguda',          '0-2 semanas post-lesión / cirugía',     1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='rehab_phase'), 'phase_subaguda',      'Fase Subaguda',       '2-6 semanas, inicio de movilidad',      2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='rehab_phase'), 'phase_recuperacion',  'Fase de Recuperación','6-12 semanas, fortalecimiento activo',  3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='rehab_phase'), 'phase_mantenimiento', 'Mantenimiento / Prevención', 'Programa a largo plazo',          4)
ON CONFLICT (code) DO NOTHING;

-- ---- position ----------------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_bipedestacion',    'Bipedestación (De pie)',           1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_sedestacion',      'Sedestación (Sentado)',            2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_decubito_supino',  'Decúbito Supino (Boca arriba)',    3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_decubito_prono',   'Decúbito Prono (Boca abajo)',      4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_decubito_lateral', 'Decúbito Lateral (De lado)',       5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_cuadrupedia',      'Cuadrupedia (4 puntos)',           6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_arrodillado',      'Arrodillado / Semi-arrodillado',   7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='position'), 'pos_suspension',       'Suspensión / Colgado',             8)
ON CONFLICT (code) DO NOTHING;

-- ---- equipment ---------------------------------------------
INSERT INTO exercise_taxonomy_terms (type_id, code, label, sort_order) VALUES
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_sin_equipo',      'Sin Equipo (Peso corporal)',     1),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_banda_elastica',  'Banda Elástica / Theraband',     2),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_pelota_suiza',    'Pelota Suiza / Fitball',         3),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_pesas',           'Pesas / Mancuernas',             4),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_foam_roller',     'Foam Roller / Rodillo',          5),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_silla',           'Silla',                          6),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_baston',          'Bastón / Palo',                  7),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_bosu',            'BOSU / Disco de Equilibrio',     8),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_trx',             'TRX / Suspensión',               9),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_escalera_agilidad','Escalera de Agilidad',          10),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_colchoneta',      'Colchoneta / Mat',              11),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_polea',           'Polea / Cable',                 12),
  ((SELECT id FROM exercise_taxonomy_types WHERE code='equipment'), 'eq_pelota_mano',     'Pelota de Mano / Grip',         13)
ON CONFLICT (code) DO NOTHING;
