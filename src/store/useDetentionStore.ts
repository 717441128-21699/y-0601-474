import { create } from 'zustand';
import type { DetentionRoom, EscortMission } from '../types';
import { mockDetentionRooms, mockEscortMissions } from '../data/mockData';
import { useAuthStore } from './useAuthStore';

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
  dismissAlarm: (missionId: string) => void;
  getTotalDetainees: () => number;
  getEscortingCount: () => number;
}

export const useDetentionStore = create<DetentionState>((set, get) => ({
  rooms: mockDetentionRooms,
  missions: mockEscortMissions,
  activeAlarms: ['e2'],
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
    useAuthStore.getState().recordLog('发起押解任务', `${detainee.name} -> ${courtroomName}`);

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
        }
      }, 2000);
    }, 1000);
  },

  completeMission: (missionId) => {
    const mission = get().missions.find((m) => m.id === missionId);
    if (!mission) return;

    set((s) => ({
      missions: s.missions.map((m) =>
        m.id === missionId ? { ...m, status: 'completed', progress: 100 } : m
      ),
      rooms: s.rooms.map((r) => ({
        ...r,
        detainees: r.detainees.map((d) =>
          d.id === mission.detaineeId ? { ...d, status: 'returned' as const } : d
        ),
      })),
      activeAlarms: s.activeAlarms.filter((id) => id !== missionId),
    }));
    useAuthStore.getState().recordLog('完成押解任务', mission.detaineeName);
  },

  updateMissionProgress: (missionId, progress) => {
    set((s) => ({
      missions: s.missions.map((m) =>
        m.id === missionId ? { ...m, progress } : m
      ),
    }));
  },

  triggerAlarm: (missionId) => {
    set((s) => ({
      activeAlarms: s.activeAlarms.includes(missionId)
        ? s.activeAlarms
        : [...s.activeAlarms, missionId],
      missions: s.missions.map((m) =>
        m.id === missionId ? { ...m, status: 'overdue' } : m
      ),
    }));
    const mission = get().missions.find((m) => m.id === missionId);
    if (mission) {
      useAuthStore.getState().recordLog('触发押解超时警报', `${mission.detaineeName} 超30分钟未归`);
    }
  },

  dismissAlarm: (missionId) => {
    set((s) => ({
      activeAlarms: s.activeAlarms.filter((id) => id !== missionId),
    }));
  },
}));
