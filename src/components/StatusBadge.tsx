import React from 'react';
import { Clock, Play, Pause, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { HearingStatus, DossierStatus } from '../types';
import { STAGE_MAP } from '../store/useDossierStore';

interface Props {
  type: 'hearing' | 'dossier' | 'escort' | 'approval' | 'transcript' | 'detention';
  status: string;
}

const HEARING_CONFIG: Record<HearingStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: '未开庭', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: Clock },
  ongoing: { label: '审理中', color: 'bg-court-green/20 text-court-green border-court-green/40', icon: Play },
  recess: { label: '休庭', color: 'bg-court-orange/20 text-court-orange border-court-orange/40', icon: Pause },
  closed: { label: '闭庭', color: 'bg-court-blue/20 text-court-blue border-court-blue/40', icon: CheckCircle },
};

const ESCORT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planned: { label: '待执行', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: Clock },
  in_progress: { label: '押解中', color: 'bg-court-blue/20 text-court-blue border-court-blue/40', icon: Play },
  completed: { label: '已完成', color: 'bg-court-green/20 text-court-green border-court-green/40', icon: CheckCircle },
  overdue: { label: '超期未归', color: 'bg-court-red/20 text-court-red border-court-red/40 animate-pulse', icon: AlertTriangle },
};

const APPROVAL_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'bg-court-orange/20 text-court-orange border-court-orange/40' },
  approved: { label: '已通过', color: 'bg-court-green/20 text-court-green border-court-green/40' },
  rejected: { label: '已驳回', color: 'bg-court-red/20 text-court-red border-court-red/40' },
};

const TRANSCRIPT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: '草稿', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: Clock },
  complete: { label: '完整', color: 'bg-court-green/20 text-court-green border-court-green/40', icon: CheckCircle },
  pending_revision: { label: '待补录', color: 'bg-court-orange/20 text-court-orange border-court-orange/40', icon: AlertTriangle },
};

const DETENTION_CONFIG: Record<string, { label: string; color: string }> = {
  occupied: { label: '使用中', color: 'bg-court-green/20 text-court-green border-court-green/40' },
  empty: { label: '空闲', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  maintenance: { label: '维护中', color: 'bg-court-orange/20 text-court-orange border-court-orange/40' },
};

function getDossierColor(status: DossierStatus): string {
  if (status.includes('rejected')) return 'bg-court-red/20 text-court-red border-court-red/40';
  if (status === 'approved' || status === 'archived') return 'bg-court-green/20 text-court-green border-court-green/40';
  return 'bg-court-blue/20 text-court-blue border-court-blue/40';
}

export const StatusBadge: React.FC<Props> = ({ type, status }) => {
  if (type === 'hearing') {
    const cfg = HEARING_CONFIG[status as HearingStatus];
    const Icon = cfg.icon;
    return (
      <span className={`status-badge border ${cfg.color}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    );
  }
  if (type === 'escort') {
    const cfg = ESCORT_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span className={`status-badge border ${cfg.color}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    );
  }
  if (type === 'approval') {
    const cfg = APPROVAL_CONFIG[status];
    return <span className={`status-badge border ${cfg.color}`}>{cfg.label}</span>;
  }
  if (type === 'transcript') {
    const cfg = TRANSCRIPT_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span className={`status-badge border ${cfg.color}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    );
  }
  if (type === 'detention') {
    const cfg = DETENTION_CONFIG[status];
    return <span className={`status-badge border ${cfg.color}`}>{cfg.label}</span>;
  }
  if (type === 'dossier') {
    const label = STAGE_MAP[status as DossierStatus] || status;
    const color = getDossierColor(status as DossierStatus);
    const isRejected = status.includes('rejected');
    return (
      <span className={`status-badge border ${color}`}>
        {isRejected && <XCircle size={12} />}
        {label}
      </span>
    );
  }
  return null;
};
