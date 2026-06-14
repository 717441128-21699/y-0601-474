import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavSidebar } from './NavSidebar';
import { AlertTriangle, Bell } from 'lucide-react';
import { useDetentionStore } from '../store/useDetentionStore';
import { useCourtStore } from '../store/useCourtStore';

const TITLE_MAP: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: '指挥中心', subtitle: '全局3D可视化总览' },
  '/courtroom': { title: '庭审调度系统', subtitle: '智能排期 · 冲突审批 · 3D时间轴' },
  '/dossier': { title: '电子卷宗流转中心', subtitle: '格式校验 · 多级审批 · 全流程追溯' },
  '/detention': { title: '羁押安全监控中心', subtitle: '人员监管 · 押解路径 · 超时警报' },
  '/transcript': { title: '庭审笔录管理', subtitle: '实时同步 · 完整性校验 · 自动催办' },
  '/statistics': { title: '数据统计与导出', subtitle: '多维度分析 · Excel报表生成' },
};

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { activeAlarms } = useDetentionStore();
  const { approvals } = useCourtStore();

  const pendingApprovals = approvals.filter((a) => a.result === 'pending').length;
  const totalAlerts = activeAlarms.length + pendingApprovals;

  const pageInfo = TITLE_MAP[location.pathname] || { title: '系统', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-court-bg">
      <NavSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-court-panel/70 backdrop-blur-xl border-b border-court-border flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif font-bold text-court-goldLight tracking-wide">
                {pageInfo.title}
              </h1>
              <div className="h-6 w-px bg-court-border" />
              <span className="text-sm text-slate-400">{pageInfo.subtitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <button className="relative p-2.5 rounded-xl bg-court-card hover:bg-court-card/80 border border-court-border transition-all">
                <Bell size={20} className="text-slate-400" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-court-red text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-glow-red">
                    {totalAlerts}
                  </span>
                )}
              </button>
            </div>

            {(activeAlarms.length > 0 || pendingApprovals > 0) && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-court-red/10 border border-court-red/30">
                <AlertTriangle size={16} className="text-court-red animate-pulse" />
                <div className="text-xs">
                  {activeAlarms.length > 0 && (
                    <p className="text-court-red font-medium">
                      {activeAlarms.length} 项押解超时警报
                    </p>
                  )}
                  {pendingApprovals > 0 && (
                    <p className="text-court-orange font-medium">
                      {pendingApprovals} 项待审批冲突
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="h-8 w-px bg-court-border" />

            <div className="text-xs text-slate-500 font-mono">
              <div>
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto custom-scrollbar">
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
