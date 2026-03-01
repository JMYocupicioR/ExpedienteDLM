import { supabase } from '@/lib/supabase';

export type PublicDoctor = {
  id: string;
  full_name: string | null;
  specialty: string | null;
  license_number: string | null;
  public_bio: string | null;
  consultation_fee: number | null;
  public_languages: string[] | null;
  public_address: string | null;
  public_photo_url: string | null;
  accepts_appointments: boolean | null;
  clinic_id: string | null;
  average_rating?: number;
  review_count?: number;
};

export type DoctorReview = {
  id: string;
  doctor_id: string;
  patient_user_id: string;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  is_verified: boolean;
  created_at: string;
};

export const publicDoctorService = {
  /**
   * Search public doctors by specialty and/or query (name).
   */
  async searchDoctors(filters?: {
    specialty?: string;
    query?: string;
    language?: string;
  }): Promise<PublicDoctor[]> {
    let q = supabase
      .from('profiles')
      .select('id,full_name,specialty,license_number,public_bio,consultation_fee,public_languages,public_address,public_photo_url,accepts_appointments,clinic_id')
      .eq('is_profile_public', true)
      .eq('role', 'doctor')
      .eq('is_active', true);

    if (filters?.specialty?.trim()) {
      q = q.ilike('specialty', `%${filters.specialty.trim()}%`);
    }
    if (filters?.query?.trim()) {
      const term = filters.query.trim().replace(/%/g, '');
      q = q.or(`full_name.ilike.%${term}%,specialty.ilike.%${term}%`);
    }
    if (filters?.language?.trim()) {
      q = q.contains('public_languages', [filters.language.trim().toLowerCase()]);
    }

    const { data, error } = await q.order('full_name');
    if (error) throw error;

    const doctors = (data || []) as PublicDoctor[];
    const withRatings = await Promise.all(
      doctors.map(async (d) => {
        const { avg, count } = await this.getDoctorRatingSummary(d.id);
        return { ...d, average_rating: avg, review_count: count };
      }),
    );
    return withRatings;
  },

  /**
   * Get a single public doctor profile with rating summary.
   */
  async getDoctorProfile(doctorId: string): Promise<PublicDoctor | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,specialty,license_number,public_bio,consultation_fee,public_languages,public_address,public_photo_url,accepts_appointments,clinic_id')
      .eq('id', doctorId)
      .eq('is_profile_public', true)
      .maybeSingle();

    if (error || !data) return null;

    const summary = await this.getDoctorRatingSummary(doctorId);
    return {
      ...(data as PublicDoctor),
      average_rating: summary.avg,
      review_count: summary.count,
    };
  },

  /**
   * Get average rating and count for a doctor.
   */
  async getDoctorRatingSummary(doctorId: string): Promise<{ avg: number; count: number }> {
    const { data, error } = await supabase
      .from('doctor_reviews')
      .select('rating')
      .eq('doctor_id', doctorId);

    if (error) return { avg: 0, count: 0 };
    const reviews = (data || []) as { rating: number }[];
    if (reviews.length === 0) return { avg: 0, count: 0 };
    const sum = reviews.reduce((a, r) => a + r.rating, 0);
    return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
  },

  /**
   * Get paginated reviews for a doctor.
   */
  async getDoctorReviews(
    doctorId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DoctorReview[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const { data, error } = await supabase
      .from('doctor_reviews')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []) as DoctorReview[];
  },

  /**
   * Submit a review (requires authenticated patient).
   */
  async submitReview(params: {
    doctorId: string;
    rating: number;
    comment?: string;
    isAnonymous?: boolean;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión para calificar');

    const { error } = await supabase.from('doctor_reviews').upsert(
      {
        doctor_id: params.doctorId,
        patient_user_id: user.id,
        rating: params.rating,
        comment: params.comment?.trim() || null,
        is_anonymous: params.isAnonymous ?? false,
        is_verified: false,
      },
      { onConflict: 'doctor_id,patient_user_id' }
    );
    if (error) throw error;
  },

  /**
   * Get available appointment slots for a public doctor (uses RPC).
   */
  async getDoctorAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_public_doctor_available_slots', {
      p_doctor_id: doctorId,
      p_date: date,
    });
    if (error) throw error;
    const slots = (data || []) as Array<{ slot_time: string }>;
    return slots
      .map((s) => {
        const t = s.slot_time;
        if (typeof t === 'string') return t.slice(0, 5);
        return '';
      })
      .filter(Boolean);
  },
};
