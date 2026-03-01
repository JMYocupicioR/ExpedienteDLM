import { Stethoscope, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicDoctor } from '@/lib/services/publicDoctorService';
import StarRating from './StarRating';

type DoctorCardProps = {
  doctor: PublicDoctor;
};

export default function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <Link
      to={`/medicos/${doctor.id}`}
      className="block rounded-lg border border-slate-800 bg-slate-900 p-4 text-slate-200 transition hover:border-slate-700 hover:bg-slate-800/80"
    >
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-700">
          {doctor.public_photo_url ? (
            <img
              src={doctor.public_photo_url}
              alt={doctor.full_name || 'Médico'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Stethoscope className="h-7 w-7 text-slate-500" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">{doctor.full_name || 'Médico'}</h3>
          {doctor.specialty && (
            <p className="mt-0.5 text-sm text-cyan-400">{doctor.specialty}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <StarRating rating={doctor.average_rating ?? 0} size="sm" />
            {doctor.review_count != null && doctor.review_count > 0 && (
              <span className="text-xs text-slate-500">({doctor.review_count})</span>
            )}
          </div>
          {doctor.public_address && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{doctor.public_address}</span>
            </p>
          )}
          {doctor.consultation_fee != null && (
            <p className="mt-1 text-xs text-slate-500">
              Consulta desde ${Number(doctor.consultation_fee).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
