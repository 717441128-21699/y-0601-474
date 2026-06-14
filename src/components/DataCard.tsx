import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  subtitle?: string;
  color?: 'gold' | 'blue' | 'green' | 'red' | 'orange';
}

const COLOR_MAP = {
  gold: 'from-court-gold/20 to-court-gold/5 text-court-goldLight border-court-gold/30',
  blue: 'from-court-blue/20 to-court-blue/5 text-court-blue border-court-blue/30',
  green: 'from-court-green/20 to-court-green/5 text-court-green border-court-green/30',
  red: 'from-court-red/20 to-court-red/5 text-court-red border-court-red/30',
  orange: 'from-court-orange/20 to-court-orange/5 text-court-orange border-court-orange/30',
};

const SHADOW_MAP = {
  gold: 'shadow-glow-gold',
  blue: 'shadow-glow-blue',
  green: 'shadow-glow-green',
  red: 'shadow-glow-red',
  orange: '',
};

export const DataCard: React.FC<Props> = ({ title, value, icon: Icon, trend, subtitle, color = 'gold' }) => {
  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${COLOR_MAP[color]} border hover:${SHADOW_MAP[color]} transition-all duration-300`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold font-serif">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-black/20`}>
          <Icon size={24} />
        </div>
      </div>
      {typeof trend === 'number' && (
        <div className="flex items-center gap-1 text-xs">
          <span className={trend >= 0 ? 'text-court-green' : 'text-court-red'}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-slate-500">较上周</span>
        </div>
      )}
    </div>
  );
};
