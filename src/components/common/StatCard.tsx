import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple';
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  variant = 'default',
  className,
}: StatCardProps) {
  const iconBgClasses = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };

  return (
    <Card className={cn('border-border/80 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <div className="text-[1.65rem] font-semibold tracking-[-0.035em] text-foreground">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <div className="flex items-center gap-1 text-xs font-medium mt-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded px-1.5 py-0.5',
                    trend.isPositive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                  )}
                >
                  {trend.isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  )}
                  {Math.abs(trend.value)}%
                </span>
                {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('p-2.5 rounded-xl shrink-0', iconBgClasses[variant])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
