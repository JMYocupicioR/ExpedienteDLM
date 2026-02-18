// =====================================================
// CATÁLOGO DE MEDICAMENTOS EXPANDIDO
// =====================================================
// Fallback offline cuando la BD no esté disponible.
// Se complementa con la tabla `medications` en Supabase.

export interface MedicationCatalogEntry {
  name: string;
  genericName?: string;
  category: string;
  defaultDosage: string;
  defaultFrequency: string;
  defaultDuration: string;
  commonDoses: string[];
  commonFrequencies: string[];
  maxDailyDose?: string;
  pregnancyCategory?: string;
  isControlled?: boolean;
}

/**
 * Expanded medication catalog - 50+ entries for offline fallback.
 * When online, use MedicationService.search() instead.
 */
export const MEDICATION_CATALOG: MedicationCatalogEntry[] = [
  // --- ANALGÉSICOS ---
  { name: 'Paracetamol', genericName: 'Acetaminofén', category: 'Analgésico', defaultDosage: '500mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['325mg', '500mg', '1000mg'], commonFrequencies: ['Cada 6 horas', 'Cada 8 horas'], maxDailyDose: '4000mg', pregnancyCategory: 'B' },
  { name: 'Ibuprofeno', category: 'AINE', defaultDosage: '400mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '7 días', commonDoses: ['200mg', '400mg', '600mg', '800mg'], commonFrequencies: ['Cada 8 horas', 'Cada 12 horas'], maxDailyDose: '3200mg', pregnancyCategory: 'C' },
  { name: 'Naproxeno', category: 'AINE', defaultDosage: '250mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '7 días', commonDoses: ['250mg', '500mg'], commonFrequencies: ['Cada 12 horas'], maxDailyDose: '1250mg', pregnancyCategory: 'C' },
  { name: 'Diclofenaco', category: 'AINE', defaultDosage: '50mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['25mg', '50mg', '100mg'], commonFrequencies: ['Cada 8 horas', 'Cada 12 horas'], maxDailyDose: '150mg', pregnancyCategory: 'C' },
  { name: 'Ketorolaco', category: 'AINE', defaultDosage: '10mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['10mg'], commonFrequencies: ['Cada 6 horas', 'Cada 8 horas'], maxDailyDose: '40mg' },
  { name: 'Metamizol', genericName: 'Dipirona', category: 'Analgésico', defaultDosage: '500mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['500mg', '1g'], commonFrequencies: ['Cada 8 horas'] },

  // --- ANTIBIÓTICOS ---
  { name: 'Amoxicilina', category: 'Antibiótico', defaultDosage: '500mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '7 días', commonDoses: ['250mg', '500mg', '875mg'], commonFrequencies: ['Cada 8 horas', 'Cada 12 horas'], pregnancyCategory: 'B' },
  { name: 'Amoxicilina/Clavulanato', category: 'Antibiótico', defaultDosage: '875/125mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '7 días', commonDoses: ['500/125mg', '875/125mg'], commonFrequencies: ['Cada 8 horas', 'Cada 12 horas'], pregnancyCategory: 'B' },
  { name: 'Azitromicina', category: 'Antibiótico', defaultDosage: '500mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '3 días', commonDoses: ['250mg', '500mg'], commonFrequencies: ['Cada 24 horas'], pregnancyCategory: 'B' },
  { name: 'Ciprofloxacino', category: 'Antibiótico', defaultDosage: '500mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '7 días', commonDoses: ['250mg', '500mg', '750mg'], commonFrequencies: ['Cada 12 horas'], pregnancyCategory: 'C' },
  { name: 'Levofloxacino', category: 'Antibiótico', defaultDosage: '500mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '7 días', commonDoses: ['500mg', '750mg'], commonFrequencies: ['Cada 24 horas'], pregnancyCategory: 'C' },
  { name: 'Cefalexina', category: 'Antibiótico', defaultDosage: '500mg', defaultFrequency: 'Cada 6 horas', defaultDuration: '7 días', commonDoses: ['250mg', '500mg'], commonFrequencies: ['Cada 6 horas', 'Cada 8 horas'], pregnancyCategory: 'B' },
  { name: 'Claritromicina', category: 'Antibiótico', defaultDosage: '500mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '7 días', commonDoses: ['250mg', '500mg'], commonFrequencies: ['Cada 12 horas'], pregnancyCategory: 'C' },
  { name: 'Trimetoprima/Sulfametoxazol', category: 'Antibiótico', defaultDosage: '160/800mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '7 días', commonDoses: ['80/400mg', '160/800mg'], commonFrequencies: ['Cada 12 horas'], pregnancyCategory: 'C' },
  { name: 'Metronidazol', category: 'Antibiótico/Antiparasitario', defaultDosage: '500mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '7 días', commonDoses: ['250mg', '500mg'], commonFrequencies: ['Cada 8 horas'] },
  { name: 'Doxiciclina', category: 'Antibiótico', defaultDosage: '100mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '7 días', commonDoses: ['100mg'], commonFrequencies: ['Cada 12 horas', 'Cada 24 horas'] },

  // --- GASTROINTESTINALES ---
  { name: 'Omeprazol', category: 'IBP', defaultDosage: '20mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '14 días', commonDoses: ['10mg', '20mg', '40mg'], commonFrequencies: ['Cada 24 horas'], maxDailyDose: '80mg', pregnancyCategory: 'C' },
  { name: 'Pantoprazol', category: 'IBP', defaultDosage: '40mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '14 días', commonDoses: ['20mg', '40mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Ranitidina', category: 'Anti-H2', defaultDosage: '150mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '14 días', commonDoses: ['150mg', '300mg'], commonFrequencies: ['Cada 12 horas'] },
  { name: 'Metoclopramida', category: 'Antiemético', defaultDosage: '10mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['10mg'], commonFrequencies: ['Cada 8 horas'] },
  { name: 'Loperamida', category: 'Antidiarreico', defaultDosage: '2mg', defaultFrequency: 'Según necesidad', defaultDuration: '3 días', commonDoses: ['2mg'], commonFrequencies: ['Cada diarrea, máx 16mg/día'] },
  { name: 'Butilhioscina', category: 'Antiespasmódico', defaultDosage: '10mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['10mg', '20mg'], commonFrequencies: ['Cada 8 horas'] },

  // --- CARDIOVASCULARES ---
  { name: 'Losartán', category: 'ARA II', defaultDosage: '50mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['25mg', '50mg', '100mg'], commonFrequencies: ['Cada 24 horas'], maxDailyDose: '100mg' },
  { name: 'Enalapril', category: 'IECA', defaultDosage: '10mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '30 días', commonDoses: ['5mg', '10mg', '20mg'], commonFrequencies: ['Cada 12 horas', 'Cada 24 horas'] },
  { name: 'Amlodipino', category: 'Calcioantagonista', defaultDosage: '5mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['2.5mg', '5mg', '10mg'], commonFrequencies: ['Cada 24 horas'], maxDailyDose: '10mg' },
  { name: 'Atorvastatina', category: 'Estatina', defaultDosage: '20mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['10mg', '20mg', '40mg', '80mg'], commonFrequencies: ['Cada 24 horas'], maxDailyDose: '80mg' },
  { name: 'Rosuvastatina', category: 'Estatina', defaultDosage: '10mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['5mg', '10mg', '20mg', '40mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Metoprolol', category: 'Betabloqueador', defaultDosage: '50mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '30 días', commonDoses: ['25mg', '50mg', '100mg'], commonFrequencies: ['Cada 12 horas'] },
  { name: 'Aspirina', genericName: 'Ácido acetilsalicílico', category: 'Antiagregante', defaultDosage: '100mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['81mg', '100mg', '325mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Clopidogrel', category: 'Antiagregante', defaultDosage: '75mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['75mg'], commonFrequencies: ['Cada 24 horas'] },

  // --- ENDOCRINOLOGÍA ---
  { name: 'Metformina', category: 'Antidiabético', defaultDosage: '850mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '30 días', commonDoses: ['500mg', '850mg', '1000mg'], commonFrequencies: ['Cada 12 horas', 'Cada 24 horas'], maxDailyDose: '2550mg' },
  { name: 'Glibenclamida', category: 'Sulfonilurea', defaultDosage: '5mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['2.5mg', '5mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Levotiroxina', category: 'Hormona tiroidea', defaultDosage: '50mcg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['25mcg', '50mcg', '75mcg', '100mcg', '150mcg'], commonFrequencies: ['Cada 24 horas en ayunas'] },

  // --- RESPIRATORIO ---
  { name: 'Salbutamol', category: 'Broncodilatador', defaultDosage: '2 inhalaciones', defaultFrequency: 'Cada 6 horas', defaultDuration: '7 días', commonDoses: ['100mcg/inhalación'], commonFrequencies: ['Cada 4-6 horas PRN'] },
  { name: 'Fluticasona', category: 'Corticoide inhalado', defaultDosage: '2 inhalaciones', defaultFrequency: 'Cada 12 horas', defaultDuration: '30 días', commonDoses: ['50mcg', '125mcg', '250mcg'], commonFrequencies: ['Cada 12 horas'] },
  { name: 'Montelukast', category: 'Antileucotrieno', defaultDosage: '10mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['4mg', '5mg', '10mg'], commonFrequencies: ['Cada 24 horas por la noche'] },
  { name: 'Loratadina', category: 'Antihistamínico', defaultDosage: '10mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '7 días', commonDoses: ['5mg', '10mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Cetirizina', category: 'Antihistamínico', defaultDosage: '10mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '7 días', commonDoses: ['5mg', '10mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Ambroxol', category: 'Mucolítico', defaultDosage: '30mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['15mg', '30mg'], commonFrequencies: ['Cada 8 horas', 'Cada 12 horas'] },
  { name: 'Dextrometorfano', category: 'Antitusígeno', defaultDosage: '15mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '5 días', commonDoses: ['15mg', '30mg'], commonFrequencies: ['Cada 6-8 horas'] },

  // --- NEUROLÓGICO / PSIQUIÁTRICO ---
  { name: 'Sertralina', category: 'ISRS', defaultDosage: '50mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['25mg', '50mg', '100mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Fluoxetina', category: 'ISRS', defaultDosage: '20mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['10mg', '20mg', '40mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Alprazolam', category: 'Benzodiazepina', defaultDosage: '0.25mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '14 días', commonDoses: ['0.25mg', '0.5mg', '1mg'], commonFrequencies: ['Cada 8 horas', 'Cada 12 horas'], isControlled: true },
  { name: 'Clonazepam', category: 'Benzodiazepina', defaultDosage: '0.5mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '14 días', commonDoses: ['0.25mg', '0.5mg', '2mg'], commonFrequencies: ['Cada 12 horas', 'Cada 24 horas'], isControlled: true },
  { name: 'Gabapentina', category: 'Anticonvulsivo', defaultDosage: '300mg', defaultFrequency: 'Cada 8 horas', defaultDuration: '30 días', commonDoses: ['100mg', '300mg', '600mg', '800mg'], commonFrequencies: ['Cada 8 horas'] },
  { name: 'Pregabalina', category: 'Anticonvulsivo', defaultDosage: '75mg', defaultFrequency: 'Cada 12 horas', defaultDuration: '30 días', commonDoses: ['75mg', '150mg', '300mg'], commonFrequencies: ['Cada 12 horas'], isControlled: true },

  // --- OTROS ---
  { name: 'Prednisona', category: 'Corticoide', defaultDosage: '20mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '5 días', commonDoses: ['5mg', '10mg', '20mg', '50mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Ciprofloxacino Oftálmico', category: 'Antibiótico oftálmico', defaultDosage: '1 gota', defaultFrequency: 'Cada 4 horas', defaultDuration: '7 días', commonDoses: ['1 gota'], commonFrequencies: ['Cada 4 horas', 'Cada 6 horas'] },
  { name: 'Hierro (Sulfato ferroso)', category: 'Suplemento', defaultDosage: '300mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['200mg', '300mg'], commonFrequencies: ['Cada 24 horas en ayunas'] },
  { name: 'Ácido fólico', category: 'Vitamina', defaultDosage: '5mg', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['1mg', '5mg'], commonFrequencies: ['Cada 24 horas'] },
  { name: 'Complejo B', category: 'Vitamina', defaultDosage: '1 tableta', defaultFrequency: 'Cada 24 horas', defaultDuration: '30 días', commonDoses: ['1 tableta'], commonFrequencies: ['Cada 24 horas'] },
];

/**
 * Search medications by name using fuzzy matching.
 * Used as offline fallback when Supabase is not available.
 */
export function searchMedicationCatalog(query: string, limit = 10): MedicationCatalogEntry[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return MEDICATION_CATALOG
    .filter(med => {
      const normalizedName = med.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedGeneric = (med.genericName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedCategory = med.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedName.includes(normalizedQuery) || 
             normalizedGeneric.includes(normalizedQuery) ||
             normalizedCategory.includes(normalizedQuery);
    })
    .slice(0, limit);
}

/**
 * Get smart defaults when a medication is selected.
 * Returns pre-filled dosage, frequency, and duration.
 */
export function getMedicationDefaults(medicationName: string): { dosage: string; frequency: string; duration: string } | null {
  const normalized = medicationName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const entry = MEDICATION_CATALOG.find(m => 
    m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalized
  );
  
  if (!entry) return null;
  
  return {
    dosage: entry.defaultDosage,
    frequency: entry.defaultFrequency,
    duration: entry.defaultDuration,
  };
}
