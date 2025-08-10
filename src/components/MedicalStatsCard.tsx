import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MedicalStatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  className?: string;
}

const colorVariants = {
  blue: 'from-blue-600 to-cyan-600',
  green: 'from-green-600 to-emerald-600',
  purple: 'from-purple-600 to-pink-600',
  orange: 'from-orange-600 to-red-600',
  red: 'from-red-600 to-rose-600',
  cyan: 'from-cyan-600 to-teal-600'
};

const iconColorVariants = {
  blue: 'text-blue-200',
  green: 'text-green-200',
  purple: 'text-purple-200',
  orange: 'text-orange-200',
  red: 'text-red-200',
  cyan: 'text-cyan-200'
};

const subtitleColorVariants = {
  blue: 'text-blue-100',
  green: 'text-green-100',
  purple: 'text-purple-100',
  orange: 'text-orange-100',
  red: 'text-red-100',
  cyan: 'text-cyan-100'
};

export default function MedicalStatsCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
  className = ''
}: MedicalStatsCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className={`bg-gradient-to-r ${colorVariants[color]} rounded-2xl p-6 text-white transition-all duration-300 hover:scale-105 hover:shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className={`${subtitleColorVariants[color]} text-sm font-medium`}>
            {title}
          </p>
          <p className="text-3xl font-bold mt-1">
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className={`${subtitleColorVariants[color]} text-xs mt-1`}>
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <Icon className={`h-12 w-12 ${iconColorVariants[color]}`} />
        </div>
      </div>

      {trend && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <span className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${trend.isPositive ? 'bg-white/20 text-white' : 'bg-black/20 text-gray-200'}
            `}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className={`ml-2 ${subtitleColorVariants[color]}`}>
              {trend.period}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}