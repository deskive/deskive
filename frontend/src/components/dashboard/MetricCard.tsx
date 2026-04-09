import React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  trend,
  className,
}) => {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={cn('p-2 rounded-lg', iconBgColor)}>
            <Icon className={cn('w-6 h-6', iconColor)} />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center gap-2">
              <p className={cn('text-2xl font-bold', iconColor)}>{value}</p>
              {trend && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {trend.isPositive ? '+' : ''}{trend.value}%
                  </span>
                  {trend.label && (
                    <span className="text-gray-500 font-normal">
                      {trend.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;