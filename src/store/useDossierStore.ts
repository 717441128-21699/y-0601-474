import { create } from 'zustand';
import type { Dossier, DossierStatus } from '../types';
import { mockDossiers } from '../data/mockData';
import { useAuthStore } from './useAuthStore';
import { loadPersist, savePersist } from './persist';

const PERSIST_KEY = 'dossier-store';

interface DossierState {
  dossiers: Dossier[];
  selectedDossier: Dossier | null;
  setSelectedDossier: (d: Dossier | null) => void;
  submitDossier: (data: Partial<Dossier>) => boolean;
  formatCheck: (dossierId: string, errors?: string[]) => boolean;
  formatReject: (dossierId: string, errors: string[], reason: string) => boolean;
  initialReview: (dossierId: string, comment: string, pass: boolean) => boolean;
  chiefReview: (dossierId: string, comment: string, pass: boolean) => boolean;
  resubmitDossier: (dossierId: string) => boolean;
  canPerformAction: (action: 'format_check' | 'initial_review' | 'chief_review' | 'submit') => boolean;
  getDossiersByCourtroom: (courtroomId: string) => Dossier[];
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

const initialDossiers = loadPersist<Dossier[]>(PERSIST_KEY) || mockDossiers;

export const useDossierStore = create<DossierState>((set, get) => ({
  dossiers: initialDossiers,
  selectedDossier: null,

  setSelectedDossier: (d) => set({ selectedDossier: d }),

  canPerformAction: (action) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return false;
    const role = user.role;
    switch (action) {
      case 'format_check':
      case 'submit':
        return role === 'clerk';
      case 'initial_review':
        return role === 'judge';
      case 'chief_review':
        return role === 'chief' || role === 'president';
      default:
        return false;
    }
  },

  submitDossier: (data) => {
    if (!get().canPerformAction('submit')) return false;

    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

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
    savePersist(PERSIST_KEY, get().dossiers);
    useAuthStore.getState().recordLog('提交案卷', newDossier.caseNumber);
    return true;
  },

  formatCheck: (dossierId, errors) => {
    if (!get().canPerformAction('format_check')) return false;

    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

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
    savePersist(PERSIST_KEY, get().dossiers);
    useAuthStore.getState().recordLog('格式校验通过', `案卷ID: ${dossierId}`);
    return true;
  },

  formatReject: (dossierId, errors, reason) => {
    if (!get().canPerformAction('format_check')) return false;

    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

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
    savePersist(PERSIST_KEY, get().dossiers);
    useAuthStore.getState().recordLog('格式校验退回', `案卷ID: ${dossierId}, ${errors.length}处问题`);
    return true;
  },

  initialReview: (dossierId, comment, pass) => {
    if (!get().canPerformAction('initial_review')) return false;

    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

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
    savePersist(PERSIST_KEY, get().dossiers);
    useAuthStore.getState().recordLog(pass ? '法官初审通过' : '法官初审退回', `案卷ID: ${dossierId}`);
    return true;
  },

  chiefReview: (dossierId, comment, pass) => {
    if (!get().canPerformAction('chief_review')) return false;

    const user = useAuthStore.getState().currentUser;
    if (!user) return false;

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
    savePersist(PERSIST_KEY, get().dossiers);
    useAuthStore.getState().recordLog(pass ? '庭长批准通过' : '庭长审批退回', `案卷ID: ${dossierId}`);
    return true;
  },

  resubmitDossier: (dossierId) => {
    if (!get().canPerformAction('submit')) return false;

    set((s) => ({
      dossiers: s.dossiers.map((d) =>
        d.id === dossierId ? { ...d, status: 'format_checking' } : d
      ),
    }));
    savePersist(PERSIST_KEY, get().dossiers);
    useAuthStore.getState().recordLog('重新提交案卷', `案卷ID: ${dossierId}`);
    return true;
  },

  getDossiersByCourtroom: (courtroomId) => {
    return get().dossiers.filter((d) => d.courtroomId === courtroomId);
  },
}));

useDossierStore.subscribe((state) => {
  savePersist(PERSIST_KEY, state.dossiers);
});

export { STAGE_MAP };
