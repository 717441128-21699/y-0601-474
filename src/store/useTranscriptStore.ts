import { create } from 'zustand';
import type { Transcript } from '../types';
import { mockTranscripts } from '../data/mockData';
import { useAuthStore } from './useAuthStore';

interface TranscriptState {
  transcripts: Transcript[];
  selectedTranscript: Transcript | null;
  setSelectedTranscript: (t: Transcript | null) => void;
  updateTranscript: (id: string, content: string) => void;
  validateTranscript: (id: string) => { complete: boolean; missing: string[] };
  sendReminder: (id: string) => void;
  markFieldComplete: (id: string, field: keyof Transcript['keyFields'], value: boolean) => void;
  finalizeTranscript: (id: string) => void;
  calculateMissingItems: (t: Transcript) => string[];
}

export const useTranscriptStore = create<TranscriptState>((set, get) => ({
  transcripts: mockTranscripts,
  selectedTranscript: null,

  setSelectedTranscript: (t) => set({ selectedTranscript: t }),

  calculateMissingItems: (t) => {
    const missing: string[] = [];
    if (!t.keyFields.caseFacts) missing.push('案件事实陈述');
    if (!t.keyFields.evidence) missing.push('举证质证记录');
    if (!t.keyFields.finalStatement) missing.push('最后陈述');
    if (!t.keyFields.signatures) missing.push('各方签字确认');
    return missing;
  },

  updateTranscript: (id, content) => {
    set((s) => ({
      transcripts: s.transcripts.map((t) =>
        t.id === id
          ? {
              ...t,
              content,
              lastEdited: new Date().toLocaleString('zh-CN'),
              status: 'draft',
            }
          : t
      ),
    }));
  },

  validateTranscript: (id) => {
    const t = get().transcripts.find((x) => x.id === id);
    if (!t) return { complete: false, missing: [] };

    const missing = get().calculateMissingItems(t);
    const complete = missing.length === 0;

    set((s) => ({
      transcripts: s.transcripts.map((x) =>
        x.id === id
          ? {
              ...x,
              missingItems: missing,
              status: complete ? 'complete' : 'pending_revision',
            }
          : x
      ),
    }));

    useAuthStore.getState().recordLog(
      complete ? '笔录校验通过' : '笔录校验未通过',
      `${t.caseNumber}, 缺失${missing.length}项`
    );

    return { complete, missing };
  },

  sendReminder: (id) => {
    const t = get().transcripts.find((x) => x.id === id);
    if (!t) return;

    set((s) => ({
      transcripts: s.transcripts.map((x) =>
        x.id === id ? { ...x, remindersSent: x.remindersSent + 1 } : x
      ),
    }));
    useAuthStore.getState().recordLog(
      '发送笔录催办',
      `${t.caseNumber}, 第${t.remindersSent + 1}次催办`
    );
  },

  markFieldComplete: (id, field, value) => {
    set((s) => {
      const updated = s.transcripts.map((t) => {
        if (t.id !== id) return t;
        const newKeyFields = { ...t.keyFields, [field]: value };
        const newT: Transcript = { ...t, keyFields: newKeyFields };
        return {
          ...newT,
          missingItems: get().calculateMissingItems(newT),
          lastEdited: new Date().toLocaleString('zh-CN'),
        };
      });
      return { transcripts: updated };
    });
    const user = useAuthStore.getState().currentUser;
    if (user) {
      useAuthStore.getState().recordLog('更新笔录关键字段', `笔录ID: ${id}`);
    }
  },

  finalizeTranscript: (id) => {
    const { complete } = get().validateTranscript(id);
    if (!complete) return;

    set((s) => ({
      transcripts: s.transcripts.map((t) =>
        t.id === id ? { ...t, status: 'complete' } : t
      ),
    }));
    const t = get().transcripts.find((x) => x.id === id);
    if (t) {
      useAuthStore.getState().recordLog('笔录归档完成', t.caseNumber);
    }
  },
}));
