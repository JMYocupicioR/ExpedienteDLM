-- ============================================================
-- Seed: Global exercise library with taxonomy classifications
-- All exercises: is_global=true, doctor_id=NULL
-- ============================================================

-- ---- WILLIAMS EXERCISES (Lumbar Flexion) --------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Williams 1 - Inclinación Pélvica',
 'Acostado boca arriba con rodillas flexionadas, contraiga el abdomen empujando la zona lumbar contra el piso. Mantenga 5 segundos.',
 'Williams', 'Columna Lumbar', 'easy', 300, 10, 3, true,
 '["Acuéstese boca arriba con rodillas dobladas y pies apoyados en el piso","Contraiga los músculos del abdomen llevando el ombligo hacia la columna","Presione la zona lumbar contra el piso","Mantenga 5 segundos","Relaje y repita"]'::jsonb),

('Williams 2 - Rodillas al Pecho',
 'Acostado boca arriba, lleve ambas rodillas al pecho abrazándolas con las manos. Mantenga 10 segundos.',
 'Williams', 'Columna Lumbar', 'easy', 300, 10, 3, true,
 '["Acuéstese boca arriba con rodillas flexionadas","Lleve una rodilla al pecho y sostenga con ambas manos","Luego lleve ambas rodillas al pecho","Mantenga 10 segundos sintiendo el estiramiento lumbar","Regrese lentamente a la posición inicial"]'::jsonb),

('Williams 3 - Curl Parcial (Abdominal)',
 'Acostado boca arriba con rodillas flexionadas, eleve cabeza y hombros del piso contrayendo el abdomen. No lleve las manos detrás de la nuca.',
 'Williams', 'Columna Lumbar', 'easy', 300, 15, 3, true,
 '["Acuéstese boca arriba con rodillas flexionadas","Cruce los brazos sobre el pecho","Contraiga el abdomen y eleve cabeza y hombros del suelo","Mantenga 3 segundos arriba","Baje lentamente y repita"]'::jsonb),

('Williams 4 - Estiramiento de Isquiotibiales',
 'Acostado boca arriba, eleve una pierna extendida con ayuda de una toalla o banda. Mantenga 20 segundos.',
 'Williams', 'Columna Lumbar', 'easy', 300, 5, 3, true,
 '["Acuéstese boca arriba con una pierna extendida","Coloque una toalla en la planta del pie","Eleve la pierna manteniéndola lo más recta posible","Sienta el estiramiento en la parte posterior del muslo","Mantenga 20 segundos y cambie de pierna"]'::jsonb),

('Williams 5 - Estiramiento de Flexores de Cadera',
 'En posición de caballero (una rodilla en el piso), empuje la cadera hacia adelante estirando la parte frontal del muslo.',
 'Williams', 'Columna Lumbar', 'medium', 300, 5, 3, true,
 '["Arrodíllese sobre una rodilla con la otra pierna al frente en 90°","Mantenga el tronco erguido","Empuje suavemente la cadera hacia adelante","Sienta el estiramiento en la parte frontal de la cadera y muslo","Mantenga 20 segundos y cambie de lado"]'::jsonb),

('Williams 6 - Sentadilla en Pared',
 'Con la espalda apoyada en la pared, descienda hasta que las rodillas formen 90°. Mantenga la posición.',
 'Williams', 'Columna Lumbar', 'medium', 300, 5, 3, true,
 '["Apóyese con la espalda contra una pared lisa","Separe los pies al ancho de los hombros","Deslícese hacia abajo hasta que las rodillas formen 90°","Mantenga 10-30 segundos","Suba lentamente y repita"]'::jsonb);

-- ---- MCKENZIE EXERCISES (Extension) ------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('McKenzie 1 - Extensión en Prono (Passive)',
 'Acostado boca abajo, relaje todo el cuerpo y deje que la columna se extienda naturalmente por gravedad.',
 'McKenzie', 'Columna Lumbar', 'easy', 600, 1, 1, true,
 '["Acuéstese boca abajo con los brazos a los lados","Gire la cabeza hacia un lado","Relaje completamente todos los músculos","Respire normalmente","Mantenga esta posición 5-10 minutos"]'::jsonb),

('McKenzie 2 - Extensión con Apoyo de Manos (Press-up)',
 'Boca abajo, coloque las manos a la altura de los hombros y empuje el tronco hacia arriba manteniendo la pelvis en el piso.',
 'McKenzie', 'Columna Lumbar', 'easy', 300, 10, 3, true,
 '["Acuéstese boca abajo con las manos a la altura de los hombros","Empuje el tronco hacia arriba estirando los brazos","Mantenga la pelvis y caderas pegadas al piso","Mantenga 2 segundos en la posición más alta","Baje lentamente y repita"]'::jsonb),

('McKenzie 3 - Extensión de Pie',
 'De pie, coloque las manos en la zona lumbar y extienda la columna hacia atrás.',
 'McKenzie', 'Columna Lumbar', 'easy', 120, 10, 3, true,
 '["Póngase de pie con los pies separados al ancho de los hombros","Coloque ambas manos en la zona lumbar baja","Inclínese hacia atrás lo más que pueda cómodamente","Mantenga 2 segundos","Regrese a posición neutra y repita"]'::jsonb),

('McKenzie 4 - Retracción Cervical',
 'Sentado o de pie, lleve la barbilla hacia atrás creando una doble papada. Fortalece los flexores cervicales profundos.',
 'McKenzie', 'Columna Cervical', 'easy', 120, 10, 3, true,
 '["Siéntese o póngase de pie con buena postura","Lleve la barbilla hacia atrás como haciendo doble papada","No incline la cabeza hacia abajo ni arriba","Mantenga 5 segundos","Relaje y repita"]'::jsonb);

-- ---- CODMAN EXERCISES (Pendular - Shoulder) -----------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Codman - Pendulares Circulares',
 'Inclinado hacia adelante, deje colgar el brazo afectado y realice movimientos circulares suaves usando el peso del cuerpo.',
 'Codman', 'Hombro', 'easy', 300, 10, 3, true,
 '["Inclínese hacia adelante apoyándose en una mesa con el brazo sano","Deje colgar libremente el brazo afectado","Realice pequeños círculos con el cuerpo (no con el hombro)","10 círculos en cada dirección","Aumente progresivamente el diámetro del movimiento"]'::jsonb),

('Codman - Pendulares Antero-posteriores',
 'Inclinado hacia adelante, balancee el brazo afectado hacia adelante y atrás como un péndulo.',
 'Codman', 'Hombro', 'easy', 300, 10, 3, true,
 '["Inclínese hacia adelante apoyándose con el brazo sano","Deje colgar el brazo afectado","Balancee suavemente hacia adelante y atrás","El movimiento debe ser rítmico y sin dolor","Realice 10 repeticiones"]'::jsonb),

('Codman - Pendulares Laterales',
 'Inclinado hacia adelante, balancee el brazo afectado de lado a lado como un péndulo.',
 'Codman', 'Hombro', 'easy', 300, 10, 3, true,
 '["Inclínese apoyándose con el brazo sano en una superficie","Deje colgar el brazo afectado relajado","Balancee suavemente de izquierda a derecha","Mantenga el hombro relajado durante todo el movimiento","Realice 10 repeticiones"]'::jsonb);

-- ---- BOBATH / NDT EXERCISES --------------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Bobath - Transferencia de Peso en Sedestación',
 'Sentado, traslade el peso del cuerpo hacia un lado y luego al otro, trabajando el control del tronco.',
 'Bobath', 'Cuerpo Completo', 'medium', 300, 10, 3, true,
 '["Siéntese al borde de una superficie estable","Traslade el peso hacia la derecha, alargando el lado izquierdo","Mantenga 5 segundos","Regrese al centro","Traslade hacia la izquierda y mantenga 5 segundos"]'::jsonb),

('Bobath - Puente (Bridge) Terapéutico',
 'Acostado boca arriba con rodillas flexionadas, eleve la pelvis del suelo activando glúteos. Enfocado en simetría.',
 'Bobath', 'Cadera', 'medium', 300, 10, 3, true,
 '["Acuéstese boca arriba con rodillas flexionadas a 90°","Los pies apoyados al ancho de la cadera","Eleve la pelvis contrayendo los glúteos","Mantenga la pelvis nivelada (sin rotar)","Mantenga 5 segundos arriba y baje lentamente"]'::jsonb),

('Bobath - Apoyo en Antebrazo (Prop on Elbows)',
 'Boca abajo, apóyese sobre los antebrazos elevando el tronco superior. Trabaja control de cabeza y tronco.',
 'Bobath', 'Columna Torácica', 'medium', 300, 5, 3, true,
 '["Acuéstese boca abajo","Coloque los antebrazos en el piso con los codos bajo los hombros","Eleve la cabeza y el pecho del suelo","Mantenga la posición 10-20 segundos","Enfóquese en mantener la cabeza en línea media"]'::jsonb),

('Bobath - Disociación de Cinturas',
 'Sentado o acostado, rote el tronco superior independientemente del inferior para mejorar la coordinación segmentaria.',
 'Bobath', 'Cuerpo Completo', 'medium', 300, 10, 3, true,
 '["Siéntese con buena postura","Rote el tronco superior hacia la derecha mientras las caderas permanecen fijas","Mantenga 3 segundos","Regrese al centro y rote a la izquierda","El movimiento debe ser suave y controlado"]'::jsonb);

-- ---- KABAT / PNF EXERCISES ---------------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Kabat - Diagonal D1 Flexión (Miembro Superior)',
 'Patrón diagonal: inicie con el brazo cruzado abajo y llévelo hacia arriba y afuera en diagonal con rotación externa.',
 'Kabat/PNF', 'Hombro', 'medium', 300, 10, 3, true,
 '["Inicie con el brazo cruzando el cuerpo abajo y hacia el lado contrario","Realice flexión, abducción y rotación externa del hombro","Extienda el codo mientras sube","Termine con la mano arriba y afuera","El terapeuta puede aplicar resistencia manual"]'::jsonb),

('Kabat - Diagonal D2 Flexión (Miembro Superior)',
 'Patrón diagonal: inicie con el brazo abajo y al lado contrario, llévelo hacia arriba cruzando el cuerpo.',
 'Kabat/PNF', 'Hombro', 'medium', 300, 10, 3, true,
 '["Inicie con el brazo abajo y hacia el lado opuesto","Realice flexión, aducción y rotación externa del hombro","Cruce el brazo hacia arriba sobre la línea media","El movimiento simula desenfundar una espada","Regrese lentamente a la posición inicial"]'::jsonb),

('Kabat - Diagonal D1 Flexión (Miembro Inferior)',
 'Patrón diagonal de pierna: flexión, aducción y rotación externa de cadera.',
 'Kabat/PNF', 'Cadera', 'medium', 300, 10, 3, true,
 '["Acuéstese boca arriba","Inicie con la pierna extendida y en abducción","Realice flexión de cadera cruzando la pierna hacia la línea media","Combine con rotación externa y dorsiflexión del pie","Regrese controladamente a la posición inicial"]'::jsonb);

-- ---- FRENKEL EXERCISES (Coordination) ----------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Frenkel - Deslizamiento de Talón sobre Espinilla',
 'Acostado, deslice el talón de una pierna sobre la espinilla de la otra de forma lenta y controlada.',
 'Frenkel', 'Cuerpo Completo', 'medium', 300, 10, 3, true,
 '["Acuéstese boca arriba con las piernas extendidas","Flexione una rodilla y coloque el talón sobre la rodilla opuesta","Deslice el talón lentamente espinilla abajo hasta el tobillo","Regrese deslizando hacia arriba","Mantenga el control visual del movimiento"]'::jsonb),

('Frenkel - Tocar Objetivos con el Pie',
 'Acostado, toque con el pie diferentes puntos marcados en la cama, mejorando precisión y coordinación.',
 'Frenkel', 'Cuerpo Completo', 'medium', 300, 10, 3, true,
 '["Acuéstese boca arriba","Marque 3-4 puntos en la cama con cinta","Toque cada punto con el talón de forma precisa","Alterne entre los puntos de forma aleatoria","Aumente la velocidad conforme mejore la precisión"]'::jsonb),

('Frenkel - Marcha con Huellas',
 'Camine siguiendo huellas marcadas en el piso, controlando el largo y ancho del paso.',
 'Frenkel', 'Cuerpo Completo', 'medium', 600, 1, 3, true,
 '["Marque huellas en el piso con cinta adhesiva","Camine colocando cada pie exactamente sobre la huella","Mantenga la vista en las marcas","Inicie lento y aumente velocidad gradualmente","Realice 3 recorridos de ida y vuelta"]'::jsonb);

-- ---- GENERIC: STRETCHING -----------------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Estiramiento de Cuádriceps de Pie',
 'De pie, flexione la rodilla llevando el talón al glúteo y sostenga el empeine con la mano.',
 'Estiramiento', 'Rodilla', 'easy', 120, 3, 3, true,
 '["Póngase de pie junto a una pared para apoyo","Flexione una rodilla y tome el empeine con la mano del mismo lado","Mantenga las rodillas juntas","Sienta el estiramiento en la parte frontal del muslo","Mantenga 20-30 segundos y cambie de pierna"]'::jsonb),

('Estiramiento del Piriforme',
 'Acostado, cruce un tobillo sobre la rodilla opuesta y jale el muslo hacia el pecho. Alivia ciática.',
 'Estiramiento', 'Cadera', 'easy', 120, 3, 3, true,
 '["Acuéstese boca arriba con ambas rodillas flexionadas","Cruce el tobillo derecho sobre la rodilla izquierda","Tome la pierna izquierda detrás del muslo y jale hacia el pecho","Sienta el estiramiento profundo en el glúteo derecho","Mantenga 30 segundos y cambie de lado"]'::jsonb),

('Estiramiento de Trapecio Superior',
 'Incline la cabeza hacia un lado llevando la oreja al hombro. Estira la musculatura lateral del cuello.',
 'Estiramiento', 'Columna Cervical', 'easy', 120, 3, 3, true,
 '["Siéntese o póngase de pie con buena postura","Incline la cabeza hacia la derecha acercando la oreja al hombro","Puede colocar la mano derecha sobre la cabeza para asistir suavemente","Mantenga el hombro izquierdo relajado y abajo","Mantenga 20-30 segundos y cambie de lado"]'::jsonb);

-- ---- GENERIC: STRENGTHENING --------------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Fortalecimiento de Cuádriceps (Extensión de Rodilla Sentado)',
 'Sentado en silla, extienda una rodilla completamente y mantenga 5 segundos arriba.',
 'Fortalecimiento', 'Rodilla', 'easy', 300, 10, 3, true,
 '["Siéntese en una silla con la espalda apoyada","Extienda una rodilla hasta estirar completamente la pierna","Mantenga 5 segundos con el cuádriceps contraído","Baje lentamente","Realice todas las repeticiones antes de cambiar de pierna"]'::jsonb),

('Fortalecimiento de Glúteo Medio (Abducción Lateral)',
 'Acostado de lado, eleve la pierna de arriba manteniéndola recta. Fortalece estabilizadores de cadera.',
 'Fortalecimiento', 'Cadera', 'easy', 300, 15, 3, true,
 '["Acuéstese sobre el lado sano con las piernas extendidas","Eleve la pierna de arriba a 30-45° manteniendo la rodilla recta","Mantenga los dedos del pie apuntando al frente (no hacia arriba)","Mantenga 3 segundos arriba","Baje lentamente y repita"]'::jsonb),

('Isométrico de Cuádriceps',
 'Acostado, contraiga el cuádriceps empujando la rodilla hacia el piso. Ideal para fase aguda.',
 'Fortalecimiento', 'Rodilla', 'easy', 120, 10, 3, true,
 '["Acuéstese boca arriba con la pierna extendida","Coloque una toalla enrollada bajo la rodilla","Empuje la rodilla hacia abajo contra la toalla contrayendo el cuádriceps","Mantenga 5-10 segundos","Relaje y repita"]'::jsonb),

('Plancha Frontal (Plank)',
 'Apóyese sobre antebrazos y puntas de los pies manteniendo el cuerpo recto. Fortalece el core.',
 'Fortalecimiento', 'Cuerpo Completo', 'medium', 120, 3, 3, true,
 '["Colóquese boca abajo apoyado sobre antebrazos y puntas de los pies","Eleve el cuerpo formando una línea recta de cabeza a talones","Contraiga el abdomen y los glúteos","No deje que la cadera se hunda ni se eleve","Mantenga 15-30 segundos según tolerancia"]'::jsonb);

-- ---- GENERIC: PROPRIOCEPTION / BALANCE ---------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Equilibrio en Un Pie',
 'Manténgase de pie sobre una pierna con los brazos a los lados. Progrese cerrando los ojos.',
 'Propiocepción', 'Tobillo', 'easy', 300, 5, 3, true,
 '["Póngase de pie cerca de una pared o barra de apoyo","Eleve un pie del piso flexionando la rodilla","Mantenga el equilibrio 15-30 segundos","Si es fácil, intente cerrar los ojos","Cambie de pierna y repita"]'::jsonb),

('Propiocepción en Superficie Inestable',
 'De pie sobre cojín, almohada o disco de equilibrio. Mantenga la postura y progrese a un pie.',
 'Propiocepción', 'Tobillo', 'medium', 300, 5, 3, true,
 '["Coloque un cojín o almohada firme en el piso","Párese sobre él con ambos pies","Mantenga el equilibrio 30 segundos","Progrese a un solo pie","Puede agregar movimientos de brazos para mayor dificultad"]'::jsonb);

-- ---- GENERIC: RESPIRATORY ----------------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Respiración Diafragmática',
 'Inspire inflando el abdomen (no el pecho) y espire lentamente. Base de la rehabilitación respiratoria.',
 'Respiratorio', 'Tórax', 'easy', 300, 10, 3, true,
 '["Acuéstese boca arriba o siéntese cómodamente","Coloque una mano en el pecho y otra en el abdomen","Inspire por la nariz inflando el abdomen (la mano del abdomen sube)","La mano del pecho no debe moverse","Espire lentamente por la boca con labios fruncidos","Repita rítmicamente"]'::jsonb),

('Labios Fruncidos (Pursed Lip Breathing)',
 'Inspire por nariz en 2 tiempos, espire por boca con labios fruncidos en 4 tiempos.',
 'Respiratorio', 'Tórax', 'easy', 300, 10, 3, true,
 '["Siéntese en posición cómoda","Inspire por la nariz contando hasta 2","Frunza los labios como si fuera a soplar una vela","Espire lentamente contando hasta 4","El aire debe salir en un flujo constante y suave"]'::jsonb),

('Espirometría Incentiva',
 'Use el espirómetro incentivo inspirando lenta y profundamente. Post-quirúrgico y EPOC.',
 'Respiratorio', 'Tórax', 'easy', 300, 10, 3, true,
 '["Siéntese erguido","Coloque la boquilla del espirómetro en la boca","Inspire lenta y profundamente elevando la esfera","Mantenga la inspiración 3-5 segundos","Retire la boquilla y espire normalmente"]'::jsonb);

-- ---- GENERIC: FUNCTIONAL / ADL -----------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Sentarse y Levantarse de Silla',
 'Practique levantarse y sentarse de una silla sin usar las manos. Ejercicio funcional esencial.',
 'Funcional', 'Cuerpo Completo', 'easy', 300, 10, 3, true,
 '["Siéntese al borde de la silla con los pies al ancho de caderas","Incline el tronco hacia adelante","Empuje con las piernas para levantarse sin usar las manos","Mantenga de pie 3 segundos","Siéntese lentamente controlando el descenso"]'::jsonb),

('Marcha con Obstáculos',
 'Camine sorteando conos, botellas o almohadas en el piso. Mejora coordinación y equilibrio en marcha.',
 'Funcional', 'Cuerpo Completo', 'medium', 600, 1, 3, true,
 '["Coloque 5-8 obstáculos en línea separados 50 cm","Camine levantando los pies por encima de cada obstáculo","Mantenga la vista al frente (no en los pies)","Ida y vuelta constituyen 1 recorrido","Realice 3 recorridos"]'::jsonb);

-- ---- KEGEL --------------------------------------------------

INSERT INTO exercise_library (name, description, category, body_area, difficulty, duration_seconds, repetitions, sets, is_global, instructions)
VALUES
('Ejercicios de Kegel (Piso Pélvico)',
 'Contraiga los músculos del piso pélvico como si intentara detener el flujo de orina. Mantenga y relaje.',
 'Kegel', 'Pelvis', 'easy', 300, 10, 3, true,
 '["Siéntese o acuéstese cómodamente","Identifique los músculos del piso pélvico (como si detuviera la orina)","Contraiga esos músculos durante 5 segundos","Relaje durante 5 segundos","No contraiga abdominales, glúteos ni muslos","Repita 10 veces, 3 veces al día"]'::jsonb);


-- ============================================================
-- TAXONOMY LINKS for seeded exercises
-- ============================================================

-- Williams exercises: lumbar, flexion technique, lumbalgia pathology, core muscles, ortho specialty
-- We link by exercise name for clarity

-- Williams 1
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Williams 1 - Inclinación Pélvica' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','seg_pelvis','tech_williams','pat_lumbalgia','pat_hernia_discal',
                  'mus_core','mus_erectores','spec_ortopedia','type_fortalecimiento','type_isometrico',
                  'phase_subaguda','phase_recuperacion','pos_decubito_supino','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- Williams 2
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Williams 2 - Rodillas al Pecho' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','tech_williams','pat_lumbalgia','mus_erectores','mus_psoas_iliaco',
                  'spec_ortopedia','type_estiramiento','type_movilidad_rom','phase_subaguda','phase_recuperacion',
                  'pos_decubito_supino','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- Williams 3
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Williams 3 - Curl Parcial (Abdominal)' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','tech_williams','pat_lumbalgia','mus_core',
                  'spec_ortopedia','type_fortalecimiento','phase_recuperacion',
                  'pos_decubito_supino','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- Williams 4
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Williams 4 - Estiramiento de Isquiotibiales' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','seg_rodilla','tech_williams','pat_lumbalgia',
                  'mus_isquiotibiales','spec_ortopedia','type_estiramiento',
                  'phase_subaguda','phase_recuperacion','pos_decubito_supino',
                  'eq_sin_equipo','eq_banda_elastica','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- Williams 5
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Williams 5 - Estiramiento de Flexores de Cadera' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','seg_cadera','tech_williams','pat_lumbalgia',
                  'mus_psoas_iliaco','mus_cuadriceps','spec_ortopedia','type_estiramiento',
                  'phase_recuperacion','pos_arrodillado','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- Williams 6
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Williams 6 - Sentadilla en Pared' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','seg_rodilla','tech_williams','pat_lumbalgia',
                  'mus_cuadriceps','mus_gluteo_mayor','mus_core','spec_ortopedia',
                  'type_fortalecimiento','type_isometrico','phase_recuperacion','phase_mantenimiento',
                  'pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- McKenzie 1
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'McKenzie 1 - Extensión en Prono (Passive)' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','tech_mckenzie','pat_lumbalgia','pat_hernia_discal',
                  'mus_erectores','spec_ortopedia','type_movilidad_rom','type_relajacion',
                  'phase_aguda','phase_subaguda','pos_decubito_prono','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- McKenzie 2
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'McKenzie 2 - Extensión con Apoyo de Manos (Press-up)' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','tech_mckenzie','pat_lumbalgia','pat_hernia_discal',
                  'mus_erectores','spec_ortopedia','type_movilidad_rom',
                  'phase_subaguda','phase_recuperacion','pos_decubito_prono','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- McKenzie 3
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'McKenzie 3 - Extensión de Pie' AND el.is_global = true
  AND tt.code IN ('seg_columna_lumbar','tech_mckenzie','pat_lumbalgia',
                  'mus_erectores','spec_ortopedia','type_movilidad_rom',
                  'phase_recuperacion','phase_mantenimiento','pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- McKenzie 4
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'McKenzie 4 - Retracción Cervical' AND el.is_global = true
  AND tt.code IN ('seg_columna_cervical','tech_mckenzie','pat_cervicalgia',
                  'mus_esternocleidomastoideo','mus_trapecio','spec_ortopedia',
                  'type_fortalecimiento','type_movilidad_rom',
                  'phase_subaguda','phase_recuperacion','phase_mantenimiento',
                  'pos_sedestacion','pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- Codman exercises
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name LIKE 'Codman%' AND el.is_global = true
  AND tt.code IN ('seg_hombro','tech_codman','pat_hombro_congelado','pat_tendinitis','pat_fractura',
                  'mus_deltoides','mus_manguito_rotador','spec_ortopedia',
                  'type_movilidad_rom','phase_aguda','phase_subaguda',
                  'pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- Bobath exercises
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name LIKE 'Bobath%' AND el.is_global = true
  AND tt.code IN ('seg_cuerpo_completo','tech_bobath','pat_evc','pat_paralisis_cerebral',
                  'mus_core','mus_gluteo_mayor','spec_neurologia','spec_pediatria',
                  'type_coordinacion','type_funcional','phase_subaguda','phase_recuperacion',
                  'eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- Kabat / PNF exercises
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name LIKE 'Kabat%' AND el.is_global = true
  AND tt.code IN ('seg_hombro','seg_cadera','tech_kabat_pnf','pat_evc','pat_lesion_medular',
                  'mus_deltoides','mus_manguito_rotador','mus_gluteo_mayor','mus_psoas_iliaco',
                  'spec_neurologia','type_fortalecimiento','type_coordinacion',
                  'phase_recuperacion','pos_decubito_supino','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- Frenkel exercises
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name LIKE 'Frenkel%' AND el.is_global = true
  AND tt.code IN ('seg_cuerpo_completo','tech_frenkel','pat_evc','pat_parkinson',
                  'spec_neurologia','type_coordinacion','type_marcha',
                  'phase_recuperacion','phase_mantenimiento','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- Stretching exercises
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Estiramiento de Cuádriceps de Pie' AND el.is_global = true
  AND tt.code IN ('seg_rodilla','seg_cadera','tech_cinesiterapia','mus_cuadriceps',
                  'spec_ortopedia','spec_deportiva','type_estiramiento',
                  'phase_recuperacion','phase_mantenimiento','pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Estiramiento del Piriforme' AND el.is_global = true
  AND tt.code IN ('seg_cadera','tech_cinesiterapia','pat_lumbalgia',
                  'mus_gluteo_mayor','spec_ortopedia','type_estiramiento',
                  'phase_recuperacion','phase_mantenimiento','pos_decubito_supino','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Estiramiento de Trapecio Superior' AND el.is_global = true
  AND tt.code IN ('seg_columna_cervical','tech_cinesiterapia','pat_cervicalgia',
                  'mus_trapecio','spec_ortopedia','type_estiramiento',
                  'phase_subaguda','phase_recuperacion','phase_mantenimiento',
                  'pos_sedestacion','pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- Strengthening exercises
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Fortalecimiento de Cuádriceps (Extensión de Rodilla Sentado)' AND el.is_global = true
  AND tt.code IN ('seg_rodilla','tech_cinesiterapia','pat_gonartrosis','pat_protesis_rodilla','pat_lca',
                  'mus_cuadriceps','spec_ortopedia','spec_geriatria',
                  'type_fortalecimiento','phase_subaguda','phase_recuperacion',
                  'pos_sedestacion','eq_sin_equipo','eq_silla')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Fortalecimiento de Glúteo Medio (Abducción Lateral)' AND el.is_global = true
  AND tt.code IN ('seg_cadera','tech_cinesiterapia','pat_coxartrosis','pat_protesis_cadera',
                  'mus_gluteo_medio','spec_ortopedia','type_fortalecimiento',
                  'phase_recuperacion','phase_mantenimiento','pos_decubito_lateral','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Isométrico de Cuádriceps' AND el.is_global = true
  AND tt.code IN ('seg_rodilla','tech_cinesiterapia','pat_gonartrosis','pat_protesis_rodilla','pat_lca','pat_fractura',
                  'mus_cuadriceps','spec_ortopedia','type_fortalecimiento','type_isometrico',
                  'phase_aguda','phase_subaguda','pos_decubito_supino','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Plancha Frontal (Plank)' AND el.is_global = true
  AND tt.code IN ('seg_cuerpo_completo','tech_cinesiterapia',
                  'mus_core','mus_erectores','mus_deltoides',
                  'spec_ortopedia','spec_deportiva','type_fortalecimiento','type_isometrico',
                  'phase_recuperacion','phase_mantenimiento','pos_decubito_prono','eq_sin_equipo','eq_colchoneta')
ON CONFLICT DO NOTHING;

-- Proprioception
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Equilibrio en Un Pie' AND el.is_global = true
  AND tt.code IN ('seg_tobillo_pie','seg_rodilla','tech_cinesiterapia','pat_esguince','pat_fractura',
                  'mus_peroneos','mus_tibial_anterior','mus_gastrocnemio',
                  'spec_ortopedia','spec_geriatria','spec_deportiva',
                  'type_propiocepcion','phase_recuperacion','phase_mantenimiento',
                  'pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Propiocepción en Superficie Inestable' AND el.is_global = true
  AND tt.code IN ('seg_tobillo_pie','seg_rodilla','tech_cinesiterapia','pat_esguince',
                  'mus_peroneos','mus_tibial_anterior','mus_gastrocnemio',
                  'spec_ortopedia','spec_deportiva','type_propiocepcion',
                  'phase_recuperacion','phase_mantenimiento','pos_bipedestacion','eq_bosu')
ON CONFLICT DO NOTHING;

-- Respiratory
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Respiración Diafragmática' AND el.is_global = true
  AND tt.code IN ('seg_torax','tech_cinesiterapia','pat_epoc',
                  'mus_diafragma','spec_neumologia','spec_cardiologia',
                  'type_respiratorio','type_relajacion',
                  'phase_aguda','phase_subaguda','phase_recuperacion','phase_mantenimiento',
                  'pos_decubito_supino','pos_sedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Labios Fruncidos (Pursed Lip Breathing)' AND el.is_global = true
  AND tt.code IN ('seg_torax','tech_cinesiterapia','pat_epoc',
                  'mus_diafragma','spec_neumologia',
                  'type_respiratorio','phase_aguda','phase_subaguda','phase_recuperacion','phase_mantenimiento',
                  'pos_sedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Espirometría Incentiva' AND el.is_global = true
  AND tt.code IN ('seg_torax','pat_epoc',
                  'mus_diafragma','spec_neumologia',
                  'type_respiratorio','phase_aguda','phase_subaguda',
                  'pos_sedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- Functional
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Sentarse y Levantarse de Silla' AND el.is_global = true
  AND tt.code IN ('seg_rodilla','seg_cadera','seg_cuerpo_completo','tech_cinesiterapia',
                  'pat_gonartrosis','pat_coxartrosis',
                  'mus_cuadriceps','mus_gluteo_mayor','spec_ortopedia','spec_geriatria',
                  'type_funcional','type_fortalecimiento',
                  'phase_recuperacion','phase_mantenimiento','pos_sedestacion','eq_silla')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Marcha con Obstáculos' AND el.is_global = true
  AND tt.code IN ('seg_tobillo_pie','seg_rodilla','seg_cuerpo_completo','tech_cinesiterapia',
                  'spec_ortopedia','spec_geriatria','spec_neurologia',
                  'type_funcional','type_marcha','type_coordinacion','type_propiocepcion',
                  'phase_recuperacion','phase_mantenimiento','pos_bipedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;

-- Kegel
INSERT INTO exercise_taxonomy_links (exercise_id, term_id)
SELECT el.id, tt.id FROM exercise_library el, exercise_taxonomy_terms tt
WHERE el.name = 'Ejercicios de Kegel (Piso Pélvico)' AND el.is_global = true
  AND tt.code IN ('seg_pelvis','tech_kegel',
                  'mus_piso_pelvico','spec_uroginecologia',
                  'type_fortalecimiento','type_isometrico',
                  'phase_subaguda','phase_recuperacion','phase_mantenimiento',
                  'pos_decubito_supino','pos_sedestacion','eq_sin_equipo')
ON CONFLICT DO NOTHING;
