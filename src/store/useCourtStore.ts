import { create } from 'zustand';
import type { CourtCase, Courtroom, Approval, ApprovalStage, CaseType, PriorityLevel, UserRole } from '../types';
import { mockCases, mockCourtrooms, mockApprovals } from '../data/mockData';
import { useAuthStore } from './useAuthStore';
import { loadPersist, savePersist } from './persist';

export interface ConflictInfo {
  hasConflict: boolean;
  type: 'none' | 'high-high' | 'high-low' | 'overlap';
  conflictingCase?: CourtCase;
}

export interface SuitabilityInfo {
  suitableTypes: CaseType[];
  hasRemoteTerminal: boolean;
  hasEvidenceDisplay: boolean;
  capacity: number;
}

export interface CourtRecommendation {
  courtroom: Courtroom;
  score: number;
  reason: string;
  equipment: string[];
  conflictInfo: ConflictInfo;
  suitability: SuitabilityInfo;
  matchingDetails: string[];
}

interface CourtState {
  cases: CourtCase[];
  courtrooms: Courtroom[];
  approvals: Approval[];
  selectedCase: CourtCase | null;
  selectedCourtroom: Courtroom | null;
  scheduleAnimationActive: boolean;
  setSelectedCase: (c: CourtCase | null) => void;
  setSelectedCourtroom: (cr: Courtroom | null) => void;
  assignCourtroom: (caseId: string, courtroomId: string) => boolean;
  detectConflict: (caseType: CaseType, priority: PriorityLevel, time: string, courtroomId: string, excludeCaseId?: string) => CourtCase | null;
  getTimeSlotOverlaps: (time: string, excludeCourtroomId?: string) => CourtCase[];
  isHighHighConflict: (caseType: CaseType, priority: PriorityLevel, time: string, courtroomId: string, excludeCaseId?: string) => boolean;
  recommendCourtroom: (caseType: CaseType, priority: PriorityLevel, time: string, chiefJudge?: string) => CourtRecommendation | null;
  recommendCourtrooms: (caseType: CaseType, priority: PriorityLevel, time: string, chiefJudge?: string) => CourtRecommendation[];
  submitApproval: (caseId: string, type: 'schedule_conflict' | 'dossier' | 'other', description?: string) => void;
  approveAtStage: (approvalId: string, stage: ApprovalStage, comment: string, result: 'approved' | 'rejected') => boolean;
  canApproveAtStage: (stage: ApprovalStage) => boolean;
  updateCaseStatus: (caseId: string, status: CourtCase['status']) => void;
  requestNewSchedule: (caseData: Partial<CourtCase>) => { success: boolean; conflict?: CourtCase; needsApproval?: boolean };
  triggerScheduleAnimation: () => void;
  getCaseDossiers: (caseNumber: string) => any[];
  persistState: () => void;
}

const PERSIST_KEY = 'court-store';

const persisted = loadPersist<{
  cases: CourtCase[];
  approvals: Approval[];
}>(PERSIST_KEY);

export const useCourtStore = create<CourtState>((set, get) => ({
  cases: persisted?.cases || mockCases,
  courtrooms: mockCourtrooms,
  approvals: persisted?.approvals || mockApprovals,
  selectedCase: null,
  selectedCourtroom: null,
  scheduleAnimationActive: false,

  setSelectedCase: (c) => set({ selectedCase: c }),
  setSelectedCourtroom: (cr) => set({ selectedCourtroom: cr }),

  detectConflict: (caseType, priority, time, courtroomId, excludeCaseId) => {
    const conflicting = get().cases.find((c) => {
      if (excludeCaseId && c.id === excludeCaseId) return false;
      return (
        c.scheduledTime === time &&
        c.courtroomId === courtroomId &&
        c.status !== 'closed'
      );
    });
    return conflicting || null;
  },

  getTimeSlotOverlaps: (time, excludeCourtroomId) => {
    return get().cases.filter((c) => {
      if (excludeCourtroomId && c.courtroomId === excludeCourtroomId) return false;
      return c.scheduledTime === time && c.status !== 'closed';
    });
  },

  isHighHighConflict: (caseType, priority, time, courtroomId, excludeCaseId) => {
    const conflicting = get().detectConflict(caseType, priority, time, courtroomId, excludeCaseId);
    if (!conflicting) return false;
    return priority === 'high' && conflicting.priority === 'high';
  },

  recommendCourtroom: (caseType, priority, time, chiefJudge) => {
    const top3 = get().recommendCourtrooms(caseType, priority, time, chiefJudge);
    return top3.length > 0 ? top3[0] : null;
  },

  recommendCourtrooms: (caseType, priority, time, chiefJudge) => {
    const { courtrooms, cases, detectConflict, isHighHighConflict, getTimeSlotOverlaps } = get();

    const caseTypeLabels: Record<CaseType, string> = {
      criminal: '刑事',
      civil: '民事',
      administrative: '行政',
    };

    const buildConflictInfo = (room: Courtroom): ConflictInfo => {
      const conflicting = detectConflict(caseType, priority, time, room.id);
      if (!conflicting) {
        return { hasConflict: false, type: 'none' };
      }
      if (isHighHighConflict(caseType, priority, time, room.id)) {
        return { hasConflict: true, type: 'high-high', conflictingCase: conflicting };
      }
      if (priority === 'high' || conflicting.priority === 'high') {
        return { hasConflict: true, type: 'high-low', conflictingCase: conflicting };
      }
      return { hasConflict: true, type: 'overlap', conflictingCase: conflicting };
    };

    const buildSuitability = (room: Courtroom): SuitabilityInfo => ({
      suitableTypes: room.suitableTypes,
      hasRemoteTerminal: room.equipment.includes('远程庭审终端'),
      hasEvidenceDisplay: room.equipment.includes('证据展示台'),
      capacity: room.capacity,
    });

    const buildMatchingDetails = (room: Courtroom, conflict: ConflictInfo): string[] => {
      const details: string[] = [];

      if (room.suitableTypes.includes(caseType)) {
        const suitableLabels = room.suitableTypes.map((t) => caseTypeLabels[t]).join('/');
        details.push(`法庭类型适配${suitableLabels}案件`);
      } else {
        details.push(`法庭类型非最佳适配`);
      }

      if (room.equipment.includes('远程庭审终端')) {
        details.push('配备远程庭审终端');
      }

      if (room.equipment.includes('证据展示台')) {
        details.push('配备证据展示台');
      }

      details.push(`${room.capacity}座容量保障`);

      const overlaps = getTimeSlotOverlaps(time, room.id);
      if (overlaps.length > 0) {
        details.push(`其他法庭同时段有${overlaps.length}个排期（仅风险提示）`);
      }

      if (!conflict.hasConflict) {
        details.push('本法庭此时段空闲无冲突');
      } else if (conflict.type === 'high-high') {
        details.push(`本法庭冲突：与${conflict.conflictingCase?.caseNumber}高优先级案件撞期（需三级审批）`);
      } else if (conflict.type === 'high-low') {
        details.push(`本法庭重叠：与${conflict.conflictingCase?.caseNumber}案件撞期（高优先级优先安排）`);
      } else {
        details.push(`本法庭重叠：与${conflict.conflictingCase?.caseNumber}案件同时段`);
      }

      return details;
    };

    const occupiedRoomIds = cases
      .filter((c) => c.scheduledTime === time && c.status !== 'closed')
      .map((c) => c.courtroomId);

    const availableRooms = courtrooms.filter(
      (r) => r.status === 'available' && !occupiedRoomIds.includes(r.id)
    );

    let roomsToScore: Courtroom[] = [];
    if (availableRooms.length === 0) {
      roomsToScore = courtrooms.filter((r) => r.status !== 'maintenance');
    } else {
      roomsToScore = availableRooms;
    }

    if (roomsToScore.length === 0) return [];

    const scored = roomsToScore.map((room) => {
      const conflictInfo = buildConflictInfo(room);
      let score = 0;
      const reasons: string[] = [];

      if (room.suitableTypes.includes(caseType)) {
        score += 40;
        reasons.push('案件类型适配');
      }

      if (priority === 'high') {
        if (room.capacity >= 20) {
          score += 20;
          reasons.push('大容量法庭保障');
        }
        if (room.equipment.includes('远程庭审终端')) {
          score += 15;
          reasons.push('支持远程庭审');
        }
      }

      if (room.equipment.length >= 3) {
        score += 15;
        reasons.push('设备配置完善');
      }

      score += Math.min(room.capacity / 5, 10);

      if (conflictInfo.hasConflict && conflictInfo.type === 'high-high') {
        score -= 50;
      } else if (conflictInfo.hasConflict) {
        score -= 20;
      }

      const equipment: string[] = [];
      equipment.push('高清庭审直播系统');
      if (caseType === 'criminal' || priority === 'high') {
        equipment.push('远程庭审终端');
      }
      if (room.equipment.includes('证据展示台')) {
        equipment.push('证据展示台');
      }
      equipment.push('庭审录音录像系统');

      return {
        courtroom: room,
        score: Math.max(0, score),
        reason: reasons.length > 0 ? reasons.join('、') : '基础配置',
        equipment,
        conflictInfo,
        suitability: buildSuitability(room),
        matchingDetails: buildMatchingDetails(room, conflictInfo),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  },

  assignCourtroom: (caseId, courtroomId) => {
    const room = get().courtrooms.find((r) => r.id === courtroomId);
    if (!room || room.status === 'maintenance') return false;

    set((state) => ({
      cases: state.cases.map((c) => (c.id === caseId ? { ...c, courtroomId } : c)),
    }));
    useAuthStore.getState().recordLog('分配法庭', `案件${caseId} -> ${room.name}`);
    get().persistState();
    return true;
  },

  submitApproval: (caseId, type, description) => {
    const caseItem = get().cases.find((c) => c.id === caseId);
    if (!caseItem) return;

    const newApproval: Approval = {
      id: `a${Date.now()}`,
      caseNumber: caseItem.caseNumber,
      caseTitle: caseItem.title,
      type,
      currentStage: 'judge',
      result: 'pending',
      conflictDescription: description,
      timeline: [],
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    set((state) => ({ approvals: [...state.approvals, newApproval] }));
    useAuthStore.getState().recordLog('提交审批', `${caseItem.caseNumber}`);
    get().persistState();
  },

  canApproveAtStage: (stage) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

    const roleStageMap: Record<UserRole, ApprovalStage | null> = {
      clerk: null,
      judge: 'judge',
      chief: 'chief',
      president: 'president',
    };

    const userStage = roleStageMap[user.role];
    if (!userStage) return false;

    const stageOrder: ApprovalStage[] = ['judge', 'chief', 'president'];
    return stageOrder.indexOf(userStage) === stageOrder.indexOf(stage);
  },

  approveAtStage: (approvalId, stage, comment, result) => {
    if (!get().canApproveAtStage(stage)) {
      return false;
    }

    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

    const approval = get().approvals.find((a) => a.id === approvalId);
    if (!approval || approval.currentStage !== stage) return false;
    if (approval.result !== 'pending') return false;

    const stageOrder: ApprovalStage[] = ['judge', 'chief', 'president'];
    const currentIdx = stageOrder.indexOf(stage);

    const isFinalApproval = result === 'approved' && currentIdx === stageOrder.length - 1;

    set((state) => {
      const newApprovals = state.approvals.map((a) => {
        if (a.id !== approvalId) return a;
        const newTimeline = [
          ...a.timeline,
          {
            stage,
            approver: user.name,
            approverRole: user.role,
            result: result as 'approved' | 'rejected' | 'pending',
            comment,
            timestamp: new Date().toLocaleString('zh-CN'),
          },
        ];

        let nextStage: ApprovalStage = stage;
        let finalResult: Approval['result'] = 'pending';

        if (result === 'rejected') {
          finalResult = 'rejected';
        } else if (currentIdx === stageOrder.length - 1) {
          finalResult = 'approved';
        } else {
          nextStage = stageOrder[currentIdx + 1];
        }

        return {
          ...a,
          timeline: newTimeline,
          currentStage: nextStage,
          result: finalResult,
        };
      });

      let newCases = state.cases;
      if (isFinalApproval) {
        newCases = state.cases.map((c) =>
          c.caseNumber === approval.caseNumber ? { ...c, conflictId: undefined } : c
        );
        get().triggerScheduleAnimation();
      }

      return {
        approvals: newApprovals,
        cases: newCases,
      };
    });
    useAuthStore.getState().recordLog(result === 'approved' ? '审批通过' : '审批驳回', `审批ID: ${approvalId}`);
    get().persistState();
    return true;
  },

  updateCaseStatus: (caseId, status) => {
    set((state) => ({
      cases: state.cases.map((c) => (c.id === caseId ? { ...c, status } : c)),
    }));
    const c = get().cases.find((x) => x.id === caseId);
    if (c) {
      useAuthStore.getState().recordLog(`更新庭审状态`, `${c.caseNumber} -> ${status}`);
    }
    get().persistState();
  },

  requestNewSchedule: (caseData) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return { success: false };

    const newCase: CourtCase = {
      id: `c${Date.now()}`,
      caseNumber: caseData.caseNumber || `(2026)京民初字第${Math.floor(Math.random() * 9000 + 1000)}号`,
      type: caseData.type || 'civil',
      title: caseData.title || '新案件',
      parties: caseData.parties || { plaintiff: '原告', defendant: '被告' },
      panel: caseData.panel || { chiefJudge: user.name, judges: [], clerk: '' },
      status: 'pending',
      priority: caseData.priority || 'medium',
      scheduledTime: caseData.scheduledTime || new Date().toLocaleString('zh-CN'),
      estimatedDuration: caseData.estimatedDuration || 60,
      courtroomId: caseData.courtroomId || 'cr3',
      equipment: caseData.equipment || [],
      ...(caseData.autoAssigned === true && {
        autoAssigned: true,
        assignReason: caseData.assignReason,
      }),
    };

    const isHighHigh = get().isHighHighConflict(
      newCase.type,
      newCase.priority,
      newCase.scheduledTime,
      newCase.courtroomId
    );
    const conflict = get().detectConflict(
      newCase.type,
      newCase.priority,
      newCase.scheduledTime,
      newCase.courtroomId
    );

    set((state) => ({ cases: [...state.cases, newCase] }));

    if (isHighHigh) {
      newCase.conflictId = `conflict-${Date.now()}`;
      set((state) => ({
        cases: state.cases.map((c) => (c.id === newCase.id ? { ...c, conflictId: newCase.conflictId } : c)),
      }));
      get().submitApproval(newCase.id, 'schedule_conflict', `与${conflict?.caseNumber}在${newCase.scheduledTime}时段冲突（双高优先级）`);
      get().persistState();
      return { success: true, conflict, needsApproval: true };
    }

    useAuthStore.getState().recordLog('新建排期', newCase.caseNumber);
    get().persistState();
    return { success: true, conflict, needsApproval: false };
  },

  triggerScheduleAnimation: () => {
    set({ scheduleAnimationActive: true });
    setTimeout(() => set({ scheduleAnimationActive: false }), 5000);
  },

  getCaseDossiers: (caseNumber) => {
    // 从 dossier store 获取关联案卷 - 后面引入会循环依赖，这里通过window事件或单独调用
    // 临时返回空，由页面组件自己关联
    return [];
  },

  persistState: () => {
    const { cases, approvals } = get();
    savePersist(PERSIST_KEY, { cases, approvals });
  },
}));

useCourtStore.subscribe((state) => {
  savePersist(PERSIST_KEY, {
    cases: state.cases,
    approvals: state.approvals,
  });
});
