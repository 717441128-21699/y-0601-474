import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Search,
  RefreshCw,
  Download,
  Table,
  Clock,
  AlertTriangle,
  Gavel,
  Users,
} from 'lucide-react';
import { useStatisticsStore } from '../store/useStatisticsStore';
import { DataCard } from '../components/DataCard';
import type { CourtCase } from '../types';

function parseDateTime(s?: string) {
  return s ? new Date(s.replace(/\//g, '-')).getTime() : 0;
}

const CASE_TYPE_COLORS: Record<string, string> = {
  criminal: 'text-court-red',
  civil: 'text-court-blue',
  administrative: 'text-court-green',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  criminal: '刑事',
  civil: '民事',
  administrative: '行政',
};

export const StatisticsPage: React.FC = () => {
  const {
    dateRange,
    filterCaseNumber,
    setDateRange,
    setFilterCaseNumber,
    getFilteredCases,
    generateDailyStats,
    getTotalStats,
    getOverdueList,
    exportToExcel,
  } = useStatisticsStore();

  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const refreshStats = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setRefreshKey((k) => k + 1);
      setIsRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, filterCaseNumber, refreshKey]);

  const totalStats = useMemo(() => getTotalStats(), [getTotalStats, refreshKey]);
  const dailyStats = useMemo(() => generateDailyStats(), [generateDailyStats, refreshKey]);
  const overdueList = useMemo(() => getOverdueList(), [getOverdueList, refreshKey]);
  const filteredCases = useMemo(() => getFilteredCases(), [getFilteredCases, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const pagedCases = filteredCases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getOverdueReason = (c: CourtCase) => {
    if (!c.startTime || !c.endTime) return '-';
    const actual = Math.round((parseDateTime(c.endTime) - parseDateTime(c.startTime)) / 60000);
    const over = actual - c.estimatedDuration;
    if (over > 60) return '庭审辩论时间过长，证据材料较多';
    if (over > 30) return '需补充质证环节，当事人陈述时间长';
    return '程序环节较多，证人出庭作证';
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-court-gold/30 to-court-gold/10 border border-court-gold/40 shadow-glow-gold">
            <BarChart3 className="text-court-gold" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-slate-100 tracking-wide">
              统计数据导出
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              庭审数据分析 · 报表导出管理
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card border rounded-2xl p-4 flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-court-gold" />
            <span className="text-sm text-slate-400">日期范围：</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(e.target.value, dateRange.end)}
              className="px-3 py-2 text-sm rounded-lg bg-black/20 border border-slate-700/50 text-slate-200 focus:outline-none focus:border-court-gold/50 transition-colors font-mono"
            />
            <span className="text-slate-500">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(dateRange.start, e.target.value)}
              className="px-3 py-2 text-sm rounded-lg bg-black/20 border border-slate-700/50 text-slate-200 focus:outline-none focus:border-court-gold/50 transition-colors font-mono"
            />
          </div>

          <div className="h-8 w-px bg-slate-700/50" />

          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="输入案号搜索..."
              value={filterCaseNumber}
              onChange={(e) => setFilterCaseNumber(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-black/20 border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-court-gold/50 transition-colors font-mono"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={refreshStats}
              disabled={isRefreshing}
              className="btn-secondary flex items-center gap-2 text-sm py-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              刷新统计
            </button>
            <button
              onClick={exportToExcel}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              <Download size={14} />
              导出Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <DataCard
          title="总开庭次数"
          value={totalStats.totalHearings}
          icon={Gavel}
          color="gold"
          subtitle={`${dateRange.start} ~ ${dateRange.end}`}
        />
        <DataCard
          title="平均时长"
          value={totalStats.avgDuration}
          icon={Clock}
          color="blue"
          subtitle="单场庭审平均用时"
        />
        <DataCard
          title="结案率"
          value={totalStats.completedRate}
          icon={BarChart3}
          color="green"
          subtitle="已结案 / 总开庭数"
        />
        <DataCard
          title="超期案件数"
          value={totalStats.overdueCount}
          icon={AlertTriangle}
          color="red"
          subtitle="超过预计时长120%"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="glass-card border rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-court-blue/20">
                <Table size={16} className="text-court-blue" />
              </div>
              <h3 className="text-base font-bold text-slate-100">每日统计</h3>
            </div>
            <span className="text-xs text-slate-500">
              共 {dailyStats.length} 天数据
            </span>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">日期</th>
                  <th className="text-center px-3 py-3 font-medium">开庭数</th>
                  <th className="text-center px-3 py-3 font-medium">平均时长</th>
                  <th className="text-center px-3 py-3 font-medium">已结案</th>
                  <th className="text-center px-3 py-3 font-medium">超期</th>
                  <th className="text-center px-3 py-3 font-medium">刑事</th>
                  <th className="text-center px-3 py-3 font-medium">民事</th>
                  <th className="text-center px-3 py-3 font-medium">行政</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((d) => (
                  <tr
                    key={d.date}
                    className="border-b border-slate-700/30 hover:bg-court-gold/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-court-gold whitespace-nowrap">
                      {d.date}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-slate-200 font-medium">
                      {d.totalHearings}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-slate-300">
                      {d.avgDuration}分钟
                    </td>
                    <td className="px-3 py-3 text-center text-sm">
                      <span className="text-court-green font-medium">{d.completed}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-sm">
                      <span className={d.overdue > 0 ? 'text-court-red font-medium' : 'text-slate-400'}>
                        {d.overdue}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-sm">
                      <span className={CASE_TYPE_COLORS.criminal}>{d.criminal}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-sm">
                      <span className={CASE_TYPE_COLORS.civil}>{d.civil}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-sm">
                      <span className={CASE_TYPE_COLORS.administrative}>{d.administrative}</span>
                    </td>
                  </tr>
                ))}
                {dailyStats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                      <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">暂无统计数据</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card border rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-court-red/20">
                <AlertTriangle size={16} className="text-court-red" />
              </div>
              <h3 className="text-base font-bold text-slate-100">超期提醒清单</h3>
            </div>
            {overdueList.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-court-red/15 text-court-red text-xs border border-court-red/30">
                {overdueList.length} 件
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 font-medium">案号</th>
                  <th className="text-left px-3 py-3 font-medium">案件名</th>
                  <th className="text-center px-3 py-3 font-medium">预计时长</th>
                  <th className="text-center px-3 py-3 font-medium">实际时长</th>
                  <th className="text-left px-3 py-3 font-medium">超期原因</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map((c) => {
                  const actual = c.startTime && c.endTime
                    ? Math.round((parseDateTime(c.endTime) - parseDateTime(c.startTime)) / 60000)
                    : 0;
                  const overBy = actual - c.estimatedDuration;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-700/30 hover:bg-court-red/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-court-red">
                        {c.caseNumber}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-200 max-w-[140px] truncate">
                        {c.title}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-slate-300">
                        {c.estimatedDuration}分钟
                      </td>
                      <td className="px-3 py-3 text-center text-sm">
                        <span className="text-court-red font-medium">
                          {actual}分钟
                          {overBy > 0 && (
                            <span className="text-[10px] ml-1 text-court-red/70">
                              (+{overBy})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400 max-w-[160px]">
                        {getOverdueReason(c)}
                      </td>
                    </tr>
                  );
                })}
                {overdueList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-slate-500">
                      <AlertTriangle size={32} className="mx-auto mb-2 opacity-30 text-court-green" />
                      <p className="text-sm">暂无超期案件</p>
                      <p className="text-xs text-slate-600 mt-1">所有庭审均在预计时长内完成</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass-card border rounded-2xl overflow-hidden flex flex-col flex-shrink-0" style={{ maxHeight: '320px' }}>
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-court-gold/20">
              <Users size={16} className="text-court-gold" />
            </div>
            <h3 className="text-base font-bold text-slate-100">案件明细</h3>
            <span className="text-xs text-slate-500 ml-2">
              共 {filteredCases.length} 条记录
            </span>
          </div>
          {filteredCases.length > pageSize && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg bg-black/20 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-court-gold/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xs"
              >
                ‹
              </button>
              <span className="text-xs text-slate-400 font-mono min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 rounded-lg bg-black/20 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-court-gold/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xs"
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
              <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                <th className="text-left px-4 py-3 font-medium">案号</th>
                <th className="text-left px-3 py-3 font-medium">案件名称</th>
                <th className="text-center px-3 py-3 font-medium">类型</th>
                <th className="text-left px-3 py-3 font-medium">原告</th>
                <th className="text-left px-3 py-3 font-medium">被告</th>
                <th className="text-left px-3 py-3 font-medium">审判长</th>
                <th className="text-center px-3 py-3 font-medium">排期时间</th>
                <th className="text-center px-3 py-3 font-medium">时长</th>
                <th className="text-center px-3 py-3 font-medium">优先级</th>
                <th className="text-center px-3 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {pagedCases.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-700/30 hover:bg-court-gold/5 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-court-gold whitespace-nowrap">
                    {c.caseNumber}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-200 max-w-[180px] truncate">
                    {c.title}
                  </td>
                  <td className="px-3 py-3 text-center text-sm">
                    <span className={CASE_TYPE_COLORS[c.type]}>
                      {CASE_TYPE_LABELS[c.type]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-300 max-w-[100px] truncate">
                    {c.parties.plaintiff}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-300 max-w-[100px] truncate">
                    {c.parties.defendant}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-300 whitespace-nowrap">
                    {c.panel.chiefJudge}
                  </td>
                  <td className="px-3 py-3 text-center text-sm text-slate-400 font-mono whitespace-nowrap">
                    {c.scheduledTime}
                  </td>
                  <td className="px-3 py-3 text-center text-sm text-slate-300 whitespace-nowrap">
                    {c.estimatedDuration}分钟
                  </td>
                  <td className="px-3 py-3 text-center text-sm">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.priority === 'high'
                          ? 'bg-court-red/15 text-court-red border border-court-red/30'
                          : c.priority === 'medium'
                          ? 'bg-court-orange/15 text-court-orange border border-court-orange/30'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {c.priority === 'high' ? '高' : c.priority === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === 'closed'
                          ? 'bg-court-green/15 text-court-green border border-court-green/30'
                          : c.status === 'ongoing'
                          ? 'bg-court-blue/15 text-court-blue border border-court-blue/30'
                          : c.status === 'recess'
                          ? 'bg-court-orange/15 text-court-orange border border-court-orange/30'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {c.status === 'closed'
                        ? '闭庭'
                        : c.status === 'ongoing'
                        ? '审理中'
                        : c.status === 'recess'
                        ? '休庭'
                        : '未开庭'}
                    </span>
                  </td>
                </tr>
              ))}
              {pagedCases.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <Search size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无匹配的案件记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
