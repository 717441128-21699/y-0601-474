import React, { useState, useMemo } from 'react';
import {
  FileStack,
  Plus,
  CheckCircle,
  XCircle,
  RotateCw,
  AlertCircle,
  ListChecks,
  FileText,
  Clock,
  User,
  Eye,
  Gavel,
  ChevronRight,
  X,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useDossierStore, STAGE_MAP } from '../store/useDossierStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCourtStore } from '../store/useCourtStore';
import { DossierScene3D } from '../components/three/DossierScene3D';
import type { Dossier, DossierStatus } from '../types';

interface ReviewTimelineItem {
  dossierId: string;
  caseNumber: string;
  dossierName: string;
  stage: string;
  reviewer: string;
  result: 'pass' | 'reject';
  comment: string;
  timestamp: string;
}

type RejectModalType = 'format' | 'initial' | 'chief' | 'president' | null;

export const DossierPage: React.FC = () => {
  const {
    dossiers,
    selectedDossier,
    setSelectedDossier,
    submitDossier,
    formatCheck,
    formatReject,
    initialReview,
    chiefReview,
    presidentReview,
    resubmitDossier,
    canPerformAction,
  } = useDossierStore();
  const { currentUser } = useAuthStore();
  const { cases, courtrooms } = useCourtStore();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [rejectModalType, setRejectModalType] = useState<RejectModalType>(null);
  const [rejectErrorsText, setRejectErrorsText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  const [submitForm, setSubmitForm] = useState({
    caseNumber: '',
    name: '',
    pages: 0,
    materials: '',
    caseId: '',
    courtroomId: '',
  });

  const stats = useMemo(() => {
    const total = dossiers.length;
    const pendingCheck = dossiers.filter(
      (d) => d.status === 'submitted' || d.status === 'format_checking'
    ).length;
    const pendingApproval = dossiers.filter(
      (d) => d.status === 'initial_review' || d.status === 'chief_review' || d.status === 'president_review'
    ).length;
    const approved = dossiers.filter(
      (d) => d.status === 'approved' || d.status === 'archived'
    ).length;
    const rejected = dossiers.filter((d) => d.status.includes('rejected')).length;
    return { total, pendingCheck, pendingApproval, approved, rejected };
  }, [dossiers]);

  const reviewTimeline = useMemo(() => {
    const items: ReviewTimelineItem[] = [];
    dossiers.forEach((d) => {
      d.reviewHistory.forEach((h) => {
        items.push({
          dossierId: d.id,
          caseNumber: d.caseNumber,
          dossierName: d.name,
          stage: h.stage,
          reviewer: h.reviewer,
          result: h.result,
          comment: h.comment,
          timestamp: h.timestamp,
        });
      });
    });
    items.sort((a, b) => {
      const ta = new Date(a.timestamp.replace(/\//g, '-')).getTime();
      const tb = new Date(b.timestamp.replace(/\//g, '-')).getTime();
      return tb - ta;
    });
    return items.slice(0, 15);
  }, [dossiers]);

  const handleDossierClick = (id: string) => {
    const d = dossiers.find((x) => x.id === id);
    setSelectedDossier(d || null);
  };

  const handleRowClick = (d: Dossier) => {
    setSelectedDossier(d);
  };

  const openRejectModal = (type: RejectModalType) => {
    setRejectModalType(type);
    setRejectErrorsText('');
    setRejectReason('');
  };

  const closeRejectModal = () => {
    setRejectModalType(null);
    setRejectErrorsText('');
    setRejectReason('');
  };

  const confirmReject = () => {
    if (!selectedDossier) return;
    const errors = rejectErrorsText
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rejectModalType === 'format') {
      formatReject(selectedDossier.id, errors, rejectReason || '格式不符合要求');
    } else if (rejectModalType === 'initial') {
      initialReview(selectedDossier.id, rejectReason || '初审未通过', false);
    } else if (rejectModalType === 'chief') {
      chiefReview(selectedDossier.id, rejectReason || '庭长审批未通过', false);
    } else if (rejectModalType === 'president') {
      presidentReview(selectedDossier.id, rejectReason || '院长审批未通过', false);
    }
    closeRejectModal();
  };

  const handleFormatCheck = () => {
    if (!selectedDossier) return;
    formatCheck(selectedDossier.id);
  };

  const handleInitialReviewPass = () => {
    if (!selectedDossier) return;
    initialReview(selectedDossier.id, reviewComment || '初审通过', true);
    setReviewComment('');
  };

  const handleChiefReviewPass = () => {
    if (!selectedDossier) return;
    chiefReview(selectedDossier.id, reviewComment || '庭长审批通过', true);
    setReviewComment('');
  };

  const handlePresidentReviewPass = () => {
    if (!selectedDossier) return;
    presidentReview(selectedDossier.id, reviewComment || '院长审批通过', true);
    setReviewComment('');
  };

  const handleResubmit = () => {
    if (!selectedDossier) return;
    resubmitDossier(selectedDossier.id);
  };

  const handleSubmitDossier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const materials = submitForm.materials
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const selectedCase = cases.find((c) => c.id === submitForm.caseId);
    submitDossier({
      caseNumber: selectedCase ? selectedCase.caseNumber : submitForm.caseNumber,
      caseId: submitForm.caseId || undefined,
      courtroomId: submitForm.courtroomId || undefined,
      name: submitForm.name,
      pages: submitForm.pages,
      materials,
    });
    setShowSubmitModal(false);
    setSubmitForm({ caseNumber: '', name: '', pages: 0, materials: '', caseId: '', courtroomId: '' });
  };

  const getApprovalChainStatus = (status: DossierStatus) => {
    const stages = [
      { key: 'format', label: '格式校验', passStates: ['initial_review', 'initial_rejected', 'chief_review', 'chief_rejected', 'president_review', 'president_rejected', 'approved', 'archived'] },
      { key: 'initial', label: '法官初审', passStates: ['chief_review', 'chief_rejected', 'president_review', 'president_rejected', 'approved', 'archived'] },
      { key: 'chief', label: '庭长审批', passStates: ['president_review', 'president_rejected', 'approved', 'archived'] },
      { key: 'president', label: '院长审批', passStates: ['approved', 'archived'] },
    ];
    return stages.map((s) => {
      const passed = s.passStates.includes(status);
      const isRejected = status.includes('rejected');
      let active = false;
      let rejected = false;

      if (s.key === 'format') {
        active = status === 'submitted' || status === 'format_checking';
        rejected = status === 'format_rejected';
      } else if (s.key === 'initial') {
        active = status === 'initial_review';
        rejected = status === 'initial_rejected';
      } else if (s.key === 'chief') {
        active = status === 'chief_review';
        rejected = status === 'chief_rejected';
      } else if (s.key === 'president') {
        active = status === 'president_review';
        rejected = status === 'president_rejected';
      }

      return {
        ...s,
        done: passed,
        active,
        rejected: isRejected && rejected,
      };
    });
  };

  const getCurrentApproverInfo = (dossier: Dossier) => {
    const status = dossier.status;
    if (status === 'submitted' || status === 'format_checking') {
      return { label: '当前处理人', value: '书记员', color: 'text-court-orange' };
    }
    if (status === 'initial_review') {
      const initialReview = dossier.reviewHistory.find((h) => h.stage === '格式校验');
      const judgeName = initialReview?.reviewer;
      return {
        label: '当前处理人',
        value: judgeName ? `法官（${judgeName}）` : '待法官初审',
        color: 'text-court-blue',
      };
    }
    if (status === 'chief_review') {
      return { label: '当前处理人', value: '庭长', color: 'text-court-purple' };
    }
    if (status === 'president_review') {
      return { label: '当前处理人', value: '院长', color: 'text-court-gold' };
    }
    if (status === 'approved' || status === 'archived') {
      return { label: '审批状态', value: '全部审批完成', color: 'text-court-green' };
    }
    if (status.includes('rejected')) {
      return {
        label: '状态',
        value: dossier.rejectReason ? `已退回：${dossier.rejectReason}` : '已退回',
        color: 'text-court-red',
      };
    }
    return null;
  };

  const renderApprovalButtons = () => {
    if (!selectedDossier) return null;
    const s = selectedDossier.status;

    if (s === 'submitted' || s === 'format_checking') {
      const canFormatCheck = canPerformAction('format_check');
      return (
        <div className="space-y-2">
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => canFormatCheck && openRejectModal('format')}
              className={`btn-danger text-sm py-2 px-5 flex items-center gap-2 ${!canFormatCheck ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <XCircle size={16} />
              格式校验退回
            </button>
            <button
              onClick={() => canFormatCheck && handleFormatCheck()}
              className={`btn-primary text-sm py-2 px-5 flex items-center gap-2 ${!canFormatCheck ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CheckCircle size={16} />
              格式校验通过
            </button>
          </div>
          {!canFormatCheck && (
            <p className="text-xs text-slate-500 text-right">书记员操作</p>
          )}
        </div>
      );
    }

    if (s === 'initial_review') {
      const canInitialReview = canPerformAction('initial_review');
      return (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="填写初审意见（可选）..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className={`input-field text-sm w-full ${!canInitialReview ? 'opacity-50' : ''}`}
            disabled={!canInitialReview}
          />
          <div className="space-y-2">
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => canInitialReview && openRejectModal('initial')}
                className={`btn-danger text-sm py-2 px-5 flex items-center gap-2 ${!canInitialReview ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <XCircle size={16} />
                初审退回
              </button>
              <button
                onClick={() => canInitialReview && handleInitialReviewPass()}
                className={`btn-primary text-sm py-2 px-5 flex items-center gap-2 ${!canInitialReview ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CheckCircle size={16} />
                初审通过
              </button>
            </div>
            {!canInitialReview && (
              <p className="text-xs text-slate-500 text-right">法官操作</p>
            )}
          </div>
        </div>
      );
    }

    if (s === 'chief_review') {
      const canChiefReview = canPerformAction('chief_review');
      return (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="填写庭长审批意见（可选）..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className={`input-field text-sm w-full ${!canChiefReview ? 'opacity-50' : ''}`}
            disabled={!canChiefReview}
          />
          <div className="space-y-2">
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => canChiefReview && openRejectModal('chief')}
                className={`btn-danger text-sm py-2 px-5 flex items-center gap-2 ${!canChiefReview ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <XCircle size={16} />
                庭长退回
              </button>
              <button
                onClick={() => canChiefReview && handleChiefReviewPass()}
                className={`btn-primary text-sm py-2 px-5 flex items-center gap-2 ${!canChiefReview ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CheckCircle size={16} />
                庭长批准
              </button>
            </div>
            {!canChiefReview && (
              <p className="text-xs text-slate-500 text-right">庭长操作</p>
            )}
          </div>
        </div>
      );
    }

    if (s === 'president_review') {
      const canPresidentReview = canPerformAction('president_review');
      return (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="填写院长审批意见（可选）..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className={`input-field text-sm w-full ${!canPresidentReview ? 'opacity-50' : ''}`}
            disabled={!canPresidentReview}
          />
          <div className="space-y-2">
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => canPresidentReview && openRejectModal('president')}
                className={`btn-danger text-sm py-2 px-5 flex items-center gap-2 ${!canPresidentReview ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <XCircle size={16} />
                院长退回
              </button>
              <button
                onClick={() => canPresidentReview && handlePresidentReviewPass()}
                className={`btn-primary text-sm py-2 px-5 flex items-center gap-2 ${!canPresidentReview ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CheckCircle size={16} />
                院长批准
              </button>
            </div>
            {!canPresidentReview && (
              <p className="text-xs text-slate-500 text-right">院长操作</p>
            )}
          </div>
        </div>
      );
    }

    if (s.includes('rejected')) {
      const canResubmit = canPerformAction('submit');
      return (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => canResubmit && handleResubmit()}
              className={`btn-primary text-sm py-2 px-5 flex items-center gap-2 ${!canResubmit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RotateCw size={16} />
              重新提交
            </button>
          </div>
          {!canResubmit && (
            <p className="text-xs text-slate-500 text-right">书记员操作</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(201,168,108,0.3); }
          50% { box-shadow: 0 0 25px rgba(201,168,108,0.6); }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-court-gold to-court-goldLight flex items-center justify-center shadow-glow-gold">
            <FileStack className="text-court-bg" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-court-goldLight tracking-wide">
              电子卷宗流转中心
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <StatBadge label="总数" value={stats.total} color="text-slate-300" />
              <StatBadge label="待校验" value={stats.pendingCheck} color="text-court-orange" dot="bg-court-orange" />
              <StatBadge label="待审批" value={stats.pendingApproval} color="text-court-blue" dot="bg-court-blue" />
              <StatBadge label="已通过" value={stats.approved} color="text-court-green" dot="bg-court-green" />
              <StatBadge label="被退回" value={stats.rejected} color="text-court-red" dot="bg-court-red" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => canPerformAction('submit') && setShowSubmitModal(true)}
            className={`btn-primary flex items-center gap-2 ${!canPerformAction('submit') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus size={18} />
            提交新案卷
          </button>
          {!canPerformAction('submit') && (
            <span className="text-xs text-slate-500">无提交权限</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        <div className="glass-panel overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-border">
            <div className="w-2 h-2 rounded-full bg-court-green animate-pulse" />
            <span className="text-xs text-slate-300">3D卷宗视图</span>
          </div>
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-bg/60 backdrop-blur-sm border border-court-border">
            <Eye size={12} className="text-slate-400" />
            <span className="text-xs text-slate-400">点击卷宗查看详情</span>
          </div>
          <DossierScene3D
            dossiers={dossiers}
            selectedId={selectedDossier?.id}
            onDossierClick={handleDossierClick}
          />
        </div>

        <div className="flex flex-col gap-6 overflow-hidden">
          <div className="glass-panel overflow-hidden flex flex-col min-h-0" style={{ flex: '0 0 38%' }}>
            <div className="section-title px-6 pt-5">
              <ListChecks size={18} />
              案卷列表
              <span className="ml-auto text-xs font-sans text-slate-400">
                共 {dossiers.length} 条案卷
              </span>
            </div>
            <div className="flex-1 overflow-auto px-6 pb-4">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-court-border sticky top-0 bg-court-panel/95 backdrop-blur-sm">
                    <th className="text-left pb-3 font-medium whitespace-nowrap">案号</th>
                    <th className="text-left pb-3 font-medium whitespace-nowrap">卷宗名</th>
                    <th className="text-left pb-3 font-medium whitespace-nowrap">页数</th>
                    <th className="text-left pb-3 font-medium whitespace-nowrap">提交人</th>
                    <th className="text-left pb-3 font-medium whitespace-nowrap">提交时间</th>
                    <th className="text-left pb-3 font-medium whitespace-nowrap">状态</th>
                    <th className="text-right pb-3 font-medium whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-b border-court-border/50 hover:bg-court-gold/5 transition-colors cursor-pointer ${
                        selectedDossier?.id === d.id ? 'bg-court-gold/10' : ''
                      }`}
                      onClick={() => handleRowClick(d)}
                    >
                      <td className="py-3">
                        <span className="text-sm font-mono text-slate-200">{d.caseNumber}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-slate-200 truncate max-w-[120px] inline-block align-middle">
                          {d.name}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-slate-300">{d.pages}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-slate-300">{d.submittedBy}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{d.submittedAt}</span>
                      </td>
                      <td className="py-3">
                        <StatusBadge type="dossier" status={d.status} />
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(d);
                          }}
                          className="px-3 py-1.5 text-xs text-court-gold border border-court-gold/40 rounded-lg hover:bg-court-gold/10 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={12} />
                          查看
                        </button>
                        {(d.status === 'initial_review' && canPerformAction('initial_review')) ||
                        (d.status === 'chief_review' && canPerformAction('chief_review')) ||
                        (d.status === 'president_review' && canPerformAction('president_review')) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(d);
                            }}
                            className="ml-2 px-3 py-1.5 text-xs text-court-blue border border-court-blue/40 rounded-lg hover:bg-court-blue/10 transition-colors inline-flex items-center gap-1"
                          >
                            <Gavel size={12} />
                            审批
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel overflow-hidden flex flex-col min-h-0" style={{ flex: '0 0 38%' }}>
            <div className="section-title px-6 pt-5">
              <FileText size={18} />
              案卷详情
              {selectedDossier && (
                <span className="ml-2 font-mono text-xs text-court-gold">
                  {selectedDossier.caseNumber}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto px-6 pb-4">
              {!selectedDossier ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8">
                  <FileStack size={36} className="text-slate-600 mb-3" />
                  <p className="text-sm">请从列表或3D视图中选择案卷</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <DetailRow label="卷宗名称" value={selectedDossier.name} />
                    <DetailRow label="总页数" value={`${selectedDossier.pages} 页`} />
                    <DetailRow
                      label="提交人"
                      value={
                        <span className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-500" />
                          {selectedDossier.submittedBy}
                        </span>
                      }
                    />
                    <DetailRow
                      label="提交时间"
                      value={
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <Clock size={12} className="text-slate-500" />
                          {selectedDossier.submittedAt}
                        </span>
                      }
                    />
                    {selectedDossier.caseId && (
                      <DetailRow
                        label="关联案件"
                        value={
                          <span className="text-xs font-mono text-court-gold">
                            {cases.find((c) => c.id === selectedDossier.caseId)?.caseNumber || selectedDossier.caseNumber}
                          </span>
                        }
                      />
                    )}
                    {selectedDossier.courtroomId && (
                      <DetailRow
                        label="关联法庭"
                        value={
                          <span className="text-xs text-slate-300">
                            {courtrooms.find((cr) => cr.id === selectedDossier.courtroomId)?.name || selectedDossier.courtroomId}
                          </span>
                        }
                      />
                    )}
                    <div className="col-span-2">
                      <DetailRow label="当前状态" value={<StatusBadge type="dossier" status={selectedDossier.status} />} />
                    </div>
                    {getCurrentApproverInfo(selectedDossier) && (
                      <div className="col-span-2">
                        <DetailRow
                          label={getCurrentApproverInfo(selectedDossier)!.label}
                          value={
                            <span className={`text-sm font-medium ${getCurrentApproverInfo(selectedDossier)!.color}`}>
                              {getCurrentApproverInfo(selectedDossier)!.value}
                            </span>
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                      <FileText size={12} />
                      材料清单
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDossier.materials.length === 0 ? (
                        <span className="text-xs text-slate-500">无材料信息</span>
                      ) : (
                        selectedDossier.materials.map((m, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-court-card border border-court-border text-slate-300"
                          >
                            {m}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {selectedDossier.rejectReason && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-court-red/10 border border-court-red/20">
                      <AlertCircle size={14} className="text-court-red mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-court-red mb-1">退回原因</p>
                        <p className="text-[11px] text-slate-300">{selectedDossier.rejectReason}</p>
                      </div>
                    </div>
                  )}

                  {selectedDossier.formatErrors && selectedDossier.formatErrors.length > 0 && (
                    <div className="px-3 py-2.5 rounded-lg bg-court-orange/10 border border-court-orange/20">
                      <p className="text-xs font-medium text-court-orange mb-1.5 flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        格式错误 ({selectedDossier.formatErrors.length}处)
                      </p>
                      <ul className="space-y-0.5">
                        {selectedDossier.formatErrors.map((err, i) => (
                          <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                            <span className="text-court-orange mt-0.5">•</span>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                      <ListChecks size={12} />
                      流转审批链
                    </p>
                    <div className="relative">
                      <div className="absolute top-4 left-8 right-8 h-0.5 bg-court-border" />
                      <div className="flex justify-between relative">
                        {getApprovalChainStatus(selectedDossier.status).map((stage, idx) => (
                          <div key={stage.key} className="flex flex-col items-center z-10 w-1/4">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                stage.rejected
                                  ? 'bg-court-red/20 text-court-red border-court-red/50'
                                  : stage.active
                                  ? 'bg-court-gold text-court-bg border-court-gold animate-[pulseGlow_2s_ease-in-out_infinite]'
                                  : stage.done
                                  ? 'bg-court-green/20 text-court-green border-court-green/50'
                                  : 'bg-court-card text-slate-500 border-court-border'
                              }`}
                            >
                              {stage.rejected ? (
                                <XCircle size={16} />
                              ) : stage.done ? (
                                <CheckCircle size={16} />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <p
                              className={`mt-2 text-xs font-medium ${
                                stage.rejected
                                  ? 'text-court-red'
                                  : stage.active
                                  ? 'text-court-gold'
                                  : stage.done
                                  ? 'text-slate-300'
                                  : 'text-slate-500'
                              }`}
                            >
                              {stage.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-court-border">
                    {renderApprovalButtons()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel overflow-hidden flex flex-col min-h-0 flex-1">
            <div className="section-title px-6 pt-5">
              <Clock size={18} />
              {selectedDossier ? '当前案卷审批历史' : '最近审批记录'}
              <span className="ml-auto text-xs font-sans text-slate-400">
                {selectedDossier ? `共 ${selectedDossier.reviewHistory.length} 条` : '最近 15 条'}
              </span>
            </div>
            <div className="flex-1 overflow-auto px-6 pb-4">
              {selectedDossier ? (
                selectedDossier.reviewHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-6">
                    <Clock size={28} className="text-slate-600 mb-2" />
                    <p className="text-xs">该案卷暂无审批记录</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-court-border" />
                    <div className="space-y-3">
                      {selectedDossier.reviewHistory.map((item, idx) => (
                        <div key={idx} className="relative pl-9">
                          <div
                            className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              item.result === 'pass'
                                ? 'bg-court-green/10 border-court-green/40 text-court-green'
                                : 'bg-court-red/10 border-court-red/40 text-court-red'
                            }`}
                          >
                            {item.result === 'pass' ? (
                              <CheckCircle size={12} />
                            ) : (
                              <XCircle size={12} />
                            )}
                          </div>
                          <div className="glass-panel px-3 py-2.5 rounded-lg border border-court-border/60">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-court-gold">
                                  {selectedDossier.caseNumber}
                                </span>
                                <ChevronRight size={10} className="text-slate-600" />
                                <span
                                  className={`text-[11px] px-1.5 py-0.5 rounded border ${
                                    item.result === 'pass'
                                      ? 'bg-court-green/15 text-court-green border-court-green/30'
                                      : 'bg-court-red/15 text-court-red border-court-red/30'
                                  }`}
                                >
                                  {item.stage} · {item.result === 'pass' ? '通过' : '退回'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                                {item.timestamp}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mb-1 truncate">{selectedDossier.name}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <User size={10} />
                                {item.reviewer}
                              </span>
                              {item.comment && (
                                <span className="flex items-center gap-1 truncate">
                                  <FileText size={10} />
                                  {item.comment}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                reviewTimeline.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-6">
                    <Clock size={28} className="text-slate-600 mb-2" />
                    <p className="text-xs">暂无审批记录</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-court-border" />
                    <div className="space-y-3">
                      {reviewTimeline.map((item, idx) => (
                        <div key={idx} className="relative pl-9">
                          <div
                            className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              item.result === 'pass'
                                ? 'bg-court-green/10 border-court-green/40 text-court-green'
                                : 'bg-court-red/10 border-court-red/40 text-court-red'
                            }`}
                          >
                            {item.result === 'pass' ? (
                              <CheckCircle size={12} />
                            ) : (
                              <XCircle size={12} />
                            )}
                          </div>
                          <div className="glass-panel px-3 py-2.5 rounded-lg border border-court-border/60">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-court-gold">
                                  {item.caseNumber}
                                </span>
                                <ChevronRight size={10} className="text-slate-600" />
                                <span
                                  className={`text-[11px] px-1.5 py-0.5 rounded border ${
                                    item.result === 'pass'
                                      ? 'bg-court-green/15 text-court-green border-court-green/30'
                                      : 'bg-court-red/15 text-court-red border-court-red/30'
                                  }`}
                                >
                                  {item.stage} · {item.result === 'pass' ? '通过' : '退回'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                                {item.timestamp}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mb-1 truncate">{item.dossierName}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <User size={10} />
                                {item.reviewer}
                              </span>
                              {item.comment && (
                                <span className="flex items-center gap-1 truncate">
                                  <FileText size={10} />
                                  {item.comment}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {showSubmitModal && (
        <div
          className="fixed inset-0 bg-court-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            className="glass-panel w-full max-w-lg overflow-hidden animate-[slideInUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-court-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-court-gold to-court-goldLight flex items-center justify-center">
                  <FileStack className="text-court-bg" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-court-goldLight">
                    提交新案卷
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    填写案卷信息提交审批
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-court-card flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDossier} className="p-6 space-y-5">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  关联案件
                  <span className="text-slate-500 text-xs ml-1">（可选）</span>
                </label>
                <select
                  value={submitForm.caseId}
                  onChange={(e) => {
                    const selectedCase = cases.find((c) => c.id === e.target.value);
                    setSubmitForm({
                      ...submitForm,
                      caseId: e.target.value,
                      caseNumber: selectedCase ? selectedCase.caseNumber : submitForm.caseNumber,
                    });
                  }}
                  className="input-field"
                >
                  <option value="">不关联案件</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  关联法庭
                  <span className="text-slate-500 text-xs ml-1">（可选）</span>
                </label>
                <select
                  value={submitForm.courtroomId}
                  onChange={(e) => setSubmitForm({ ...submitForm, courtroomId: e.target.value })}
                  className="input-field"
                >
                  <option value="">不关联法庭</option>
                  {courtrooms
                    .filter((cr) => cr.status !== 'maintenance')
                    .map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.name}（{cr.number}）
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">案号</label>
                <input
                  type="text"
                  required
                  value={submitForm.caseNumber}
                  onChange={(e) => setSubmitForm({ ...submitForm, caseNumber: e.target.value })}
                  placeholder="例如：(2026)京民初字第0001号"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">卷宗名称</label>
                <input
                  type="text"
                  required
                  value={submitForm.name}
                  onChange={(e) => setSubmitForm({ ...submitForm, name: e.target.value })}
                  placeholder="请输入卷宗名称"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">总页数</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={submitForm.pages || ''}
                  onChange={(e) => setSubmitForm({ ...submitForm, pages: parseInt(e.target.value) || 0 })}
                  placeholder="请输入卷宗页数"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  材料清单
                  <span className="text-slate-500 text-xs ml-1">（用逗号分隔多项）</span>
                </label>
                <textarea
                  rows={3}
                  value={submitForm.materials}
                  onChange={(e) => setSubmitForm({ ...submitForm, materials: e.target.value })}
                  placeholder="例如：起诉状,答辩状,证据清单,庭审笔录"
                  className="input-field resize-none"
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-court-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitDossier}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} />
                提交案卷
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalType && (
        <div
          className="fixed inset-0 bg-court-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeRejectModal}
        >
          <div
            className="glass-panel w-full max-w-md overflow-hidden animate-[slideInUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-court-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-court-red to-court-red/70 flex items-center justify-center">
                <XCircle className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-slate-200">
                  {rejectModalType === 'format' && '格式校验退回'}
                  {rejectModalType === 'initial' && '法官初审退回'}
                  {rejectModalType === 'chief' && '庭长审批退回'}
                  {rejectModalType === 'president' && '院长审批退回'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  请填写退回说明
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {rejectModalType === 'format' && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-court-orange" />
                    格式错误列表
                    <span className="text-slate-500 text-xs">（用逗号分隔多条错误）</span>
                  </label>
                  <textarea
                    rows={4}
                    value={rejectErrorsText}
                    onChange={(e) => setRejectErrorsText(e.target.value)}
                    placeholder="例如：页码缺失第12页,证据目录不完整,签字页模糊不清"
                    className="input-field resize-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-300 mb-2 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  退回原因说明
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请详细描述退回原因..."
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-court-border flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRejectModal}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="btn-danger flex items-center gap-2"
              >
                <XCircle size={16} />
                确认退回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBadge: React.FC<{
  label: string;
  value: number;
  color: string;
  dot?: string;
}> = ({ label, value, color, dot }) => (
  <div className="flex items-center gap-1.5">
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
    <span className={`text-sm font-bold ${color}`}>{value}</span>
    <span className="text-xs text-slate-500">{label}</span>
  </div>
);

const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-court-border/40 last:border-b-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-sm text-slate-200">{value}</span>
  </div>
);
