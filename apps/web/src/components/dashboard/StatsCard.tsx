import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type ColorVariant = 'blue' | 'green' | 'yellow' | 'purple';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color?: ColorVariant;
}

const colorMap: Record<ColorVariant, { border: string; dot: string; iconText: string }> = {
  blue:   { border: 'border-l-blue-500',   dot: 'bg-blue-500',   iconText: 'text-blue-500' },
  green:  { border: 'border-l-green-500',  dot: 'bg-green-500',  iconText: 'text-green-500' },
  yellow: { border: 'border-l-yellow-500', dot: 'bg-yellow-500', iconText: 'text-yellow-500' },
  purple: { border: 'border-l-purple-500', dot: 'bg-purple-500', iconText: 'text-purple-500' },
};

const changeColors = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-slate-400',
};

const ChangeIcon = ({ type }: { type: 'positive' | 'negative' | 'neutral' }) => {
  if (type === 'positive') return <TrendingUp className="w-3 h-3" />;
  if (type === 'negative') return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  color = 'blue',
}: StatsCardProps) {
  const styles = colorMap[color];

  return (
    <div className={`card p-5 border-l-4 ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
              {title}
            </p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${changeColors[changeType]}`}>
              <ChangeIcon type={changeType} />
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 ${styles.iconText}`}>{icon}</div>
      </div>
    </div>
  );
}
