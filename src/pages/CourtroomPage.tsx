import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Filter,
  Calendar,
  Clock,
  Gavel,
  Users,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  Search,
  Info,
  Star,
  Sparkles,
  Monitor,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useCourtStore } from '../store/useCourtStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDetentionStore } from '../store/useDetentionStore';
import { useDossierStore } from '../store/useDossierStore';
import { CourtScene3D } from '../components/three/CourtScene3D';
import type {
  CourtCase,
  CaseType,
  HearingStatus,
  Approval,
  ApprovalStage,
  UserRole,
  PriorityLevel,
  Dossier,
} from '../types';

const STAGE_LABELS: Record<ApprovalStage, { label: string; level: number }> = {
  judge: { label: '法官审批', level: 1 },
  chief: { label: '庭长审批', level: 2 },
  president: { label: '院长审批', level: 3 },
};

const ROLE_STAGE_MAP: Record<UserRole, ApprovalStage> = {
  judge: 'judge',
  chief: 'chief',
  president: 'president',
  clerk: 'judge',
};

const CASE_TYPE_LABELS: Record<CaseType, string> = {
  criminal: '刑事案件',
  civil: '民事案件',
  administrative: '行政案件',
};

const PRIORITY_LABELS: Record<PriorityLevel, { label: string; color: string }> = {
  high: { label: '高', color: 'text-court-red' },
  medium: { label: '中', color: 'text-court-orange' },
  low: { label: '低', color: 'text-slate-400' },
};

const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const hour = 8 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const STATUS_COLORS: Record<HearingStatus, string> = {
  closed: 'bg-court-green shadow-[0_4px_20px_rgba(16,185,129,0.3)]',
  ongoing: 'bg-court-blue shadow-[0_4px_20px_rgba(59,130,246,0.3)]',
  recess: 'bg-court-orange shadow-[0_4px_20px_rgba(245,158,11,0.3)]',
  pending: 'bg-slate-500 shadow-[0_4px_20px_rgba(148,163,184,0.3)]',
};

interface ScheduleFormData {
  caseNumber: string;
  type: CaseType;
  priority: PriorityLevel;
  plaintiff: string;
  defendant: string;
  chiefJudge: string;
  scheduledDate: string;
  scheduledTime: string;
  courtroomId: string;
  equipment: string[];
}

interface CourtRecommendation {
  courtroom: import('../types').Courtroom;
  score: number;
  reason: string;
  equipment: string[];
}

export const CourtroomPage: React.FC = () => {
  const {
    cases,
    courtrooms,
    approvals,
    scheduleAnimationActive,
    selectedCourtroom,
    selectedCase,
    setSelectedCourtroom,
    setSelectedCase,
    approveAtStage,
    requestNewSchedule,
    recommendCourtroom,
    canApproveAtStage: storeCanApproveAtStage,
    detectConflict,
    isHighHighConflict,
  } = useCourtStore();

  const { currentUser, checkPermission } = useAuthStore();
  const { rooms: detentionRooms, missions } = useDetentionStore();
  const { getDossiersByCourtroom, setSelectedDossier } = useDossierStore();

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCaseTypeFilter, setShowCaseTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [caseTypeFilter, setCaseTypeFilter] = useState<CaseType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<HearingStatus | 'all'>('all');
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [courtroomDetailTab, setCourtroomDetailTab] = useState<'schedule' | 'dossiers'>('schedule');

  const [recommendation, setRecommendation] = useState<CourtRecommendation | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{
    hasConflict: boolean;
    isHighHigh: boolean;
    conflictingCase?: CourtCase;
  }>({ hasConflict: false, isHighHigh: false });

  const [formData, setFormData] = useState<ScheduleFormData>({
    caseNumber: '',
    type: 'civil',
    priority: 'medium',
    plaintiff: '',
    defendant: '',
    chiefJudge: currentUser?.name || '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    courtroomId: courtrooms.find((c) => c.status === 'available')?.id || 'cr3',
    equipment: [],
  });

  useEffect(() => {
    if (scheduleAnimationActive) {
      const newParticles = Array.from({ length: 40 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [scheduleAnimationActive]);

  useEffect(() => {
    if (!showScheduleModal) return;

    const timeStr = `${formData.scheduledDate} ${formData.scheduledTime}:00`;
    const rec = recommendCourtroom(
      formData.type,
      formData.priority,
      timeStr,
      formData.chiefJudge
    );
    setRecommendation(rec);
  }, [
    showScheduleModal,
    formData.type,
    formData.priority,
    formData.scheduledDate,
    formData.scheduledTime,
    formData.chiefJudge,
    recommendCourtroom,
  ]);

  useEffect(() => {
    if (!showScheduleModal) {
      setConflictInfo({ hasConflict: false, isHighHigh: false });
      return;
    }

    const timeStr = `${formData.scheduledDate} ${formData.scheduledTime}:00`;
    const conflict = detectConflict(formData.type, formData.priority, timeStr);
    const isHighHigh = isHighHighConflict(formData.type, formData.priority, timeStr);

    setConflictInfo({
      hasConflict: !!conflict,
      isHighHigh,
      conflictingCase: conflict || undefined,
    });
  }, [
    showScheduleModal,
    formData.type,
    formData.priority,
    formData.scheduledDate,
    formData.scheduledTime,
    detectConflict,
    isHighHighConflict,
  ]);

  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.result === 'pending'),
    [approvals]
  );

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (caseTypeFilter !== 'all' && c.type !== caseTypeFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [cases, caseTypeFilter, statusFilter]);

  const courtroomRows = useMemo(() => {
    return courtrooms.map((cr) => {
      const activeCase = cases.find(
        (c) => c.courtroomId === cr.id && c.status !== 'closed'
      );
      const activeCaseFull = activeCase
        ? cases.find((c) => c.id === activeCase.id)
        : null;
      return {
        courtroom: cr,
        activeCase: activeCaseFull,
      };
    });
  }, [courtrooms, cases]);

  const escortPaths = useMemo(
    () =>
      missions
        .filter((m) => m.status === 'in_progress' || m.status === 'overdue')
        .map((m) => ({
          missionId: m.id,
          points: m.pathPoints,
          progress: m.progress,
          alarm: m.status === 'overdue',
        })),
    [missions]
  );

  const todayCases = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('zh-CN');
    return cases.filter((c) => {
      const caseDate = new Date(c.scheduledTime).toLocaleDateString('zh-CN');
      return caseDate === todayStr;
    });
  }, [cases]);

  const courtroomDossiers = useMemo(() => {
    if (!selectedCourtroom) return [];
    return getDossiersByCourtroom(selectedCourtroom.id);
  }, [selectedCourtroom, getDossiersByCourtroom]);

  const getCaseTimePosition = (c: CourtCase) => {
    try {
      const date = new Date(c.scheduledTime);
      const hour = date.getHours();
      const minute = date.getMinutes();
      if (hour < 8 || hour > 18) return null;
      const totalMinutes = (hour - 8) * 60 + minute;
      const percent = (totalMinutes / (10 * 60)) * 100;
      const durationPercent = (c.estimatedDuration / (10 * 60)) * 100;
      return {
        left: `${Math.min(percent, 100)}%`,
        width: `${Math.min(durationPercent, 100 - percent)}%`,
      };
    } catch {
      return null;
    }
  };

  const renderStars = (score: number) => {
    const stars = Math.round((score / 100) * 5);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            className={i <= stars ? 'text-court-gold fill-court-gold' : 'text-slate-600'}
          />
        ))}
      </div>
    );
  };

  const handleUseRecommendation = () => {
    if (!recommendation) return;
    setFormData((prev) => ({
      ...prev,
      courtroomId: recommendation.courtroom.id,
      equipment: recommendation.equipment,
    }));
  };

  const getStageRoleLabel = (stage: ApprovalStage): string => {
    const roleMap: Record<ApprovalStage, string> = {
      judge: '法官',
      chief: '庭长',
      president: '院长',
    };
    return roleMap[stage];
  };

  const handleApprove = (approval: Approval, stage: ApprovalStage, result: 'approved' | 'rejected') => {
    const comment = approvalComments[approval.id] || '';
    approveAtStage(approval.id, stage, comment, result);
    setApprovalComments((prev) => ({ ...prev, [approval.id]: '' }));
  };

  const handleSubmitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    requestNewSchedule({
      caseNumber: formData.caseNumber,
      type: formData.type,
      title: `${CASE_TYPE_LABELS[formData.type]} - ${formData.plaintiff}诉${formData.defendant}`,
      parties: {
        plaintiff: formData.plaintiff,
        defendant: formData.defendant,
      },
      panel: {
        chiefJudge: formData.chiefJudge,
        judges: [],
        clerk: currentUser?.role === 'clerk' ? currentUser.name : '',
      },
      priority: formData.priority,
      scheduledTime: `${formData.scheduledDate} ${formData.scheduledTime}:00`,
      estimatedDuration: 60,
      courtroomId: formData.courtroomId,
      equipment: formData.equipment,
    });
    setShowScheduleModal(false);
    setFormData({
      caseNumber: '',
      type: 'civil',
      priority: 'medium',
      plaintiff: '',
      defendant: '',
      chiefJudge: currentUser?.name || '',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00',
      courtroomId: courtrooms.find((c) => c.status === 'available')?.id || 'cr3',
      equipment: [],
    });
    setRecommendation(null);
    setConflictInfo({ hasConflict: false, isHighHigh: false });
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <style>{`
        @keyframes particleFloat {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translateY(-10px) scale(1); }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) scale(0.3); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(201,168,108,0.3); }
          50% { box-shadow: 0 0 25px rgba(201,168,108,0.6); }
        }
        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes goldHighlight {
          0% { box-shadow: 0 0 0 rgba(201,168,108,0); }
          20% { box-shadow: 0 0 30px rgba(201,168,108,0.8), 0 0 60px rgba(201,168,108,0.4); }
          40% { box-shadow: 0 0 20px rgba(201,168,108,0.6), 0 0 40px rgba(201,168,108,0.3); }
          60% { box-shadow: 0 0 30px rgba(201,168,108,0.8), 0 0 60px rgba(201,168,108,0.4); }
          80% { box-shadow: 0 0 20px rgba(201,168,108,0.6), 0 0 40px rgba(201,168,108,0.3); }
          100% { box-shadow: 0 0 0 rgba(201,168,108,0); }
        }
        .particle {
          animation: particleFloat 3s ease-out forwards;
        }
        .schedule-block {
          transform-style: preserve-3d;
          transition: transform 0.2s ease;
        }
        .schedule-block:hover {
          transform: translateY(-2px) rotateX(5deg);
        }
        .schedule-block.gold-highlight {
          animation: goldHighlight 3s ease-out;
          ring: 3px solid rgba(201,168,108,0.8);
        }
        .timeline-track::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(201,168,108,0.1) 0%, transparent 100%);
          pointer-events: none;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-court-gold to-court-goldLight flex items-center justify-center shadow-glow-gold">
            <Gavel className="text-court-bg" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-court-goldLight tracking-wide">
              庭审调度系统
            </h1>
            <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                setShowCaseTypeFilter(!showCaseTypeFilter);
                setShowStatusFilter(false);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Filter size={16} />
              案件类型
              <ChevronDown
                size={14}
                className={`transition-transform ${showCaseTypeFilter ? 'rotate-180' : ''}`}
              />
            </button>
            {showCaseTypeFilter && (
              <div className="absolute right-0 top-full mt-2 w-44 glass-panel py-2 z-50 animate-[slideInUp_0.2s_ease-out]">
                <button
                  onClick={() => {
                    setCaseTypeFilter('all');
                    setShowCaseTypeFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-court-gold/10 transition-colors ${
                    caseTypeFilter === 'all' ? 'text-court-gold' : 'text-slate-300'
                  }`}
                >
                  全部类型
                </button>
                {(Object.keys(CASE_TYPE_LABELS) as CaseType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setCaseTypeFilter(t);
                      setShowCaseTypeFilter(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-court-gold/10 transition-colors ${
                      caseTypeFilter === t ? 'text-court-gold' : 'text-slate-300'
                    }`}
                  >
                    {CASE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowStatusFilter(!showStatusFilter);
                setShowCaseTypeFilter(false);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Filter size={16} />
              庭审状态
              <ChevronDown
                size={14}
                className={`transition-transform ${showStatusFilter ? 'rotate-180' : ''}`}
              />
            </button>
            {showStatusFilter && (
              <div className="absolute right-0 top-full mt-2 w-40 glass-panel py-2 z-50 animate-[slideInUp_0.2s_ease-out]">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setShowStatusFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-court-gold/10 transition-colors ${
                    statusFilter === 'all' ? 'text-court-gold' : 'text-slate-300'
                  }`}
                >
                  全部状态
                </button>
                {(['pending', 'ongoing', 'recess', 'closed'] as HearingStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setShowStatusFilter(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-court-gold/10 transition-colors ${
                      statusFilter === s ? 'text-court-gold' : 'text-slate-300'
                    }`}
                  >
                    {s === 'pending'
                      ? '未开庭'
                      : s === 'ongoing'
                      ? '审理中'
                      : s === 'recess'
                      ? '休庭'
                      : '闭庭'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            新建排期
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6 h-[calc(100vh-200px)]">
        <div className="col-span-2 glass-panel overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-border">
            <div className="w-2 h-2 rounded-full bg-court-green animate-pulse" />
            <span className="text-xs text-slate-300">实时3D视图</span>
          </div>
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-border">
            <Search size={12} className="text-slate-400" />
            <span className="text-xs text-slate-400">点击法庭/羁押室查看详情</span>
          </div>
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle absolute w-2 h-2 rounded-full bg-court-gold z-20"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
          <CourtScene3D
            courtrooms={courtrooms}
            cases={cases}
            detentionRooms={detentionRooms}
            escortPaths={escortPaths}
            selectedCourtroomId={selectedCourtroom?.id}
            selectedDetentionId={useDetentionStore.getState().selectedRoom?.id}
            onCourtroomClick={(id) => {
              const cr = courtrooms.find((x) => x.id === id);
              setSelectedCourtroom(cr || null);
              const activeCase = cases.find(
                (c) => c.courtroomId === id && c.status !== 'closed'
              );
              setSelectedCase(activeCase || null);
            }}
            onDetentionClick={(id) => {
              const dr = detentionRooms.find((x) => x.id === id);
              useDetentionStore.getState().setSelectedRoom(dr || null);
            }}
          />
        </div>

        <div className="col-span-3 flex flex-col gap-6 overflow-hidden">
          <div className="glass-panel flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-6 pt-5 border-b border-court-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCourtroomDetailTab('schedule')}
                  className={`section-title !border-b-2 !pb-4 !px-0 transition-colors ${
                    courtroomDetailTab === 'schedule'
                      ? '!text-court-gold !border-court-gold'
                      : '!text-slate-400 !border-transparent hover:!text-slate-300'
                  }`}
                >
                  <Gavel size={18} />
                  法庭排期列表
                </button>
                <button
                  onClick={() => setCourtroomDetailTab('dossiers')}
                  className={`section-title !border-b-2 !pb-4 !px-0 transition-colors ml-6 ${
                    courtroomDetailTab === 'dossiers'
                      ? '!text-court-gold !border-court-gold'
                      : '!text-slate-400 !border-transparent hover:!text-slate-300'
                  }`}
                >
                  <FolderOpen size={18} />
                  关联案卷
                  {selectedCourtroom && courtroomDossiers.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-court-gold/20 text-court-gold text-xs border border-court-gold/40">
                      {courtroomDossiers.length}
                    </span>
                  )}
                </button>
              </div>
              {courtroomDetailTab === 'schedule' && (
                <span className="text-xs font-sans text-slate-400">
                  共 {courtroomRows.length} 个法庭 · {filteredCases.length} 件案件
                </span>
              )}
            </div>

            {courtroomDetailTab === 'schedule' ? (
              <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-court-border">
                      <th className="text-left pb-3 font-medium">法庭名称</th>
                      <th className="text-left pb-3 font-medium">当前案件</th>
                      <th className="text-left pb-3 font-medium">当事人</th>
                      <th className="text-left pb-3 font-medium">审判长</th>
                      <th className="text-left pb-3 font-medium">状态</th>
                      <th className="text-right pb-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courtroomRows.map(({ courtroom, activeCase }) => (
                      <tr
                        key={courtroom.id}
                        className={`border-b border-court-border/50 hover:bg-court-gold/5 transition-colors cursor-pointer ${
                          selectedCourtroom?.id === courtroom.id ? 'bg-court-gold/10' : ''
                        }`}
                        onClick={() => {
                          setSelectedCourtroom(courtroom);
                          setSelectedCase(activeCase || null);
                        }}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                courtroom.status === 'occupied'
                                  ? 'bg-court-blue animate-pulse'
                                  : courtroom.status === 'available'
                                  ? 'bg-court-green'
                                  : 'bg-court-orange'
                              }`}
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-200">
                                {courtroom.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {courtroom.floor}楼 · {courtroom.capacity}座
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          {activeCase ? (
                            <div>
                              <p className="text-sm text-slate-200 font-mono">
                                {activeCase.caseNumber}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {activeCase.title}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-4">
                          {activeCase ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Users size={10} className="text-slate-500" />
                                <span className="text-slate-400">原:</span>
                                <span className="text-slate-300 truncate max-w-[80px]">
                                  {activeCase.parties.plaintiff}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Users size={10} className="text-slate-500" />
                                <span className="text-slate-400">被:</span>
                                <span className="text-slate-300 truncate max-w-[80px]">
                                  {activeCase.parties.defendant}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-4">
                          {activeCase ? (
                            <span className="text-sm text-slate-300">
                              {activeCase.panel.chiefJudge}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-4">
                          {activeCase ? (
                            <StatusBadge type="hearing" status={activeCase.status} />
                          ) : courtroom.status === 'maintenance' ? (
                            <span className="status-badge border bg-court-orange/20 text-court-orange border-court-orange/40">
                              维护中
                            </span>
                          ) : (
                            <span className="status-badge border bg-court-green/20 text-court-green border-court-green/40">
                              空闲
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourtroom(courtroom);
                              setSelectedCase(activeCase || null);
                            }}
                            className="px-3 py-1.5 text-xs text-court-gold border border-court-gold/40 rounded-lg hover:bg-court-gold/10 transition-colors inline-flex items-center gap-1"
                          >
                            <Info size={12} />
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
                {!selectedCourtroom ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
                    <FileText size={48} className="text-slate-600 mb-3" />
                    <p className="text-sm">请选择法庭查看关联案卷</p>
                  </div>
                ) : courtroomDossiers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
                    <FolderOpen size={48} className="text-slate-600 mb-3" />
                    <p className="text-sm">该法庭暂无关联网卷</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {selectedCourtroom.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">
                        {selectedCourtroom.name} · 共 {courtroomDossiers.length} 个案卷
                      </p>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-court-border">
                          <th className="text-left pb-3 font-medium">案卷名称</th>
                          <th className="text-left pb-3 font-medium">案号</th>
                          <th className="text-left pb-3 font-medium">状态</th>
                          <th className="text-left pb-3 font-medium">提交人</th>
                          <th className="text-left pb-3 font-medium">提交时间</th>
                          <th className="text-right pb-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courtroomDossiers.map((dossier) => (
                          <tr
                            key={dossier.id}
                            className="border-b border-court-border/50 hover:bg-court-gold/5 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedDossier(dossier);
                            }}
                          >
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-court-gold" />
                                <span className="text-sm text-slate-200">
                                  {dossier.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="text-xs text-slate-400 font-mono">
                                {dossier.caseNumber}
                              </span>
                            </td>
                            <td className="py-3">
                              <StatusBadge type="dossier" status={dossier.status} />
                            </td>
                            <td className="py-3">
                              <span className="text-xs text-slate-400">
                                {dossier.submittedBy}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="text-xs text-slate-400 font-mono">
                                {dossier.submittedAt}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDossier(dossier);
                                }}
                                className="px-3 py-1 text-xs text-court-gold border border-court-gold/40 rounded-lg hover:bg-court-gold/10 transition-colors inline-flex items-center gap-1"
                              >
                                <Info size={12} />
                                查看
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-panel flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="section-title px-6 pt-5">
              <AlertTriangle size={18} className="text-court-orange" />
              待审批冲突列表
              {pendingApprovals.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-court-red/20 text-court-red text-xs border border-court-red/40">
                  {pendingApprovals.length}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto px-6 pb-6 space-y-4">
              {pendingApprovals.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8">
                  <Check size={32} className="text-court-green/50 mb-2" />
                  <p className="text-sm">暂无待审批事项</p>
                </div>
              ) : (
                pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="border border-court-border rounded-xl p-5 bg-gradient-to-br from-court-card/80 to-court-panel/40 relative overflow-hidden"
                    style={{
                      boxShadow:
                        approval.currentStage === (currentUser && ROLE_STAGE_MAP[currentUser.role])
                          ? '0 0 20px rgba(201,168,108,0.15)'
                          : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-court-gold">
                            {approval.caseNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-full border ${
                              approval.type === 'schedule_conflict'
                                ? 'bg-court-red/15 text-court-red border-court-red/30'
                                : 'bg-court-blue/15 text-court-blue border-court-blue/30'
                            }`}
                          >
                            {approval.type === 'schedule_conflict'
                              ? '排期冲突'
                              : approval.type === 'dossier'
                              ? '案卷审批'
                              : '其他'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{approval.caseTitle}</p>
                        {approval.conflictDescription && (
                          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-court-red/10 border border-court-red/20">
                            <AlertTriangle
                              size={14}
                              className="text-court-red mt-0.5 flex-shrink-0"
                            />
                            <p className="text-xs text-court-red">
                              {approval.conflictDescription}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">提交时间</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {approval.createdAt}
                        </p>
                      </div>
                    </div>

                    <div className="relative mb-5">
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-court-border" />
                      <div className="flex justify-between relative">
                        {(['judge', 'chief', 'president'] as ApprovalStage[]).map((stage) => {
                          const stageInfo = STAGE_LABELS[stage];
                          const stageIndex = ['judge', 'chief', 'president'].indexOf(stage);
                          const currentIndex = ['judge', 'chief', 'president'].indexOf(
                            approval.currentStage
                          );
                          const isPast = stageIndex < currentIndex;
                          const isCurrent = stage === approval.currentStage;
                          const stageApproval = approval.timeline.find(
                            (t) => t.stage === stage
                          );

                          return (
                            <div key={stage} className="flex flex-col items-center z-10">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                  isCurrent
                                    ? 'bg-court-gold text-court-bg border-court-gold animate-[pulseGlow_2s_ease-in-out_infinite]'
                                    : isPast
                                    ? stageApproval?.result === 'approved'
                                      ? 'bg-court-green/20 text-court-green border-court-green/50'
                                      : 'bg-court-red/20 text-court-red border-court-red/50'
                                    : 'bg-court-card text-slate-500 border-court-border'
                                }`}
                              >
                                {isPast ? (
                                  stageApproval?.result === 'approved' ? (
                                    <Check size={16} />
                                  ) : (
                                    <X size={16} />
                                  )
                                ) : (
                                  stageInfo.level
                                )}
                              </div>
                              <p
                                className={`mt-2 text-xs font-medium ${
                                  isCurrent
                                    ? 'text-court-gold'
                                    : isPast
                                    ? 'text-slate-300'
                                    : 'text-slate-500'
                                }`}
                              >
                                {stageInfo.label}
                              </p>
                              {stageApproval && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {stageApproval.approver}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {storeCanApproveAtStage(approval.currentStage) ? (
                      <div className="border-t border-court-border pt-4 space-y-3">
                        <input
                          type="text"
                          placeholder="填写审批意见（可选）..."
                          value={approvalComments[approval.id] || ''}
                          onChange={(e) =>
                            setApprovalComments((prev) => ({
                              ...prev,
                              [approval.id]: e.target.value,
                            }))
                          }
                          className="input-field text-sm"
                        />
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() =>
                              handleApprove(approval, approval.currentStage, 'rejected')
                            }
                            className="btn-danger text-sm py-1.5 px-4 flex items-center gap-1.5"
                          >
                            <X size={14} />
                            驳回
                          </button>
                          <button
                            onClick={() =>
                              handleApprove(approval, approval.currentStage, 'approved')
                            }
                            className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5"
                          >
                            <Check size={14} />
                            通过
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-court-border pt-4">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-court-bg/50 text-xs text-slate-400">
                          <Info size={14} className="text-slate-500" />
                          <span>当前阶段由{getStageRoleLabel(approval.currentStage)}审批</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel overflow-hidden relative">
            <div className="section-title px-6 pt-5">
              <Clock size={18} />
              今日时间轴排程
              <div className="ml-auto flex items-center gap-4 text-xs font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-court-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-slate-400">已完成</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-court-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-slate-400">进行中</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-court-orange shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <span className="text-slate-400">休庭</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-500" />
                  <span className="text-slate-400">待开庭</span>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 relative">
              {particles.length > 0 && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                  {particles.map((p) => (
                    <div
                      key={p.id}
                      className="particle absolute w-1.5 h-1.5 rounded-full bg-court-gold"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        animationDelay: `${p.delay}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="relative timeline-track rounded-xl overflow-hidden bg-gradient-to-br from-court-bg/60 to-court-card/30 border border-court-border">
                <div className="relative h-14 border-b border-court-border/50">
                  {TIME_SLOTS.map((slot, i) => (
                    <div
                      key={slot}
                      className="absolute top-0 h-full border-l border-court-border/30 flex items-start pt-2 pl-2"
                      style={{ left: `${(i / 10) * 100}%` }}
                    >
                      <span className="text-[10px] text-slate-500 font-mono">{slot}</span>
                    </div>
                  ))}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-court-gold/60 z-20"
                    style={{
                      left: `${Math.min(
                        Math.max(
                          ((new Date().getHours() - 8) * 60 + new Date().getMinutes()) /
                            (10 * 60) *
                            100,
                          0
                        ),
                        100
                      )}%`,
                      boxShadow: '0 0 10px rgba(201,168,108,0.5)',
                    }}
                  >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-court-gold animate-pulse" />
                  </div>
                </div>

                {courtrooms.slice(0, 4).map((courtroom) => {
                  const roomCases = todayCases.filter(
                    (c) => c.courtroomId === courtroom.id
                  );
                  return (
                    <div
                      key={courtroom.id}
                      className="relative h-12 border-b border-court-border/30 last:border-b-0 flex items-center"
                    >
                      <div className="absolute left-0 w-24 h-full flex items-center px-3 border-r border-court-border/30 bg-court-bg/40">
                        <span className="text-xs text-slate-300 truncate">
                          {courtroom.name.replace('审判法庭', '法庭')}
                        </span>
                      </div>
                      <div className="absolute left-24 right-0 top-1 bottom-1">
                        {roomCases.map((c) => {
                          const pos = getCaseTimePosition(c);
                          if (!pos) return null;

                          const hasPendingConflict = c.conflictId && approvals.some(
                            (a) => a.caseNumber === c.caseNumber && a.result === 'pending' && a.type === 'schedule_conflict'
                          );

                          const hasGoldHighlight = scheduleAnimationActive && !c.conflictId;

                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCase(c);
                                setSelectedCourtroom(courtroom);
                              }}
                              className={`schedule-block absolute top-1 bottom-1 rounded-lg cursor-pointer flex items-center px-3 ${
                                STATUS_COLORS[c.status]
                              } ${
                                hasPendingConflict
                                  ? 'ring-2 ring-court-red ring-offset-1 ring-offset-court-bg'
                                  : ''
                              } ${
                                hasGoldHighlight ? 'gold-highlight ring-2 ring-court-gold' : ''
                              }`}
                              style={{
                                left: `calc(${pos.left} + 4px)`,
                                width: `calc(${pos.width} - 8px)`,
                                minWidth: '80px',
                              }}
                            >
                              <div className="w-full overflow-hidden">
                                <p className="text-[10px] text-white font-medium truncate">
                                  {c.caseNumber.match(/第(\d+)号/)?.[1]
                                    ? `第${c.caseNumber.match(/第(\d+)号/)?.[1]}号`
                                    : c.title}
                                </p>
                                <p className="text-[9px] text-white/70 truncate flex items-center gap-1">
                                  <Clock size={8} />
                                  {new Date(c.scheduledTime).toLocaleTimeString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              {hasPendingConflict && (
                                <AlertTriangle
                                  size={10}
                                  className="text-white ml-1 flex-shrink-0"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScheduleModal && (
        <div
          className="fixed inset-0 bg-court-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden animate-[slideInUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-court-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-court-gold to-court-goldLight flex items-center justify-center">
                  <Calendar className="text-court-bg" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-court-goldLight">
                    新建庭审排期
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    填写案件信息进行排期申请
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-court-card flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitSchedule}
              className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-200px)]"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-300 mb-2">案号</label>
                  <input
                    type="text"
                    value={formData.caseNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, caseNumber: e.target.value })
                    }
                    placeholder="例如：(2026)京民初字第0001号"
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">案件类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as CaseType })
                    }
                    className="input-field"
                  >
                    {(Object.keys(CASE_TYPE_LABELS) as CaseType[]).map((t) => (
                      <option key={t} value={t}>
                        {CASE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">优先级</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as PriorityLevel,
                      })
                    }
                    className="input-field"
                  >
                    {(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p].label}优先级
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    <Users size={12} className="inline mr-1" />
                    原告
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plaintiff}
                    onChange={(e) =>
                      setFormData({ ...formData, plaintiff: e.target.value })
                    }
                    placeholder="原告名称"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    <Users size={12} className="inline mr-1" />
                    被告
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.defendant}
                    onChange={(e) =>
                      setFormData({ ...formData, defendant: e.target.value })
                    }
                    placeholder="被告名称"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    <Gavel size={12} className="inline mr-1" />
                    审判长
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.chiefJudge}
                    onChange={(e) =>
                      setFormData({ ...formData, chiefJudge: e.target.value })
                    }
                    placeholder="审判长姓名"
                    className="input-field"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-court-gold" />
                    <label className="text-sm text-slate-300">智能推荐</label>
                  </div>
                  {recommendation ? (
                    <div className="border border-court-gold/30 rounded-xl p-4 bg-gradient-to-br from-court-gold/5 to-transparent relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-court-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="relative flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-court-gold font-medium">
                              {recommendation.courtroom.name}
                            </h4>
                            {renderStars(recommendation.score)}
                            <span className="text-xs text-slate-400">
                              {recommendation.score}分
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-3">
                            <span className="text-slate-500">推荐理由：</span>
                            {recommendation.reason}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {recommendation.equipment.map((eq, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-court-gold/10 text-court-goldLight text-[10px] border border-court-gold/20"
                              >
                                <Monitor size={10} />
                                {eq}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleUseRecommendation}
                          className="ml-4 px-3 py-2 text-xs bg-court-gold text-court-bg rounded-lg font-medium hover:bg-court-goldLight transition-colors flex items-center gap-1"
                        >
                          <Check size={12} />
                          使用推荐
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-court-red/30 rounded-xl p-4 bg-court-red/5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-court-red" />
                        <span className="text-sm text-court-red">该时段无可用法庭</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    <Gavel size={12} className="inline mr-1" />
                    选择法庭
                  </label>
                  <select
                    value={formData.courtroomId}
                    onChange={(e) =>
                      setFormData({ ...formData, courtroomId: e.target.value })
                    }
                    className="input-field"
                  >
                    {courtrooms
                      .filter((c) => c.status !== 'maintenance')
                      .map((cr) => (
                        <option key={cr.id} value={cr.id}>
                          {cr.name} ({cr.floor}楼)
                          {cr.status === 'available' ? ' - 空闲' : ' - 占用中'}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    <Calendar size={12} className="inline mr-1" />
                    排期日期
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledDate: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    <Clock size={12} className="inline mr-1" />
                    排期时间
                  </label>
                  <select
                    value={formData.scheduledTime}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledTime: e.target.value })
                    }
                    className="input-field"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {conflictInfo.hasConflict && conflictInfo.isHighHigh && (
                <div className="flex items-start gap-2 p-4 rounded-lg bg-court-red/10 border border-court-red/30">
                  <AlertTriangle
                    size={16}
                    className="text-court-red mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm text-court-red font-medium">排期冲突警告</p>
                    <p className="text-xs text-slate-400 mt-1">
                      与 {conflictInfo.conflictingCase?.caseNumber}（{PRIORITY_LABELS[conflictInfo.conflictingCase?.priority || 'medium'].label}优先级）时段冲突，两案均为高优先级，需三级审批
                    </p>
                  </div>
                </div>
              )}

              {conflictInfo.hasConflict && !conflictInfo.isHighHigh && (
                <div className="flex items-start gap-2 p-4 rounded-lg bg-court-orange/10 border border-court-orange/30">
                  <AlertTriangle
                    size={16}
                    className="text-court-orange mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm text-court-orange font-medium">存在排期重叠</p>
                    <p className="text-xs text-slate-400 mt-1">
                      与 {conflictInfo.conflictingCase?.caseNumber}（{PRIORITY_LABELS[conflictInfo.conflictingCase?.priority || 'medium'].label}优先级）时段重叠，高优先级优先安排，无需三级审批
                    </p>
                  </div>
                </div>
              )}

              {!conflictInfo.hasConflict && formData.priority === 'high' && (
                <div className="flex items-start gap-2 p-4 rounded-lg bg-court-gold/5 border border-court-gold/20">
                  <Info
                    size={16}
                    className="text-court-gold mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm text-court-gold font-medium">高优先级案件</p>
                    <p className="text-xs text-slate-400 mt-1">
                      当前时段无冲突，高优先级案件将优先安排排期
                    </p>
                  </div>
                </div>
              )}
            </form>

            <div className="px-6 py-4 border-t border-court-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitSchedule}
                className="btn-primary flex items-center gap-2"
              >
                <Check size={16} />
                提交排期
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
