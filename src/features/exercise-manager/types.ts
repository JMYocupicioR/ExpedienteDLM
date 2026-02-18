// ============================================================
// Exercise Manager – shared types
// ============================================================

export type Difficulty = 'easy' | 'medium' | 'hard';
export type MediaType = 'video' | 'image' | 'gif';

// --- Taxonomy ------------------------------------------------

export interface TaxonomyType {
  id: string;
  code: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface TaxonomyTerm {
  id: string;
  type_id: string;
  parent_id: string | null;
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
}

/** Grouped structure used by the UI filter panel */
export interface TaxonomyGroup {
  type: TaxonomyType;
  terms: TaxonomyTerm[];
}

// --- Exercise ------------------------------------------------

export interface Exercise {
  id: string;
  doctor_id: string | null;
  clinic_id: string | null;
  name: string;
  description: string | null;
  category: string;
  body_area: string | null;
  difficulty: Difficulty | null;
  media_type: MediaType | null;
  media_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  repetitions: number | null;
  sets: number | null;
  instructions: string[] | null;
  tags: string[] | null;
  is_global: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Exercise with its taxonomy term ids resolved */
export interface ExerciseWithTaxonomy extends Exercise {
  taxonomy_term_ids: string[];
}

/** Payload for creating / updating an exercise */
export interface ExerciseFormData {
  name: string;
  description: string;
  category: string;
  body_area: string;
  difficulty: Difficulty;
  media_type: MediaType | null;
  media_url: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  repetitions: number | null;
  sets: number | null;
  instructions: string[];
  is_global: boolean;
  taxonomy_term_ids: string[];
}

// --- Assignment ----------------------------------------------

export interface Patient {
  id: string;
  full_name: string | null;
}

export type AssignmentFrequency = 'daily' | '3x_week' | '2x_week' | '5x_week' | 'weekly' | 'as_needed';

export interface AssignmentPayload {
  exercise_id: string;
  patient_id: string;
  frequency: AssignmentFrequency;
  sets: number | null;
  repetitions: number | null;
  start_date: string;
  end_date: string | null;
  notes: string;
}

// --- Filter state used by the browser ------------------------

export interface ExerciseFilters {
  search: string;
  /** term ids grouped: filters are OR within a type, AND across types */
  selectedTermIds: Set<string>;
  difficulty: Difficulty | null;
}
