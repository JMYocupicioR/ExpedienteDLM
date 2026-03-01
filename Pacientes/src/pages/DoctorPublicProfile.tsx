import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  MapPin,
  Globe,
  Award,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import StarRating from '@/components/StarRating';
import PublicAppointmentBooking from '@/features/booking/PublicAppointmentBooking';
import { publicDoctorService, type PublicDoctor, type DoctorReview } from '@/lib/services/publicDoctorService';
import { usePatientAuth } from '@/context/PatientAuthContext';

export default function DoctorPublicProfile() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { user } = usePatientAuth();
  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAnonymous, setReviewAnonymous] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      publicDoctorService.getDoctorProfile(doctorId),
      publicDoctorService.getDoctorReviews(doctorId, { limit: 20 }),
    ])
      .then(([profile, revs]) => {
        setDoctor(profile ?? null);
        setReviews(revs);
      })
      .catch((err) => {
        setError(err.message || 'Error al cargar perfil');
        setDoctor(null);
        setReviews([]);
      })
      .finally(() => setLoading(false));
  }, [doctorId]);

  const handleSubmitReview = async () => {
    if (!doctorId) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await publicDoctorService.submitReview({
        doctorId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
        isAnonymous: reviewAnonymous,
      });
      setShowReviewForm(false);
      setReviewComment('');
      const [profile, revs] = await Promise.all([
        publicDoctorService.getDoctorProfile(doctorId),
        publicDoctorService.getDoctorReviews(doctorId, { limit: 20 }),
      ]);
      setDoctor(profile ?? null);
      setReviews(revs);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Error al enviar reseña');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8">
        <button
          onClick={() => navigate('/medicos')}
          className="mb-4 flex items-center gap-1 text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Volver al directorio
        </button>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
          {error || 'Médico no encontrado.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <button
          onClick={() => navigate('/medicos')}
          className="mb-4 flex items-center gap-1 text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Volver al directorio
        </button>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-700">
              {doctor.public_photo_url ? (
                <img
                  src={doctor.public_photo_url}
                  alt={doctor.full_name || 'Médico'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Stethoscope className="h-12 w-12 text-slate-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">{doctor.full_name || 'Médico'}</h1>
              {doctor.specialty && (
                <p className="mt-1 text-cyan-400">{doctor.specialty}</p>
              )}
              {doctor.license_number && (
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                  <Award className="h-4 w-4" />
                  Cédula: {doctor.license_number}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <StarRating rating={doctor.average_rating ?? 0} size="md" />
                {doctor.review_count != null && doctor.review_count > 0 && (
                  <span className="text-sm text-slate-500">
                    {doctor.review_count} {doctor.review_count === 1 ? 'reseña' : 'reseñas'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {doctor.public_bio && (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold text-slate-200">Sobre mí</h2>
              <p className="text-slate-400">{doctor.public_bio}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-4">
            {doctor.public_address && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-cyan-400" />
                {doctor.public_address}
              </div>
            )}
            {doctor.public_languages && doctor.public_languages.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Globe className="h-4 w-4 text-cyan-400" />
                {doctor.public_languages.join(', ')}
              </div>
            )}
            {doctor.consultation_fee != null && (
              <p className="text-sm text-slate-400">
                Consulta desde ${Number(doctor.consultation_fee).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {doctor.accepts_appointments !== false && (
          <div className="mt-6">
            <PublicAppointmentBooking
              doctorId={doctor.id}
              doctorName={doctor.full_name || 'Médico'}
              clinicId={doctor.clinic_id}
            />
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-200">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            Reseñas
          </h2>

          {user && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="mb-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Dejar reseña
            </button>
          )}

          {!user && (
            <p className="mb-4 text-sm text-slate-500">
              <button
                onClick={() => navigate('/auth', { state: { from: `/medicos/${doctorId}` } })}
                className="text-cyan-400 hover:underline"
              >
                Inicia sesión
              </button>{' '}
              para dejar una reseña.
            </p>
          )}

          {showReviewForm && (
            <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 font-medium text-slate-200">Tu reseña</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Calificación</label>
                  <StarRating
                    rating={0}
                    interactive
                    value={reviewRating}
                    onChange={setReviewRating}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Comentario (opcional)</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Cuéntanos tu experiencia..."
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
                    rows={3}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={reviewAnonymous}
                    onChange={(e) => setReviewAnonymous(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  Publicar de forma anónima
                </label>
                {reviewError && (
                  <p className="text-sm text-red-400">{reviewError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {submittingReview ? 'Enviando...' : 'Enviar reseña'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewError(null);
                    }}
                    className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-slate-500">Aún no hay reseñas.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <StarRating rating={r.rating} size="sm" />
                    <span className="text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleDateString('es-MX')}
                      {r.is_verified && (
                        <span className="ml-2 text-cyan-400">Verificado</span>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {r.is_anonymous ? 'Paciente anónimo' : 'Paciente'}
                  </p>
                  {r.comment && (
                    <p className="mt-1 text-slate-400">{r.comment}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
