import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  UserX,
  AlertTriangle,
  Check,
  AlertOctagon,
  MapPinHouse,
  UserCheck,
  Phone,
  Siren,
  Send,
  X,
  ChevronRight,
  Clock,
  User,
  Info,
  Play,
  AlertCircle,
  Shield,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { DataCard } from '../components/DataCard';
import { useDetentionStore } from '../store/useDetentionStore';
import { useCourtStore } from '../store/useCourtStore';
import { useAuthStore } from '../store/useAuthStore';
import { CourtScene3D } from '../components/three/CourtScene3D';
import type { DetentionRoom, Detainee, EscortMission } from '../types';

const DISPOSAL_ICON_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  trigger_alarm: { icon: Clock, color: 'text-court-red', bgColor: 'bg-court-red/15 border-court-red/40', label: '系统触发超时警报' },
  start_disposal: { icon: Shield, color: 'text-court-orange', bgColor: 'bg-court-orange/15 border-court-orange/40', label: '开始处置 - 联系法警' },
  complete_return: { icon: CheckCircle, color: 'text-court-green', bgColor: 'bg-court-green/15 border-court-green/40', label: '人员已安全归位' },
};

const ROOM_STATUS_CONFIG: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }> = {
  full: { label: '满员', bgColor: 'bg-court-red/15', borderColor: 'border-court-red/40', textColor: 'text-court-red' },
  occupied: { label: '使用中', bgColor: 'bg-court-orange/15', borderColor: 'border-court-orange/40', textColor: 'text-court-orange' },
  empty: { label: '空闲', bgColor: 'bg-court-green/15', borderColor: 'border-court-green/40', textColor: 'text-court-green' },
  maintenance: { label: '维护中', bgColor: 'bg-slate-500/15', borderColor: 'border-slate-500/40', textColor: 'text-slate-400' },
};

const getRoomStatus = (room: DetentionRoom): keyof typeof ROOM_STATUS_CONFIG => {
  if (room.status === 'maintenance') return 'maintenance';
  if (room.currentCount >= room.capacity) return 'full';
  if (room.currentCount > 0) return 'occupied';
  return 'empty';
};

const DETAINEE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  detained: { label: '羁押中', color: 'text-court-blue' },
  escorting: { label: '押解中', color: 'text-court-orange' },
  hearing: { label: '庭审中', color: 'text-court-green' },
  returned: { label: '已返回', color: 'text-slate-400' },
};

function getOverdueDuration(startTime: string, expectedReturn: string): string {
  try {
    const start = new Date(startTime.replace(/\//g, '-'));
    const expected = new Date(expectedReturn.replace(/\//g, '-'));
    const now = new Date();
    const overdueMs = Math.max(0, now.getTime() - expected.getTime());
    const overdueMin = Math.floor(overdueMs / 60000);
    if (overdueMin < 60) return `${overdueMin}分钟`;
    const hours = Math.floor(overdueMin / 60);
    const mins = overdueMin % 60;
    return `${hours}小时${mins}分钟`;
  } catch {
    return '未知';
  }
}

function getAlarmLevel(mission: EscortMission): { level: '严重' | '一般'; color: string } {
  try {
    const expected = new Date(mission.expectedReturn.replace(/\//g, '-'));
    const now = new Date();
    const overdueMs = now.getTime() - expected.getTime();
    const overdueMin = Math.floor(overdueMs / 60000);
    return overdueMin >= 60
      ? { level: '严重', color: 'text-court-red' }
      : { level: '一般', color: 'text-court-orange' };
  } catch {
    return { level: '一般', color: 'text-court-orange' };
  }
}

interface StartEscortForm {
  roomId: string;
  detaineeId: string;
  courtroomId: string;
}

export const DetentionPage: React.FC = () => {
  const {
    rooms,
    missions,
    activeAlarms,
    selectedRoom,
    selectedMission,
    setSelectedRoom,
    setSelectedMission,
    startEscort,
    completeMission,
    startDisposal,
    getEscortingCount,
  } = useDetentionStore();

  const { courtrooms, cases } = useCourtStore();
  const { currentUser } = useAuthStore();

  const [showRoomDetail, setShowRoomDetail] = useState(false);
  const [showStartEscortModal, setShowStartEscortModal] = useState(false);
  const [escortForm, setEscortForm] = useState<StartEscortForm>({
    roomId: '',
    detaineeId: '',
    courtroomId: courtrooms.find((c) => c.status !== 'maintenance')?.id || '',
  });

  useEffect(() => {
    if (selectedRoom) {
      setEscortForm((prev) => ({ ...prev, roomId: selectedRoom.id, detaineeId: '' }));
    }
  }, [selectedRoom]);

  const totalMissions = useMemo(() => missions.length, [missions]);
  const escortingCount = useMemo(() => getEscortingCount(), [getEscortingCount]);
  const disposingCount = useMemo(
    () => missions.filter((m) => m.status === 'disposing').length,
    [missions]
  );
  const overdueCount = useMemo(
    () => missions.filter((m) => m.status === 'overdue').length,
    [missions]
  );

  const escortPaths = useMemo(
    () =>
      missions
        .filter((m) => m.status === 'in_progress' || m.status === 'overdue' || m.status === 'disposing')
        .map((m) => ({
          missionId: m.id,
          points: m.pathPoints,
          progress: m.progress,
          alarm: m.status === 'overdue' || m.status === 'disposing',
        })),
    [missions]
  );

  const activeAlarmsData = useMemo(() => {
    return activeAlarms
      .map((id) => missions.find((m) => m.id === id))
      .filter((m): m is EscortMission => !!m && (m.status === 'overdue' || m.status === 'disposing'));
  }, [activeAlarms, missions]);

  const selectedRoomDetainees = useMemo(() => {
    if (!selectedRoom) return [];
    return selectedRoom.detainees.filter((d) => d.status === 'detained' || d.status === 'returned');
  }, [selectedRoom]);

  const handleOpenRoomDetail = (room: DetentionRoom) => {
    setSelectedRoom(room);
    setShowRoomDetail(true);
  };

  const handleStartEscort = () => {
    if (!escortForm.roomId || !escortForm.detaineeId || !escortForm.courtroomId) return;
    const room = rooms.find((r) => r.id === escortForm.roomId);
    const courtroom = courtrooms.find((c) => c.id === escortForm.courtroomId);
    if (!room || !courtroom) return;
    startEscort(escortForm.detaineeId, courtroom.name, room.number);
    setShowStartEscortModal(false);
    setShowRoomDetail(false);
    setEscortForm({
      roomId: '',
      detaineeId: '',
      courtroomId: courtrooms.find((c) => c.status !== 'maintenance')?.id || '',
    });
  };

  const handleExecuteMission = (mission: EscortMission) => {
    const updatedMissions = useDetentionStore.getState().missions.map((m) =>
      m.id === mission.id ? { ...m, status: 'in_progress' as const } : m
    );
    useDetentionStore.setState({ missions: updatedMissions });
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes alarmBorderPulse {
          0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
          50% { border-color: rgba(239, 68, 68, 0.9); box-shadow: 0 0 20px 4px rgba(239, 68, 68, 0.2); }
        }
        @keyframes sirenBlink {
          0%, 100% { background-color: rgba(239, 68, 68, 0.15); }
          50% { background-color: rgba(239, 68, 68, 0.4); }
        }
        @keyframes alarmBannerPulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3), inset 0 0 20px rgba(239, 68, 68, 0.05);
            border-color: rgba(239, 68, 68, 0.5);
          }
          50% { 
            box-shadow: 0 0 30px 5px rgba(239, 68, 68, 0.25), inset 0 0 30px rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.8);
          }
        }
        @keyframes alarmRowFlash {
          0%, 100% { background-color: rgba(239, 68, 68, 0.1); }
          50% { background-color: rgba(239, 68, 68, 0.25); }
        }
        .alarm-row {
          animation: alarmBorderPulse 1.5s ease-in-out infinite;
        }
        .siren-bg {
          animation: sirenBlink 0.8s ease-in-out infinite;
        }
        .alarm-banner {
          animation: alarmBannerPulse 2s ease-in-out infinite;
        }
        .alarm-item-flash {
          animation: alarmRowFlash 1.2s ease-in-out infinite;
        }
      `}</style>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-court-blue to-court-blue/70 flex items-center justify-center shadow-glow-blue">
              <ShieldAlert className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-court-goldLight tracking-wide">
                羁押安全监控中心
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                <Clock size={14} />
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <DataCard
              title="总任务数"
              value={totalMissions}
              icon={MapPinHouse}
              color="gold"
            />
            <DataCard
              title="押解中"
              value={escortingCount}
              icon={Users}
              color="blue"
            />
            <DataCard
              title="处置中"
              value={disposingCount}
              icon={Shield}
              color="orange"
            />
            <DataCard
              title="超期数量"
              value={overdueCount}
              icon={AlertOctagon}
              color="red"
            />
          </div>
        </div>

        {activeAlarmsData.length > 0 && (
          <div className="alarm-banner border border-court-red/50 rounded-xl p-4 bg-gradient-to-r from-court-red/20 via-court-red/10 to-court-red/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-court-red/20 flex items-center justify-center animate-pulse">
                  <AlertOctagon className="text-court-red" size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-court-red font-bold text-lg">
                      活跃警报
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-court-red/30 text-court-red text-xs font-bold border border-court-red/50">
                      {activeAlarmsData.length} 条
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    以下押解任务已超期，请及时处置
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeAlarmsData.slice(0, 3).map((mission, idx) => (
                  <div
                    key={mission.id}
                    className="px-3 py-1.5 rounded-lg bg-court-red/15 border border-court-red/40 text-xs"
                  >
                    <span className="text-court-red font-medium">{mission.detaineeName}</span>
                    <span className="text-slate-400 ml-1">
                      {getOverdueDuration(mission.startTime, mission.expectedReturn)}
                    </span>
                  </div>
                ))}
                {activeAlarmsData.length > 3 && (
                  <span className="text-xs text-slate-400">
                    +{activeAlarmsData.length - 3} 条
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-20 gap-6 h-[calc(100vh-220px)]" style={{ gridTemplateColumns: '55% 1fr' }}>
        <div className="glass-panel overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-border">
            <div className="w-2 h-2 rounded-full bg-court-blue animate-pulse" />
            <span className="text-xs text-slate-300">羁押区3D实时视图</span>
          </div>
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-border">
            <Info size={12} className="text-slate-400" />
            <span className="text-xs text-slate-400">点击羁押室查看详情 · 蓝线=押解中 · 红线=超期</span>
          </div>
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-blue/30">
              <div className="w-3 h-1 rounded bg-court-blue" />
              <span className="text-xs text-court-blue">押解中</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-red/30">
              <div className="w-3 h-1 rounded bg-court-red" />
              <span className="text-xs text-court-red">超期未归</span>
            </div>
          </div>
          <CourtScene3D
            courtrooms={courtrooms}
            cases={cases}
            detentionRooms={rooms}
            escortPaths={escortPaths as { missionId: string; points: { x: number; y: number; z: number }[]; progress: number; alarm?: boolean }[]}
            selectedDetentionId={selectedRoom?.id}
            onDetentionClick={(id) => {
              const dr = rooms.find((x) => x.id === id);
              if (dr) {
                setSelectedRoom(dr);
                setShowRoomDetail(true);
              }
            }}
            showZones={true}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 overflow-hidden min-h-0 h-full">
          <div className="flex flex-col gap-4 overflow-hidden min-h-0">
            <div className="glass-panel overflow-hidden flex flex-col min-h-0" style={{ flex: '0 0 auto', maxHeight: '40%' }}>
              <div className="section-title px-4 pt-3">
                <Shield size={14} />
                羁押室状态
                <span className="ml-auto text-xs font-sans text-slate-400">
                  共 {rooms.length} 间
                </span>
              </div>
              <div className="flex-1 overflow-auto px-4 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {rooms.map((room) => {
                    const statusKey = getRoomStatus(room);
                    const statusCfg = ROOM_STATUS_CONFIG[statusKey];
                    const occupancyPercent = room.capacity > 0 ? (room.currentCount / room.capacity) * 100 : 0;
                    return (
                      <div
                        key={room.id}
                        className={`relative border rounded-lg p-2.5 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${statusCfg.bgColor} ${statusCfg.borderColor} ${
                          selectedRoom?.id === room.id ? 'ring-2 ring-court-gold ring-offset-1 ring-offset-court-panel' : ''
                        }`}
                        onClick={() => handleOpenRoomDetail(room)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${statusCfg.textColor}`}>
                              {room.number}
                            </span>
                            <span className={`text-[9px] px-1 py-0.5 rounded border ${statusCfg.bgColor} ${statusCfg.borderColor} ${statusCfg.textColor}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {room.currentCount}/{room.capacity}
                          </span>
                        </div>

                        <div className="w-full h-1 rounded-full bg-court-bg/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              statusKey === 'full'
                                ? 'bg-court-red'
                                : statusKey === 'occupied'
                                ? 'bg-court-orange'
                                : statusKey === 'empty'
                                ? 'bg-court-green'
                                : 'bg-slate-500'
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="glass-panel overflow-hidden flex flex-col min-h-0" style={{ flex: '1 1 auto' }}>
              <div className="section-title px-4 pt-3">
                <MapPinHouse size={14} />
                押解任务列表
                <span className="ml-auto text-xs font-sans text-slate-400">
                  共 {missions.length} 条
                </span>
              </div>
              <div className="flex-1 overflow-auto px-4 pb-3">
                <div className="space-y-2">
                  {missions.map((mission) => {
                    const isOverdue = mission.status === 'overdue';
                    const isSelected = selectedMission?.id === mission.id;
                    return (
                      <div
                        key={mission.id}
                        onClick={() => setSelectedMission(mission)}
                        className={`border rounded-lg p-3 transition-all cursor-pointer ${
                          isOverdue
                            ? 'alarm-row border-court-red/50 siren-bg'
                            : isSelected
                            ? 'border-court-gold/60 bg-court-gold/5 ring-1 ring-court-gold/30'
                            : 'border-court-border bg-court-card/30 hover:border-court-gold/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <UserCheck size={12} className={isOverdue ? 'text-court-red' : 'text-court-blue'} />
                            <span className="text-xs font-medium text-slate-200">
                              {mission.detaineeName}
                            </span>
                          </div>
                          <StatusBadge type="escort" status={mission.status} />
                        </div>

                        <div className="flex items-center gap-1.5 mb-2 text-[10px] text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-court-bg/50 border border-court-border/50">
                            {mission.fromRoom}
                          </span>
                          <ChevronRight size={10} className="text-slate-500" />
                          <span className="px-1.5 py-0.5 rounded bg-court-blue/10 border border-court-blue/30 text-court-blue">
                            {mission.toCourtroom}
                          </span>
                        </div>

                        <div className="mb-2">
                          <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
                            <span>进度</span>
                            <span className="font-mono">{mission.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-court-bg/50 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isOverdue
                                  ? 'bg-gradient-to-r from-court-red to-court-red/70'
                                  : mission.progress >= 100
                                  ? 'bg-gradient-to-r from-court-green to-court-green/70'
                                  : 'bg-gradient-to-r from-court-blue to-court-blue/70'
                              }`}
                              style={{ width: `${mission.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-500">
                          <div className="flex items-center gap-0.5">
                            <Clock size={9} />
                            <span>{mission.startTime.split(' ')[1] || mission.startTime}</span>
                          </div>
                          <div className={`flex items-center gap-0.5 ${isOverdue ? 'text-court-red' : ''}`}>
                            {isOverdue && <AlertTriangle size={9} />}
                            <span>
                              {isOverdue
                                ? `超期`
                                : `→ ${mission.expectedReturn.split(' ')[1] || mission.expectedReturn}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {missions.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      暂无押解任务
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="flex flex-col gap-4 overflow-hidden min-h-0">

          <div className="glass-panel overflow-hidden flex flex-col min-h-0" style={{ flex: '0 0 auto', maxHeight: '38%' }}>
            <div className="section-title px-4 pt-3">
              <AlertOctagon size={14} className="text-court-red" />
              活跃警报
              {activeAlarmsData.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-court-red/20 text-court-red text-[10px] font-bold border border-court-red/40 animate-pulse">
                  {activeAlarmsData.length} 条
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto px-4 pb-3">
              <div className="space-y-2">
                {activeAlarmsData.map((mission) => {
                  const alarmInfo = getAlarmLevel(mission);
                  const isSelected = selectedMission?.id === mission.id;
                  return (
                    <div
                      key={mission.id}
                      onClick={() => setSelectedMission(mission)}
                      className={`border rounded-xl p-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-court-gold/60 bg-court-gold/5 ring-1 ring-court-gold/30'
                          : mission.status === 'disposing'
                          ? 'border-court-orange/40 bg-court-orange/10'
                          : 'border-court-red/40 alarm-item-flash bg-court-red/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              alarmInfo.level === '严重'
                                ? 'bg-court-red/20 text-court-red border-court-red/40'
                                : 'bg-court-orange/20 text-court-orange border-court-orange/40'
                            }`}
                          >
                            {alarmInfo.level}警报
                          </span>
                        </div>
                        <StatusBadge type="escort" status={mission.status} />
                      </div>

                      <div className="mb-2">
                        <p className="text-sm text-slate-200 font-medium">
                          {mission.detaineeName}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MapPinHouse size={10} />
                          <span>{mission.fromRoom} → {mission.toCourtroom}</span>
                        </div>
                      </div>

                      {mission.disposalRecords && mission.disposalRecords.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-court-border/50">
                          <div className="flex flex-col gap-1">
                            {mission.disposalRecords.map((record, idx) => {
                              const cfg = DISPOSAL_ICON_CONFIG[record.action];
                              const Icon = cfg.icon;
                              return (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${cfg.bgColor}`}>
                                    <Icon size={8} className={cfg.color} />
                                  </div>
                                  <span className={`text-[10px] ${cfg.color}`}>
                                    {cfg.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500 ml-auto">
                                    {record.timestamp.split(' ')[1] || record.timestamp}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-1.5 mt-2">
                        {mission.status === 'overdue' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); startDisposal(mission.id); }}
                              className="flex-1 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 bg-court-orange/15 text-court-orange border border-court-orange/40 hover:bg-court-orange/25 transition-all"
                            >
                              <Shield size={10} />
                              处置中
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); completeMission(mission.id); }}
                              className="flex-1 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 bg-court-green/15 text-court-green border border-court-green/40 hover:bg-court-green/25 transition-all"
                            >
                              <CheckCircle size={10} />
                              确认归位
                            </button>
                          </>
                        )}
                        {mission.status === 'disposing' && (
                          <>
                            <span className="flex-1 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 bg-court-orange/10 text-court-orange border border-court-orange/30 opacity-70 cursor-not-allowed">
                              <Shield size={10} className="animate-pulse" />
                              处置中...
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); completeMission(mission.id); }}
                              className="flex-1 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 bg-court-green/15 text-court-green border border-court-green/40 hover:bg-court-green/25 transition-all"
                            >
                              <CheckCircle size={10} />
                              确认归位
                            </button>
                          </>
                        )}
                        {mission.status === 'completed' && (
                          <span className="flex-1 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 bg-court-green/15 text-court-green border border-court-green/40">
                            <CheckCircle size={10} />
                            已完成
                          </span>
                        )}
                        {mission.status === 'in_progress' && (
                          <span className="flex-1 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 bg-court-blue/10 text-court-blue border border-court-blue/30">
                            <Play size={10} />
                            押解进行中
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {activeAlarmsData.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8">
                    <Shield size={36} className="text-court-green/40 mb-3" />
                    <p className="text-sm">暂无活跃警报</p>
                    <p className="text-xs text-slate-500 mt-1">所有押解任务正常</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel overflow-hidden flex flex-col min-h-0" style={{ flex: '1 1 auto' }}>
            <div className="section-title px-4 pt-3">
              <MapPinHouse size={14} />
              任务详情
              <span className="ml-auto text-[10px] font-sans text-slate-400">
                {selectedMission ? `ID: ${selectedMission.id}` : '未选择'}
              </span>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-3">
              {selectedMission ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-serif font-bold text-court-goldLight">
                        {selectedMission.detaineeName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusBadge type="escort" status={selectedMission.status} />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-court-card/30 border border-court-border space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <MapPinHouse size={12} className="text-slate-500" />
                      <span className="text-slate-400">路线:</span>
                      <span className="px-2 py-0.5 rounded bg-court-bg/50 border border-court-border/50 text-slate-300">
                        {selectedMission.fromRoom}
                      </span>
                      <ArrowRight size={10} className="text-slate-500" />
                      <span className="px-2 py-0.5 rounded bg-court-blue/10 border border-court-blue/30 text-court-blue">
                        {selectedMission.toCourtroom}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Users size={12} className="text-slate-500" />
                      <span className="text-slate-400">法警:</span>
                      <span className="text-slate-300">{selectedMission.escortOfficers.join('、')}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-500" />
                        <span className="text-slate-400">出发:</span>
                        <span className="text-slate-300">{selectedMission.startTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className={selectedMission.status === 'overdue' ? 'text-court-red' : 'text-slate-500'} />
                        <span className="text-slate-400">预计返回:</span>
                        <span className={selectedMission.status === 'overdue' ? 'text-court-red' : 'text-slate-300'}>
                          {selectedMission.expectedReturn}
                        </span>
                      </div>
                    </div>
                    {selectedMission.status === 'overdue' && (
                      <div className="flex items-center gap-1 text-xs text-court-red font-medium">
                        <AlertTriangle size={12} />
                        <span>超期 {getOverdueDuration(selectedMission.startTime, selectedMission.expectedReturn)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>押解进度</span>
                      <span className="font-mono">{selectedMission.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-court-bg/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedMission.status === 'overdue' || selectedMission.status === 'disposing'
                            ? 'bg-gradient-to-r from-court-red to-court-red/70'
                            : selectedMission.progress >= 100
                            ? 'bg-gradient-to-r from-court-green to-court-green/70'
                            : 'bg-gradient-to-r from-court-blue to-court-blue/70'
                        }`}
                        style={{ width: `${selectedMission.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    {selectedMission.status === 'overdue' && (
                      <>
                        <button
                          onClick={() => startDisposal(selectedMission.id)}
                          className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-gradient-to-r from-court-orange to-court-orange/80 text-white border border-court-orange/50 hover:from-court-orange/90 hover:to-court-orange/70 transition-all shadow-lg shadow-court-orange/20"
                        >
                          <Shield size={13} />
                          处置中
                        </button>
                        <button
                          onClick={() => completeMission(selectedMission.id)}
                          className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-gradient-to-r from-court-green to-court-green/80 text-white border border-court-green/50 hover:from-court-green/90 hover:to-court-green/70 transition-all shadow-lg shadow-court-green/20"
                        >
                          <CheckCircle size={13} />
                          确认归位
                        </button>
                      </>
                    )}
                    {selectedMission.status === 'disposing' && (
                      <>
                        <span className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-court-orange/15 text-court-orange border border-court-orange/40 cursor-not-allowed opacity-80">
                          <Shield size={13} className="animate-pulse" />
                          处置中...
                        </span>
                        <button
                          onClick={() => completeMission(selectedMission.id)}
                          className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-gradient-to-r from-court-green to-court-green/80 text-white border border-court-green/50 hover:from-court-green/90 hover:to-court-green/70 transition-all shadow-lg shadow-court-green/20"
                        >
                          <CheckCircle size={13} />
                          确认归位
                        </button>
                      </>
                    )}
                    {selectedMission.status === 'completed' && (
                      <span className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-court-green/15 text-court-green border border-court-green/40">
                        <CheckCircle size={13} />
                        已完成
                      </span>
                    )}
                    {selectedMission.status === 'in_progress' && (
                      <span className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-court-blue/15 text-court-blue border border-court-blue/40">
                        <Play size={13} />
                        押解进行中
                      </span>
                    )}
                    {selectedMission.status === 'planned' && (
                      <button
                        onClick={() => handleExecuteMission(selectedMission)}
                        className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1 btn-primary"
                      >
                        <Play size={13} />
                        开始执行
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock size={12} className="text-court-gold" />
                      <h4 className="text-xs font-medium text-slate-200">处置记录</h4>
                    </div>
                    {selectedMission.disposalRecords && selectedMission.disposalRecords.length > 0 ? (
                      <div className="relative pl-4">
                        <div className="absolute left-1 top-1 bottom-1 w-px bg-gradient-to-b from-court-red via-court-orange to-court-green" />
                        <div className="space-y-2.5">
                          {selectedMission.disposalRecords.map((record, idx) => {
                            const cfg = DISPOSAL_ICON_CONFIG[record.action];
                            const Icon = cfg.icon;
                            return (
                              <div key={idx} className="relative">
                                <div className={`absolute -left-[18px] top-0 w-5 h-5 rounded-full flex items-center justify-center border ${cfg.bgColor}`}>
                                  <Icon size={10} className={cfg.color} />
                                </div>
                                <div className="p-2 rounded-lg bg-court-card/30 border border-court-border">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className={`text-xs font-medium ${cfg.color}`}>
                                      {cfg.label}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      {record.timestamp}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <User size={9} />
                                    <span>操作人: {record.operator}</span>
                                    {record.operatorRole && (
                                      <span className="px-1 py-0.5 rounded bg-court-bg/50 text-[9px] text-slate-400">
                                        {record.operatorRole === 'clerk' ? '书记员' :
                                         record.operatorRole === 'judge' ? '法官' :
                                         record.operatorRole === 'chief' ? '庭长' :
                                         record.operatorRole === 'president' ? '院长' : record.operatorRole}
                                      </span>
                                    )}
                                  </div>
                                  {record.note && (
                                    <p className="text-[10px] text-slate-500 mt-1 italic">
                                      {record.note}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500 text-xs border border-dashed border-court-border rounded-lg">
                        暂无处置记录
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8">
                  <MapPinHouse size={32} className="text-slate-600 mb-2" />
                  <p className="text-xs">选择押解任务查看详情和处置记录</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">点击左侧任务卡片查看</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRoomDetail && selectedRoom && (
        <div
          className="fixed inset-0 bg-court-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowRoomDetail(false);
            setSelectedRoom(null);
          }}
        >
          <div
            className="glass-panel w-full max-w-lg max-h-[85vh] overflow-hidden animate-[slideInUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-court-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ROOM_STATUS_CONFIG[getRoomStatus(selectedRoom)].bgColor
                  }`}
                >
                  <Shield size={20} className={ROOM_STATUS_CONFIG[getRoomStatus(selectedRoom)].textColor} />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-court-goldLight">
                    羁押室 {selectedRoom.number}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    容量 {selectedRoom.capacity} 人 · 当前 {selectedRoom.currentCount} 人
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRoomDetail(false);
                  setSelectedRoom(null);
                }}
                className="w-8 h-8 rounded-lg hover:bg-court-card flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-180px)]">
              <div className="flex items-center gap-3">
                <StatusBadge type="detention" status={selectedRoom.status} />
                <div className="flex-1 h-2 rounded-full bg-court-bg/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      getRoomStatus(selectedRoom) === 'full'
                        ? 'bg-court-red'
                        : getRoomStatus(selectedRoom) === 'occupied'
                        ? 'bg-court-orange'
                        : getRoomStatus(selectedRoom) === 'empty'
                        ? 'bg-court-green'
                        : 'bg-slate-500'
                    }`}
                    style={{ width: `${selectedRoom.capacity > 0 ? (selectedRoom.currentCount / selectedRoom.capacity) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-slate-300">
                  {selectedRoom.currentCount}/{selectedRoom.capacity}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Users size={14} />
                  在押人员列表
                </h3>
                <div className="space-y-2">
                  {selectedRoom.detainees.map((d: Detainee) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-court-border bg-court-card/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-court-blue/15 border border-court-blue/30 flex items-center justify-center">
                          <User size={16} className="text-court-blue" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{d.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{d.caseNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs ${DETAINEE_STATUS_LABEL[d.status].color}`}
                        >
                          {DETAINEE_STATUS_LABEL[d.status].label}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">
                          入所: {d.checkInTime}
                        </p>
                      </div>
                    </div>
                  ))}
                  {selectedRoom.detainees.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      该羁押室暂无人员
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-court-border flex gap-3">
              <button
                onClick={() => setShowRoomDetail(false)}
                className="btn-secondary flex-1"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setEscortForm((prev) => ({
                    ...prev,
                    roomId: selectedRoom.id,
                    detaineeId: '',
                  }));
                  setShowStartEscortModal(true);
                }}
                disabled={selectedRoomDetainees.length === 0 || selectedRoom.status === 'maintenance'}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <MapPinHouse size={16} />
                发起押解
              </button>
            </div>
          </div>
        </div>
      )}

      {showStartEscortModal && (
        <div
          className="fixed inset-0 bg-court-bg/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowStartEscortModal(false)}
        >
          <div
            className="glass-panel w-full max-w-md max-h-[90vh] overflow-hidden animate-[slideInUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-court-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-court-blue to-court-blue/70 flex items-center justify-center">
                  <MapPinHouse className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-court-goldLight">
                    发起押解任务
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    选择人员和目标法庭
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStartEscortModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-court-card flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div>
                <label className="block text-sm text-slate-300 mb-2 flex items-center gap-2">
                  <Shield size={12} />
                  选择羁押室
                </label>
                <select
                  value={escortForm.roomId}
                  onChange={(e) =>
                    setEscortForm((prev) => ({ ...prev, roomId: e.target.value, detaineeId: '' }))
                  }
                  className="input-field"
                >
                  <option value="">请选择羁押室</option>
                  {rooms
                    .filter((r) => r.status !== 'maintenance' && r.detainees.some((d) => d.status === 'detained' || d.status === 'returned'))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.number}（{r.currentCount}/{r.capacity} 人）
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2 flex items-center gap-2">
                  <User size={12} />
                  选择在押人员
                </label>
                <select
                  value={escortForm.detaineeId}
                  onChange={(e) =>
                    setEscortForm((prev) => ({ ...prev, detaineeId: e.target.value }))
                  }
                  disabled={!escortForm.roomId}
                  className="input-field"
                >
                  <option value="">请选择人员</option>
                  {escortForm.roomId &&
                    rooms
                      .find((r) => r.id === escortForm.roomId)
                      ?.detainees.filter((d) => d.status === 'detained' || d.status === 'returned')
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} - {d.caseNumber}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2 flex items-center gap-2">
                  <MapPinHouse size={12} />
                  目标法庭
                </label>
                <select
                  value={escortForm.courtroomId}
                  onChange={(e) =>
                    setEscortForm((prev) => ({ ...prev, courtroomId: e.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">请选择目标法庭</option>
                  {courtrooms
                    .filter((c) => c.status !== 'maintenance')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}（{c.floor}楼）
                        {c.status === 'available' ? ' - 空闲' : ' - 使用中'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-4 rounded-lg bg-court-gold/10 border border-court-gold/30">
                <h3 className="text-sm font-medium text-court-gold mb-2 flex items-center gap-2">
                  <UserCheck size={14} />
                  执行法警（自动配置）
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-court-card border border-court-border text-xs text-slate-300">
                    法警A
                  </span>
                  <span className="px-3 py-1 rounded-full bg-court-card border border-court-border text-xs text-slate-300">
                    法警B
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  系统自动分配两名法警执行押解任务
                </p>
              </div>

              {currentUser && (
                <div className="p-3 rounded-lg bg-court-bg/50 border border-court-border/50">
                  <p className="text-[10px] text-slate-500">
                    操作人: <span className="text-slate-300">{currentUser.name}</span>
                    <span className="mx-2">|</span>
                    角色: <span className="text-slate-300">
                      {currentUser.role === 'clerk' ? '书记员' :
                       currentUser.role === 'judge' ? '法官' :
                       currentUser.role === 'chief' ? '庭长' : '院长'}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-court-border flex gap-3">
              <button
                onClick={() => setShowStartEscortModal(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleStartEscort}
                disabled={!escortForm.roomId || !escortForm.detaineeId || !escortForm.courtroomId}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Check size={16} />
                确认发起
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
