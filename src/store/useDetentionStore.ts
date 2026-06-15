import { create } from 'zustand';
import type { DetentionRoom, EscortMission } from '../types';
import { mockDetentionRooms, mockEscortMissions } from '../data/mockData';
import { useAuthStore } from './useAuthStore';
import { loadPersist, savePersist } from './persist';

const PERSIST_KEY = 'detention-store';
const missionTimeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

interface DetentionState {
  rooms: DetentionRoom[];
  missions: EscortMission[];
  activeAlarms: string[];
  selectedRoom: DetentionRoom | null;
  selectedMission: EscortMission | null;
  setSelectedRoom: (r: DetentionRoom | null) => void;
  setSelectedMission: (m: EscortMission | null) => void;
  startEscort: (detaineeId: string, courtroomName: string, fromRoom: string) => void;
  completeMission: (missionId: string) => void;
  updateMissionProgress: (missionId: string, progress: number) => void;
  triggerAlarm: (missionId: string) => void;
  startDisposal: (missionId: string) => void;
  dismissAlarm: (missionId: string) => void;
  getTotalDetainees: () => number;
  getEscortingCount: () => number;
}

interface PersistedState {
  rooms: DetentionRoom[];
  missions: EscortMission[];
  activeAlarms: string[];
}

const persisted = loadPersist<PersistedState>(PERSIST_KEY);

export const useDetentionStore = create<DetentionState>((set, get) => ({
  rooms: persisted?.rooms || mockDetentionRooms,
  missions: persisted?.missions || mockEscortMissions,
  activeAlarms: persisted?.activeAlarms || ['e2'],
  selectedRoom: null,
  selectedMission: null,

  setSelectedRoom: (r) => set({ selectedRoom: r }),
  setSelectedMission: (m) => set({ selectedMission: m }),

  getTotalDetainees: () => {
    return get().rooms.reduce((sum, r) => sum + r.currentCount, 0);
  },

  getEscortingCount: () => {
    return get().missions.filter((m) => m.status === 'in_progress').length;
  },

  startEscort: (detaineeId, courtroomName, fromRoom) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    const room = get().rooms.find((r) => r.detainees.some((d) => d.id === detaineeId));
    const detainee = room?.detainees.find((d) => d.id === detaineeId);
    if (!room || !detainee) return;

    const mission: EscortMission = {
      id: `e${Date.now()}`,
      detaineeId,
      detaineeName: detainee.name,
      fromRoom: fromRoom,
      toCourtroom: courtroomName,
      startTime: new Date().toLocaleString('zh-CN'),
      expectedReturn: new Date(Date.now() + 30 * 60 * 1000).toLocaleString('zh-CN'),
      escortOfficers: ['法警A', '法警B'],
      status: 'in_progress',
      progress: 0,
      pathPoints: [
        { x: room.position.x, y: 0, z: 6 },
        { x: room.position.x / 2, y: 0, z: 3 },
        { x: 0, y: 0, z: 0 },
      ],
      terminalPushed: true,
      disposalRecords: [],
    };

    set((s) => ({
      missions: [...s.missions, mission],
      rooms: s.rooms.map((r) =>
        r.id === room.id
          ? {
              ...r,
              detainees: r.detainees.map((d) =>
                d.id === detaineeId ? { ...d, status: 'escorting' as const } : d
              ),
            }
          : r
      ),
    }));
    savePersist(PERSIST_KEY, {
      rooms: get().rooms,
      missions: get().missions,
      activeAlarms: get().activeAlarms,
    });
    useAuthStore.getState().recordLog('发起押解任务', `${detainee.name} -> ${courtroomName}`);

    const timeoutId = setTimeout(() => {
      const current = get().missions.find((m) => m.id === mission.id);
      if (current && current.status !== 'completed') {
        get().triggerAlarm(mission.id);
      }
      missionTimeoutMap.delete(mission.id);
    }, 60 * 1000);
    missionTimeoutMap.set(mission.id, timeoutId);

    setTimeout(() => {
      const interval = setInterval(() => {
        const current = get().missions.find((m) => m.id === mission.id);
        if (!current || current.progress >= 100 || current.status === 'completed') {
          clearInterval(interval);
          return;
        }
        get().updateMissionProgress(mission.id, Math.min(current.progress + 10, 100));

        if (current.progress >= 100 && current.status === 'in_progress') {
          set((s) => ({
            missions: s.missions.map((m) =>
              m.id === mission.id
                ? {
                    ...m,
                    status: m.status === 'overdue' ? 'overdue' : 'in_progress',
                  }
                : m
            ),
            rooms: s.rooms.map((r) => ({
              ...r,
              detainees: r.detainees.map((d) =>
                d.id === detaineeId ? { ...d, status: 'hearing' as const } : d
              ),
            })),
          }));
          savePersist(PERSIST_KEY, {
            rooms: get().rooms,
            missions: get().missions,
            activeAlarms: get().activeAlarms,
          });
        }
      }, 2000);
    }, 1000);
  },

  completeMission: (missionId) => {
    const mission = get().missions.find((m) => m.id === missionId);
    if (!mission) return;

    const user = useAuthStore.getState().currentUser;
    const timeoutId = missionTimeoutMap.get(missionId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      missionTimeoutMap.delete(missionId);
    }

    set((s) => ({
      missions: s.missions.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status: 'completed',
              progress: 100,
              disposalRecords: [
                ...m.disposalRecords,
                {
                  action: 'complete_return' as const,
                  operator: user?.name || '系统',
                  operatorRole: user?.role,
                  timestamp: new Date().toLocaleString('zh-CN'),
                  note: '人员已安全归位',
                },
              ],
            }
          : m
      ),
      rooms: s.rooms.map((r) => ({
        ...r,
        detainees: r.detainees.map((d) =>
          d.id === mission.detaineeId ? { ...d, status: 'returned' as const } : d
        ),
      })),
      activeAlarms: s.activeAlarms.filter((id) => id !== missionId),
    }));
    savePersist(PERSIST_KEY, {
      rooms: get().rooms,
      missions: get().missions,
      activeAlarms: get().activeAlarms,
    });
    useAuthStore.getState().recordLog('完成押解任务', mission.detaineeName);
  },

  updateMissionProgress: (missionId, progress) => {
    set((s) => ({
      missions: s.missions.map((m) =>
        m.id === missionId ? { ...m, progress } : m
      ),
    }));
    savePersist(PERSIST_KEY, {
      rooms: get().rooms,
      missions: get().missions,
      activeAlarms: get().activeAlarms,
    });
  },

  triggerAlarm: (missionId) => {
    const user = useAuthStore.getState().currentUser;
    set((s) => ({
      activeAlarms: s.activeAlarms.includes(missionId)
        ? s.activeAlarms
        : [...s.activeAlarms, missionId],
      missions: s.missions.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status: 'overdue',
              disposalRecords: [
                ...m.disposalRecords,
                {
                  action: 'trigger_alarm' as const,
                  operator: user?.name || '系统',
                  operatorRole: user?.role,
                  timestamp: new Date().toLocaleString('zh-CN'),
                  note: '系统自动触发超时警报',
                },
              ],
            }
          : m
      ),
    }));
    savePersist(PERSIST_KEY, {
      rooms: get().rooms,
      missions: get().missions,
      activeAlarms: get().activeAlarms,
    });
    const mission = get().missions.find((m) => m.id === missionId);
    if (mission) {
      useAuthStore.getState().recordLog('触发押解超时警报', `${mission.detaineeName} 超30分钟未归`);
    }
  },

  startDisposal: (missionId) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    set((s) => ({
      missions: s.missions.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status: 'disposing',
              disposalRecords: [
                ...m.disposalRecords,
                {
                  action: 'start_disposal' as const,
                  operator: user.name,
                  operatorRole: user.role,
                  timestamp: new Date().toLocaleString('zh-CN'),
                  note: '已联系法警处置',
                },
              ],
            }
          : m
      ),
    }));
    savePersist(PERSIST_KEY, {
      rooms: get().rooms,
      missions: get().missions,
      activeAlarms: get().activeAlarms,
    });
    const mission = get().missions.find((m) => m.id === missionId);
    if (mission) {
      useAuthStore.getState().recordLog('开始处置押解警报', mission.detaineeName);
    }
  },

  dismissAlarm: (missionId) => {
    const mission = get().missions.find((m) => m.id === missionId);
    if (!mission || mission.status !== 'completed') return;

    set((s) => ({
      activeAlarms: s.activeAlarms.filter((id) => id !== missionId),
    }));
    savePersist(PERSIST_KEY, {
      rooms: get().rooms,
      missions: get().missions,
      activeAlarms: get().activeAlarms,
    });
  },
}));

useDetentionStore.subscribe((state) => {
  savePersist(PERSIST_KEY, {
    rooms: state.rooms,
    missions: state.missions,
    activeAlarms: state.activeAlarms,
  });
});
