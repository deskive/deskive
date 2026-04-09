import { Star } from 'lucide-react';
import { useState } from 'react';

interface RatingStarsProps {
  rating: number;
  ratingCount?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingStars({
  rating,
  ratingCount,
  onRate,
  readonly = false,
  size = 'md',
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (value: number) => {
    if (!readonly && onRate) {
      onRate(value);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= displayRating;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleClick(value)}
              onMouseEnter={() => !readonly && setHoverRating(value)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
              disabled={readonly}
              className={`
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                transition-transform duration-200
                ${isFilled ? 'text-yellow-400' : 'text-gray-300'}
              `}
            >
              <Star
                className={`${sizeClasses[size]} ${isFilled ? 'fill-current' : ''}`}
              />
            </button>
          );
        })}
      </div>
      {ratingCount !== undefined && (
        <span className="text-sm text-gray-600">
          {rating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
        </span>
      )}
    </div>
  );
}
