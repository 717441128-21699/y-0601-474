import { create } from 'zustand';
import type { Dossier, DossierStatus } from '../types';
import { mockDossiers } from '../data/mockData';
import { useAuthStore } from './useAuthStore';

interface DossierState {
  dossiers: Dossier[];
  selectedDossier: Dossier | null;
  setSelectedDossier: (d: Dossier | null) => void;
  submitDossier: (data: Partial<Dossier>) => void;
  formatCheck: (dossierId: string, errors?: string[]) => void;
  formatReject: (dossierId: string, errors: string[], reason: string) => void;
  initialReview: (dossierId: string, comment: string, pass: boolean) => void;
  chiefReview: (dossierId: string, comment: string, pass: boolean) => void;
  resubmitDossier: (dossierId: string) => void;
}

const STAGE_MAP: Record<DossierStatus, string> = {
  submitted: '待格式校验',
  format_checking: '格式校验中',
  format_rejected: '格式校验退回',
  initial_review: '法官初审中',
  initial_rejected: '法官初审退回',
  chief_review: '庭长审批中',
  chief_rejected: '庭长审批退回',
  approved: '审批通过',
  archived: '已归档',
};

export const useDossierStore = create<DossierState>((set) => ({
  dossiers: mockDossiers,
  selectedDossier: null,

  setSelectedDossier: (d) => set({ selectedDossier: d }),

  submitDossier: (data) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    const newDossier: Dossier = {
      id: `dos${Date.now()}`,
      caseNumber: data.caseNumber || '',
      name: data.name || '新卷宗',
      submittedBy: user.name,
      submittedAt: new Date().toLocaleString('zh-CN'),
      status: 'submitted',
      pages: data.pages || 0,
      materials: data.materials || [],
      reviewHistory: [],
    };
    set((s) => ({ dossiers: [...s.dossiers, newDossier] }));
    useAuthStore.getState().recordLog('提交案卷', newDossier.caseNumber);
  },

  formatCheck: (dossierId, errors) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    set((s) => ({
      dossiers: s.dossiers.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              status: 'initial_review',
              reviewHistory: [
                ...d.reviewHistory,
                {
                  stage: '格式校验',
                  reviewer: user.name,
                  result: 'pass',
                  comment: '格式检查通过',
                  timestamp: new Date().toLocaleString('zh-CN'),
                },
              ],
              formatErrors: undefined,
              rejectReason: undefined,
            }
          : d
      ),
    }));
    useAuthStore.getState().recordLog('格式校验通过', `案卷ID: ${dossierId}`);
  },

  formatReject: (dossierId, errors, reason) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    set((s) => ({
      dossiers: s.dossiers.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              status: 'format_rejected',
              formatErrors: errors,
              rejectReason: reason,
              reviewHistory: [
                ...d.reviewHistory,
                {
                  stage: '格式校验',
                  reviewer: user.name,
                  result: 'reject',
                  comment: reason,
                  timestamp: new Date().toLocaleString('zh-CN'),
                },
              ],
            }
          : d
      ),
    }));
    useAuthStore.getState().recordLog('格式校验退回', `案卷ID: ${dossierId}, ${errors.length}处问题`);
  },

  initialReview: (dossierId, comment, pass) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    set((s) => ({
      dossiers: s.dossiers.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              status: pass ? 'chief_review' : 'initial_rejected',
              reviewHistory: [
                ...d.reviewHistory,
                {
                  stage: '法官初审',
                  reviewer: user.name,
                  result: pass ? 'pass' : 'reject',
                  comment,
                  timestamp: new Date().toLocaleString('zh-CN'),
                },
              ],
              rejectReason: pass ? undefined : comment,
            }
          : d
      ),
    }));
    useAuthStore.getState().recordLog(pass ? '法官初审通过' : '法官初审退回', `案卷ID: ${dossierId}`);
  },

  chiefReview: (dossierId, comment, pass) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return;

    set((s) => ({
      dossiers: s.dossiers.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              status: pass ? 'approved' : 'chief_rejected',
              reviewHistory: [
                ...d.reviewHistory,
                {
                  stage: '庭长批准',
                  reviewer: user.name,
                  result: pass ? 'pass' : 'reject',
                  comment,
                  timestamp: new Date().toLocaleString('zh-CN'),
                },
              ],
              rejectReason: pass ? undefined : comment,
            }
          : d
      ),
    }));
    useAuthStore.getState().recordLog(pass ? '庭长批准通过' : '庭长审批退回', `案卷ID: ${dossierId}`);
  },

  resubmitDossier: (dossierId) => {
    set((s) => ({
      dossiers: s.dossiers.map((d) =>
        d.id === dossierId ? { ...d, status: 'format_checking' } : d
      ),
    }));
    useAuthStore.getState().recordLog('重新提交案卷', `案卷ID: ${dossierId}`);
  },
}));

export { STAGE_MAP };
