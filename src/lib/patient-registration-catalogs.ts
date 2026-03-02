export type CatalogOption = {
  value: string;
  label: string;
};

export const GENDER_OPTIONS: CatalogOption[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
  { value: 'other', label: 'Otro' },
  { value: 'unspecified', label: 'Prefiero no decir' },
  { value: 'no_especificado', label: 'Prefiero no decir' },
];

// Normalizes gender values from different input sources to canonical form
const GENDER_CANONICAL: Record<string, string> = {
  male: 'male', masculino: 'male', m: 'male',
  female: 'female', femenino: 'female', f: 'female',
  otro: 'otro', other: 'otro',
  unspecified: 'unspecified', no_especificado: 'unspecified',
  'prefiero no decir': 'unspecified',
};

const HANDEDNESS_CANONICAL: Record<string, string> = {
  right: 'right', diestro: 'right', derecha: 'right',
  left: 'left', zurdo: 'left', izquierda: 'left',
  ambidextrous: 'ambidextrous', ambidiestro: 'ambidextrous',
};

const MARITAL_CANONICAL: Record<string, string> = {
  soltero: 'soltero', 'soltero o soltera': 'soltero',
  casado: 'casado', 'casado o casada': 'casado',
  union_libre: 'union_libre', 'union libre': 'union_libre',
  divorciado: 'divorciado', 'divorciado o divorciada': 'divorciado',
  viudo: 'viudo', 'viudo o viuda': 'viudo',
  otro: 'otro', other: 'otro',
};

const EDUCATION_CANONICAL: Record<string, string> = {
  ninguna: 'ninguna', 'sin estudios': 'ninguna', none: 'ninguna',
  primaria: 'primaria',
  secundaria: 'secundaria',
  preparatoria: 'preparatoria',
  universidad: 'universidad',
  posgrado: 'posgrado',
  otro: 'otro', other: 'otro',
};

/** Returns the canonical value for a field or the original value if unknown. */
export const normalizeFieldValue = (
  field: 'gender' | 'handedness' | 'marital_status' | 'education_level',
  raw?: string | null,
): string => {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();
  const map: Record<string, Record<string, string>> = {
    gender: GENDER_CANONICAL,
    handedness: HANDEDNESS_CANONICAL,
    marital_status: MARITAL_CANONICAL,
    education_level: EDUCATION_CANONICAL,
  };
  return map[field][lower] ?? raw;
};

/** Returns the human-readable label for a canonical value in a catalog. */
export const getLabelFromCatalog = (
  options: CatalogOption[],
  value?: string | null,
): string => {
  if (!value) return '';
  const found = options.find((o) => o.value === value);
  return found?.label ?? value;
};

export const CHRONIC_DISEASE_OPTIONS: CatalogOption[] = [
  { value: 'Diabetes', label: 'Diabetes' },
  { value: 'Presion alta', label: 'Presion alta' },
  { value: 'Artritis', label: 'Artritis' },
  { value: 'Asma', label: 'Asma' },
  { value: 'Colesterol alto', label: 'Colesterol alto' },
  { value: 'Enfermedad del corazon', label: 'Enfermedad del corazon' },
  { value: 'Enfermedad del rinon', label: 'Enfermedad del rinon' },
  { value: 'Problemas de tiroides', label: 'Problemas de tiroides' },
  { value: 'Ansiedad o depresion', label: 'Ansiedad o depresion' },
  { value: 'Otra', label: 'Otra' },
];

export const TREATMENT_OPTIONS: CatalogOption[] = [
  { value: 'Pastillas para presion', label: 'Pastillas para presion' },
  { value: 'Insulina', label: 'Insulina' },
  { value: 'Pastillas para azucar', label: 'Pastillas para azucar' },
  { value: 'Vitaminas', label: 'Vitaminas' },
  { value: 'Antiinflamatorios', label: 'Antiinflamatorios' },
  { value: 'Otra', label: 'Otra' },
];

export const SURGERY_OPTIONS: CatalogOption[] = [
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'Cesarea', label: 'Cesarea' },
  { value: 'Apendicitis', label: 'Apendicitis' },
  { value: 'Vesicula', label: 'Vesicula' },
  { value: 'Cirugia de rodilla', label: 'Cirugia de rodilla' },
  { value: 'Otra', label: 'Otra' },
];

export const FRACTURE_OPTIONS: CatalogOption[] = [
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'Brazo', label: 'Brazo' },
  { value: 'Pierna', label: 'Pierna' },
  { value: 'Mano', label: 'Mano' },
  { value: 'Cabeza', label: 'Cabeza' },
  { value: 'Otra', label: 'Otra' },
];

export const HOSPITALIZATION_OPTIONS: CatalogOption[] = [
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'Operacion', label: 'Operacion' },
  { value: 'Accidente', label: 'Accidente' },
  { value: 'Embarazo o parto', label: 'Embarazo o parto' },
  { value: 'Otra', label: 'Otra' },
];

export const RELIGION_OPTIONS: CatalogOption[] = [
  { value: 'Catolica', label: 'Catolica' },
  { value: 'Evangelica', label: 'Evangelica' },
  { value: 'Cristiana', label: 'Cristiana' },
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'Otra', label: 'Otra' },
];

export const MARITAL_STATUS_OPTIONS: CatalogOption[] = [
  { value: 'soltero', label: 'Soltero o soltera' },
  { value: 'casado', label: 'Casado o casada' },
  { value: 'union_libre', label: 'Union libre' },
  { value: 'divorciado', label: 'Divorciado o divorciada' },
  { value: 'viudo', label: 'Viudo o viuda' },
  { value: 'otro', label: 'Otro' },
];

export const EDUCATION_LEVEL_OPTIONS: CatalogOption[] = [
  { value: 'ninguna', label: 'Sin estudios' },
  { value: 'primaria', label: 'Primaria' },
  { value: 'secundaria', label: 'Secundaria' },
  { value: 'preparatoria', label: 'Preparatoria' },
  { value: 'universidad', label: 'Universidad' },
  { value: 'posgrado', label: 'Posgrado' },
  { value: 'otro', label: 'Otro' },
];

export const DIET_OPTIONS: CatalogOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Vegetariana', label: 'Vegetariana' },
  { value: 'Sin sal', label: 'Sin sal' },
  { value: 'Baja en grasas', label: 'Baja en grasas' },
  { value: 'Otra', label: 'Otra' },
];

export const HYGIENE_OPTIONS: CatalogOption[] = [
  { value: 'Diaria', label: 'Diaria' },
  { value: 'Regular', label: 'Regular' },
  { value: 'Otra', label: 'Otra' },
];

export const VACCINE_OPTIONS: CatalogOption[] = [
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'COVID', label: 'COVID' },
  { value: 'Influenza', label: 'Influenza' },
  { value: 'Hepatitis', label: 'Hepatitis' },
  { value: 'Tetanos', label: 'Tetanos' },
  { value: 'Otra', label: 'Otra' },
];

export const FAMILY_RELATIONSHIP_OPTIONS: CatalogOption[] = [
  { value: 'Madre', label: 'Madre' },
  { value: 'Padre', label: 'Padre' },
  { value: 'Hermano o hermana', label: 'Hermano o hermana' },
  { value: 'Abuelo o abuela', label: 'Abuelo o abuela' },
  { value: 'Tio o tia', label: 'Tio o tia' },
  { value: 'Otro', label: 'Otro' },
];

