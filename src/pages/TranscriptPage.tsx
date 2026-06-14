import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Edit,
  CheckSquare,
  Bell,
  AlertCircle,
  Save,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useTranscriptStore } from '../store/useTranscriptStore';
import { StatusBadge } from '../components/StatusBadge';
import type { Transcript } from '../types';

const STATUS_FILTERS: { value: 'all' | 'draft' | 'complete' | 'pending_revision'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_revision', label: '待补录' },
  { value: 'complete', label: '完整' },
];

const KEY_FIELDS: { key: keyof Transcript['keyFields']; label: string }[] = [
  { key: 'caseFacts', label: '案件事实陈述' },
  { key: 'evidence', label: '举证质证记录' },
  { key: 'finalStatement', label: '最后陈述' },
  { key: 'signatures', label: '各方签字确认' },
];

export const TranscriptPage: React.FC = () => {
  const {
    transcripts,
    selectedTranscript,
    setSelectedTranscript,
    updateTranscript,
    validateTranscript,
    sendReminder,
    markFieldComplete,
    calculateMissingItems,
  } = useTranscriptStore();

  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'complete' | 'pending_revision'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (selectedTranscript) {
      setEditingContent(selectedTranscript.content);
    }
  }, [selectedTranscript]);

  useEffect(() => {
    if (!selectedTranscript) return;
    const timer = setTimeout(() => {
      if (editingContent !== selectedTranscript.content) {
        setSaveStatus('saving');
        updateTranscript(selectedTranscript.id, editingContent);
        setTimeout(() => setSaveStatus('saved'), 500);
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [editingContent, selectedTranscript, updateTranscript]);

  const filteredTranscripts = useMemo(() => {
    return transcripts.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        return (
          t.caseNumber.toLowerCase().includes(kw) ||
          t.caseTitle.toLowerCase().includes(kw) ||
          t.editor.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [transcripts, statusFilter, searchKeyword]);

  const completionProgress = useMemo(() => {
    if (!selectedTranscript) return 0;
    const completed = Object.values(selectedTranscript.keyFields).filter(Boolean).length;
    return (completed / 4) * 100;
  }, [selectedTranscript]);

  const reminderList = useMemo(() => {
    return transcripts
      .filter((t) => t.status !== 'complete')
      .map((t) => ({ ...t, missingCount: calculateMissingItems(t).length }))
      .sort((a, b) => b.missingCount - a.missingCount || b.remindersSent - a.remindersSent);
  }, [transcripts, calculateMissingItems]);

  const handleValidate = () => {
    if (!selectedTranscript) return;
    validateTranscript(selectedTranscript.id);
  };

  const handleSendReminder = (id: string) => {
    sendReminder(id);
  };

  const handleFieldToggle = (field: keyof Transcript['keyFields'], value: boolean) => {
    if (!selectedTranscript) return;
    markFieldComplete(selectedTranscript.id, field, value);
  };

  const currentMissingItems = selectedTranscript
    ? selectedTranscript.missingItems.length > 0
      ? selectedTranscript.missingItems
      : calculateMissingItems(selectedTranscript)
    : [];

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-court-blue/30 to-court-blue/10 border border-court-blue/40 shadow-glow-blue">
            <FileText className="text-court-blue" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-slate-100 tracking-wide">
              庭审笔录管理
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              共 {transcripts.length} 份笔录 · {transcripts.filter((t) => t.status === 'complete').length} 份完整
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-[28%] glass-card border rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="搜索案号/案件名/编辑人..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-black/20 border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-court-gold/50 transition-colors"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="px-3 py-2 text-sm rounded-lg bg-black/20 border border-slate-700/50 text-slate-200 hover:border-court-gold/50 transition-colors flex items-center gap-1.5"
                >
                  {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
                  <ChevronDown size={14} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showStatusDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-32 glass-panel py-2 z-50">
                    {STATUS_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => {
                          setStatusFilter(f.value);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-court-gold/10 transition-colors ${
                          statusFilter === f.value ? 'text-court-gold' : 'text-slate-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {filteredTranscripts.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTranscript(t)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  selectedTranscript?.id === t.id
                    ? 'bg-court-gold/10 border-court-gold/40 shadow-[0_0_20px_rgba(201,168,108,0.1)]'
                    : 'bg-black/15 border-slate-700/30 hover:border-court-gold/30 hover:bg-black/25'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-court-gold mb-1">{t.caseNumber}</p>
                    <p className="text-sm font-medium text-slate-200 truncate">{t.caseTitle}</p>
                  </div>
                  <StatusBadge type="transcript" status={t.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Edit size={11} />
                    <span>{t.editor}</span>
                  </div>
                  <span className="font-mono">{t.lastEdited.split(' ')[0]}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/20">
                  <div className="flex items-center gap-1 text-xs">
                    <AlertCircle size={11} className="text-court-orange" />
                    <span className="text-court-orange">缺失 {calculateMissingItems(t).length} 项</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Bell size={11} className="text-slate-500" />
                    <span className="text-slate-400">催办 {t.remindersSent} 次</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredTranscripts.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                <FileText size={32} className="mb-2 opacity-40" />
                <p className="text-sm">暂无匹配的笔录</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 glass-card border rounded-2xl overflow-hidden flex flex-col min-h-0">
          {selectedTranscript ? (
            <>
              <div className="p-5 border-b border-slate-700/50 flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-court-gold">{selectedTranscript.caseNumber}</span>
                      <StatusBadge type="transcript" status={selectedTranscript.status} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-100 truncate">{selectedTranscript.caseTitle}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      编辑人：{selectedTranscript.editor} · 最后编辑：{selectedTranscript.lastEdited}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {saveStatus === 'saving' && (
                      <span className="text-court-orange flex items-center gap-1">
                        <Save size={12} className="animate-pulse" />
                        保存中...
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-court-green flex items-center gap-1">
                        <CheckSquare size={12} />
                        已保存
                      </span>
                    )}
                    {saveStatus === 'idle' && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Save size={12} />
                        实时保存
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">关键字段完成度</span>
                    <span className="text-xs font-mono text-court-gold">
                      {Math.round(completionProgress)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        completionProgress === 100
                          ? 'bg-gradient-to-r from-court-green to-court-green/70'
                          : 'bg-gradient-to-r from-court-gold to-court-orange'
                      }`}
                      style={{ width: `${completionProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-5">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  placeholder="在此输入庭审笔录内容..."
                  className="w-full h-full resize-none rounded-xl bg-black/20 border border-slate-700/40 p-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-court-gold/40 transition-colors leading-relaxed custom-scrollbar"
                />
              </div>

              <div className="border-t border-slate-700/50 p-5 flex-shrink-0">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {KEY_FIELDS.map(({ key, label }) => {
                    const checked = selectedTranscript.keyFields[key];
                    const isMissing = currentMissingItems.includes(label);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isMissing
                            ? 'bg-court-orange/5 border-court-orange/30'
                            : checked
                            ? 'bg-court-green/5 border-court-green/30'
                            : 'bg-black/15 border-slate-700/30 hover:border-slate-600/50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            checked
                              ? 'bg-court-green border-court-green'
                              : isMissing
                              ? 'border-court-orange'
                              : 'border-slate-600'
                          }`}
                        >
                          {checked && <CheckSquare size={14} className="text-court-bg" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${checked ? 'text-court-green' : isMissing ? 'text-court-orange' : 'text-slate-300'}`}>
                            {label}
                          </span>
                          {isMissing && (
                            <p className="text-[10px] text-court-orange/70 mt-0.5">待补录</p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleFieldToggle(key, e.target.checked)}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>

                {currentMissingItems.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-court-orange/5 border border-court-orange/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} className="text-court-orange flex-shrink-0" />
                      <span className="text-xs font-medium text-court-orange">缺失项列表</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentMissingItems.map((item) => (
                        <span
                          key={item}
                          className="px-2.5 py-1 text-xs rounded-lg bg-court-orange/15 text-court-orange border border-court-orange/30"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {selectedTranscript.remindersSent > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Bell size={11} className="text-court-orange" />
                        <span className="text-court-orange">
                          已发送催办 {selectedTranscript.remindersSent} 次
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSendReminder(selectedTranscript.id)}
                      className="btn-secondary flex items-center gap-2 text-sm py-2"
                    >
                      <Bell size={14} />
                      催办补录
                    </button>
                    <button
                      onClick={handleValidate}
                      className="btn-primary flex items-center gap-2 text-sm py-2"
                    >
                      <CheckSquare size={14} />
                      校验笔录
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <FileText size={48} className="mb-4 opacity-30" />
              <p className="text-base mb-1">请从左侧选择一份笔录</p>
              <p className="text-sm text-slate-600">或使用搜索功能查找笔录</p>
            </div>
          )}
        </div>

        <div className="w-[22%] glass-card border rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-court-orange/20">
                <Bell size={16} className="text-court-orange" />
              </div>
              <h3 className="text-base font-bold text-slate-100">补录催办面板</h3>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              共 {reminderList.length} 份待补录笔录
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {reminderList.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTranscript(transcripts.find((x) => x.id === t.id) || null)}
                className="p-3 rounded-xl bg-black/15 border border-slate-700/30 hover:border-court-gold/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-court-gold mb-1">{t.caseNumber}</p>
                    <p className="text-sm font-medium text-slate-200 truncate">{t.caseTitle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <AlertCircle size={11} className="text-court-red" />
                    <span className="text-xs text-court-red font-medium">缺失 {t.missingCount} 项</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bell size={11} className="text-court-orange" />
                    <span className="text-xs text-court-orange">{t.remindersSent} 次</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendReminder(t.id);
                  }}
                  className="w-full py-1.5 text-xs rounded-lg bg-court-orange/15 text-court-orange border border-court-orange/30 hover:bg-court-orange/25 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Bell size={11} />
                  发送催办
                </button>
              </div>
            ))}
            {reminderList.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                <CheckSquare size={32} className="mb-2 opacity-40 text-court-green" />
                <p className="text-sm">所有笔录已完整</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
