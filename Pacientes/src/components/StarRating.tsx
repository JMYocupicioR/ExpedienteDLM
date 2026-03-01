import { Star } from 'lucide-react';

type StarRatingProps = {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  /** When set, allows user to select rating (interactive) */
  interactive?: boolean;
  value?: number;
  onChange?: (rating: number) => void;
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export default function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  interactive = false,
  value,
  onChange,
}: StarRatingProps) {
  const displayRating = interactive ? (value ?? 0) : rating;
  const sz = sizeClasses[size];

  if (interactive) {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onKeyDown={(e) => e.key === 'Enter' && onChange?.(star)}
            className="p-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded"
            aria-label={`${star} estrellas`}
          >
            <Star
              className={`${sz} transition-colors ${
                star <= displayRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => (
          <Star
            key={i}
            className={`${sz} ${
              i < Math.floor(displayRating)
                ? 'fill-amber-400 text-amber-400'
                : i < displayRating
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'text-slate-500'
            }`}
          />
        ))}
      </div>
      {displayRating > 0 && (
        <span className="text-sm text-slate-400 ml-1">
          {displayRating % 1 === 0 ? displayRating : displayRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
