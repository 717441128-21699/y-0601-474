import { create } from 'zustand';
import type { CourtCase, Courtroom, Approval, ApprovalStage, CaseType, PriorityLevel } from '../types';
import { mockCases, mockCourtrooms, mockApprovals } from '../data/mockData';
import { useAuthStore } from './useAuthStore';

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
  detectConflict: (caseType: CaseType, priority: PriorityLevel, time: string, excludeCaseId?: string) => CourtCase | null;
  submitApproval: (caseId: string, type: 'schedule_conflict' | 'dossier' | 'other', description?: string) => void;
  approveAtStage: (approvalId: string, stage: ApprovalStage, comment: string, result: 'approved' | 'rejected') => void;
  updateCaseStatus: (caseId: string, status: CourtCase['status']) => void;
  requestNewSchedule: (caseData: Partial<CourtCase>) => void;
  triggerScheduleAnimation: () => void;
}

export const useCourtStore = create<CourtState>((set, get) => ({
  cases: mockCases,
  courtrooms: mockCourtrooms,
  approvals: mockApprovals,
  selectedCase: null,
  selectedCourtroom: null,
  scheduleAnimationActive: false,

  setSelectedCase: (c) => set({ selectedCase: c }),
  setSelectedCourtroom: (cr) => set({ selectedCourtroom: cr }),

  detectConflict: (caseType, priority, time, excludeCaseId) => {
    const conflicting = get().cases.find((c) => {
      if (excludeCaseId && c.id === excludeCaseId) return false;
      return (
        c.scheduledTime === time &&
        (priority === 'high' || c.priority === 'high') &&
        c.status !== 'closed'
      );
    });
    return conflicting || null;
  },

  assignCourtroom: (caseId, courtroomId) => {
    const room = get().courtrooms.find((r) => r.id === courtroomId);
    if (!room || room.status === 'maintenance') return false;

    set((state) => ({
      cases: state.cases.map((c) => (c.id === caseId ? { ...c, courtroomId } : c)),
    }));
    useAuthStore.getState().recordLog('分配法庭', `案件${caseId} -> ${room.name}`);
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
  },

  approveAtStage: (approvalId, stage, comment, result) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    const stageOrder: ApprovalStage[] = ['judge', 'chief', 'president'];
    const currentIdx = stageOrder.indexOf(stage);

    set((state) => ({
      approvals: state.approvals.map((a) => {
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
          get().triggerScheduleAnimation();
        } else {
          nextStage = stageOrder[currentIdx + 1];
        }

        return {
          ...a,
          timeline: newTimeline,
          currentStage: nextStage,
          result: finalResult,
        };
      }),
    }));
    useAuthStore.getState().recordLog(result === 'approved' ? '审批通过' : '审批驳回', `审批ID: ${approvalId}`);
  },

  updateCaseStatus: (caseId, status) => {
    set((state) => ({
      cases: state.cases.map((c) => (c.id === caseId ? { ...c, status } : c)),
    }));
    const c = get().cases.find((x) => x.id === caseId);
    if (c) {
      useAuthStore.getState().recordLog(`更新庭审状态`, `${c.caseNumber} -> ${status}`);
    }
  },

  requestNewSchedule: (caseData) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

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
    };

    const conflict = get().detectConflict(newCase.type, newCase.priority, newCase.scheduledTime);
    set((state) => ({ cases: [...state.cases, newCase] }));

    if (conflict && (newCase.priority === 'high' || conflict.priority === 'high')) {
      get().submitApproval(newCase.id, 'schedule_conflict', `与${conflict.caseNumber}在${newCase.scheduledTime}时段冲突`);
    }
    useAuthStore.getState().recordLog('新建排期', newCase.caseNumber);
  },

  triggerScheduleAnimation: () => {
    set({ scheduleAnimationActive: true });
    setTimeout(() => set({ scheduleAnimationActive: false }), 5000);
  },
}));
