import React, { useEffect, useState, useMemo } from 'react';
import {
  Clock,
  Gavel,
  Building2,
  Users,
  FileCheck,
  AlertTriangle,
  Activity,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { DataCard } from '../components/DataCard';
import { StatusBadge } from '../components/StatusBadge';
import { CourtScene3D } from '../components/three/CourtScene3D';
import { useAuthStore } from '../store/useAuthStore';
import { useCourtStore } from '../store/useCourtStore';
import { useDetentionStore } from '../store/useDetentionStore';
import { mockZones } from '../data/mockData';
import type { CourtZone } from '../types';

const ZONE_STATUS_CONFIG: Record<CourtZone['status'], { color: string; label: string }> = {
  normal: { color: 'bg-court-green', label: '正常' },
  warning: { color: 'bg-court-orange', label: '注意' },
  alert: { color: 'bg-court-red animate-pulse', label: '告警' },
};

function formatTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date: Date): string {
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
}

export const Dashboard: React.FC = () => {
  const { operationLogs } = useAuthStore();
  const { cases, courtrooms, approvals } = useCourtStore();
  const { rooms: detentionRooms, missions, getTotalDetainees, activeAlarms } = useDetentionStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCourtroomId, setSelectedCourtroomId] = useState<string | null>(null);
  const [selectedDetentionId, setSelectedDetentionId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayCasesCount = useMemo(() => {
    const today = new Date().toDateString();
    return cases.filter((c) => {
      const caseDate = new Date(c.scheduledTime).toDateString();
      return caseDate === today;
    }).length;
  }, [cases]);

  const courtroomUsage = useMemo(() => {
    if (courtrooms.length === 0) return 0;
    const occupied = courtrooms.filter((cr) => cr.status === 'occupied').length;
    return Math.round((occupied / courtrooms.length) * 100);
  }, [courtrooms]);

  const totalDetainees = useMemo(() => getTotalDetainees(), [getTotalDetainees]);

  const pendingApprovalsCount = useMemo(
    () => approvals.filter((a) => a.result === 'pending').length,
    [approvals]
  );

  const escortPaths = useMemo(
    () =>
      missions
        .filter((m) => m.status === 'in_progress' || m.status === 'overdue')
        .map((m) => ({
          missionId: m.id,
          points: m.pathPoints,
          progress: m.progress,
        })),
    [missions]
  );

  const recentLogs = useMemo(() => operationLogs.slice(0, 10), [operationLogs]);

  const scheduledToday = useMemo(() => {
    const today = new Date().toDateString();
    return cases
      .filter((c) => new Date(c.scheduledTime).toDateString() === today)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }, [cases]);

  const zonesDisplay: { zone: CourtZone; description: string }[] = [
    {
      zone: mockZones.find((z) => z.type === 'courtroom') || {
        id: 'z1',
        name: '审判区',
        type: 'courtroom',
        position: { x: 0, y: 0, z: 0 },
        size: { w: 1, h: 1, d: 1 },
        status: 'normal',
        description: '',
      },
      description: `${courtrooms.filter((c) => c.status === 'occupied').length}/${courtrooms.length} 法庭使用中`,
    },
    {
      zone: mockZones.find((z) => z.type === 'mediation') || {
        id: 'z2',
        name: '调解室',
        type: 'mediation',
        position: { x: 0, y: 0, z: 0 },
        size: { w: 1, h: 1, d: 1 },
        status: 'normal',
        description: '',
      },
      description: '调解室 2/3 占用',
    },
    {
      zone: mockZones.find((z) => z.type === 'reading') || {
        id: 'z3',
        name: '阅卷区',
        type: 'reading',
        position: { x: 0, y: 0, z: 0 },
        size: { w: 1, h: 1, d: 1 },
        status: 'normal',
        description: '',
      },
      description: '阅卷区正常开放',
    },
    {
      zone: mockZones.find((z) => z.type === 'detention') || {
        id: 'z4',
        name: '羁押室',
        type: 'detention',
        position: { x: 0, y: 0, z: 0 },
        size: { w: 1, h: 1, d: 1 },
        status: 'normal',
        description: '',
      },
      description: `${totalDetainees} 名在押人员`,
    },
    {
      zone: mockZones.find((z) => z.type === 'command') || {
        id: 'z5',
        name: '指挥中心',
        type: 'command',
        position: { x: 0, y: 0, z: 0 },
        size: { w: 1, h: 1, d: 1 },
        status: 'normal',
        description: '',
      },
      description: '系统运行正常',
    },
  ];

  const timeSlots = useMemo(() => {
    const slots: { start: number; end: number; label: string }[] = [];
    for (let h = 8; h <= 18; h++) {
      slots.push({
        start: h,
        end: h + 1,
        label: `${h.toString().padStart(2, '0')}:00`,
      });
    }
    return slots;
  }, []);

  const timelineStart = 8 * 60;
  const timelineEnd = 19 * 60;
  const timelineTotal = timelineEnd - timelineStart;

  const getCaseTimePosition = (caseItem: (typeof scheduledToday)[number]) => {
    const dt = new Date(caseItem.scheduledTime);
    const startMin = dt.getHours() * 60 + dt.getMinutes();
    const endMin = startMin + caseItem.estimatedDuration;
    const left = ((startMin - timelineStart) / timelineTotal) * 100;
    const width = ((endMin - startMin) / timelineTotal) * 100;
    return { left: Math.max(0, left), width: Math.min(100 - left, width) };
  };

  const getCaseBarColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-gradient-to-r from-court-green to-court-green/60 shadow-glow-green';
      case 'recess':
        return 'bg-gradient-to-r from-court-orange to-court-orange/60';
      case 'closed':
        return 'bg-gradient-to-r from-court-blue to-court-blue/60';
      default:
        return 'bg-gradient-to-r from-court-gold to-court-gold/60';
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-court-gold/30 to-court-gold/10 border border-court-gold/40 shadow-glow-gold">
            <Activity className="text-court-gold" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-slate-100 tracking-wide">
              指挥中心 · 全局总览
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{formatDate(currentTime)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {activeAlarms.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-court-red/20 border border-court-red/40 animate-pulse">
              <AlertTriangle className="text-court-red" size={18} />
              <span className="text-sm font-semibold text-court-red">
                {activeAlarms.length} 条警报
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 px-5 py-3 glass-card border-court-gold/30">
            <Clock className="text-court-gold" size={20} />
            <span className="text-3xl font-mono font-bold text-slate-100 tracking-wider">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <DataCard
          title="今日庭审数"
          value={todayCasesCount}
          icon={Gavel}
          color="gold"
          trend={12}
          subtitle="件案件排期"
        />
        <DataCard
          title="法庭使用率"
          value={`${courtroomUsage}%`}
          icon={Building2}
          color="blue"
          trend={8}
          subtitle={`${courtrooms.length} 个法庭`}
        />
        <DataCard
          title="在押人员数"
          value={totalDetainees}
          icon={Users}
          color="green"
          trend={2}
          subtitle={`${detentionRooms.length} 间羁押室`}
        />
        <DataCard
          title="待审批数"
          value={pendingApprovalsCount}
          icon={FileCheck}
          color="orange"
          trend={-5}
          subtitle="需要处理"
        />
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-[55%] glass-card border overflow-hidden rounded-2xl relative">
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-court-gold/20">
            <MapPin size={14} className="text-court-gold" />
            <span className="text-xs text-slate-300 font-medium">3D 场景视图</span>
          </div>
          <CourtScene3D
            courtrooms={courtrooms}
            cases={cases}
            detentionRooms={detentionRooms}
            escortPaths={escortPaths}
            selectedCourtroomId={selectedCourtroomId}
            selectedDetentionId={selectedDetentionId}
            onCourtroomClick={(id) => {
              setSelectedCourtroomId(id === selectedCourtroomId ? null : id);
              setSelectedDetentionId(null);
            }}
            onDetentionClick={(id) => {
              setSelectedDetentionId(id === selectedDetentionId ? null : id);
              setSelectedCourtroomId(null);
            }}
          />
        </div>

        <div className="w-[45%] flex flex-col gap-4 min-h-0">
          <div className="glass-card border rounded-2xl p-5 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-court-blue/20">
                <TrendingUp className="text-court-blue" size={16} />
              </div>
              <h2 className="text-base font-bold text-slate-100">区域状态概览</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {zonesDisplay.map(({ zone, description }) => {
                const statusCfg = ZONE_STATUS_CONFIG[zone.status];
                return (
                  <div
                    key={zone.id}
                    className="flex items-center gap-4 p-3.5 rounded-xl bg-black/20 border border-slate-700/50 hover:border-court-gold/30 transition-all duration-300 cursor-pointer group"
                  >
                    <div className={`w-3 h-3 rounded-full ${statusCfg.color} shadow-lg`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100 group-hover:text-court-gold transition-colors">
                          {zone.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            zone.status === 'normal'
                              ? 'bg-court-green/10 text-court-green border-court-green/30'
                              : zone.status === 'warning'
                              ? 'bg-court-orange/10 text-court-orange border-court-orange/30'
                              : 'bg-court-red/10 text-court-red border-court-red/30'
                          }`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card border rounded-2xl p-5 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-court-gold/20">
                  <Activity className="text-court-gold" size={16} />
                </div>
                <h2 className="text-base font-bold text-slate-100">实时事件流</h2>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-court-green animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-black/15 border border-slate-700/30 hover:border-court-gold/20 transition-all duration-200"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-court-gold/30 to-court-gold/10 border border-court-gold/30 flex items-center justify-center">
                      <Users size={14} className="text-court-gold" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{log.userName}</span>
                      <StatusBadge
                        type="approval"
                        status={log.userRole === 'president' ? 'approved' : log.userRole === 'chief' ? 'pending' : 'pending'}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="text-court-gold">{log.action}</span>
                      <span className="text-slate-500 mx-1">→</span>
                      <span className="text-slate-300">{log.target}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono flex-shrink-0 mt-1">
                    {log.timestamp.split(' ')[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card border rounded-2xl p-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-court-green/20">
              <Gavel className="text-court-green" size={16} />
            </div>
            <h2 className="text-base font-bold text-slate-100">今日排期时间表</h2>
            <span className="text-xs text-slate-500 ml-2">
              共 {scheduledToday.length} 场庭审
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-court-gold to-court-gold/60" />
              <span className="text-slate-400">待开庭</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-court-green to-court-green/60" />
              <span className="text-slate-400">审理中</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-court-orange to-court-orange/60" />
              <span className="text-slate-400">休庭</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-court-blue to-court-blue/60" />
              <span className="text-slate-400">闭庭</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto custom-scrollbar pb-2">
          <div className="min-w-[900px]">
            <div className="flex border-b border-slate-700/50 mb-3 pb-2">
              <div className="w-28 flex-shrink-0 text-xs text-slate-500 font-medium px-2">
                法庭/案件
              </div>
              <div className="flex-1 flex">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.start}
                    className="flex-1 text-[11px] text-slate-500 text-center font-mono border-l border-slate-700/30 first:border-l-0"
                  >
                    {slot.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {scheduledToday.map((caseItem) => {
                const courtroom = courtrooms.find((c) => c.id === caseItem.courtroomId);
                const pos = getCaseTimePosition(caseItem);
                const startTime = new Date(caseItem.scheduledTime);
                const timeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;

                return (
                  <div key={caseItem.id} className="flex items-center h-14">
                    <div className="w-28 flex-shrink-0 px-2 flex flex-col justify-center">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {courtroom?.name || '未分配'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                        {caseItem.caseNumber}
                      </div>
                    </div>
                    <div className="flex-1 relative h-full">
                      <div className="absolute inset-0 flex">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot.start}
                            className="flex-1 border-l border-slate-700/20 first:border-l-0"
                          />
                        ))}
                      </div>

                      <div
                        className={`absolute top-2 h-10 rounded-lg px-3 flex items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${getCaseBarColor(caseItem.status)}`}
                        style={{
                          left: `${pos.left}%`,
                          width: `${pos.width}%`,
                          minWidth: '120px',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {caseItem.title}
                          </div>
                          <div className="text-[10px] text-slate-800/80 font-mono">
                            {timeStr} · {caseItem.estimatedDuration}分钟
                          </div>
                        </div>
                        <StatusBadge type="hearing" status={caseItem.status} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {scheduledToday.length === 0 && (
                <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                  今日暂无排期
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
