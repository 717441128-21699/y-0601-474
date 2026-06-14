import { create } from 'zustand';
import * as XLSX from 'xlsx';
import { useCourtStore } from './useCourtStore';
import { useAuthStore } from './useAuthStore';
import type { CourtCase } from '../types';

interface DailyStat {
  date: string;
  totalHearings: number;
  avgDuration: number;
  completed: number;
  overdue: number;
  criminal: number;
  civil: number;
  administrative: number;
}

interface StatisticsState {
  dateRange: { start: string; end: string };
  filterCaseNumber: string;
  setDateRange: (start: string, end: string) => void;
  setFilterCaseNumber: (n: string) => void;
  getFilteredCases: () => CourtCase[];
  generateDailyStats: () => DailyStat[];
  getTotalStats: () => {
    totalHearings: number;
    avgDuration: string;
    completedRate: string;
    overdueCount: number;
  };
  getOverdueList: () => CourtCase[];
  exportToExcel: () => void;
}

const parseDateTime = (s?: string) => (s ? new Date(s.replace(/\//g, '-')).getTime() : 0);

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  filterCaseNumber: '',

  setDateRange: (start, end) => set({ dateRange: { start, end } }),
  setFilterCaseNumber: (n) => set({ filterCaseNumber: n }),

  getFilteredCases: () => {
    const { dateRange, filterCaseNumber } = get();
    const cases = useCourtStore.getState().cases;
    return cases.filter((c) => {
      const t = parseDateTime(c.scheduledTime);
      const start = new Date(dateRange.start).getTime();
      const end = new Date(dateRange.end + ' 23:59:59').getTime();
      const inRange = t >= start && t <= end;
      const matchNumber = filterCaseNumber
        ? c.caseNumber.includes(filterCaseNumber)
        : true;
      return inRange && matchNumber;
    });
  },

  generateDailyStats: () => {
    const filtered = get().getFilteredCases();
    const map = new Map<string, DailyStat>();

    filtered.forEach((c) => {
      const date = (c.scheduledTime || '').split(' ')[0] || '未知';
      if (!map.has(date)) {
        map.set(date, {
          date,
          totalHearings: 0,
          avgDuration: 0,
          completed: 0,
          overdue: 0,
          criminal: 0,
          civil: 0,
          administrative: 0,
        });
      }
      const d = map.get(date)!;
      d.totalHearings++;
      d.avgDuration += c.estimatedDuration;
      if (c.status === 'closed') d.completed++;
      if (c.type === 'criminal') d.criminal++;
      if (c.type === 'civil') d.civil++;
      if (c.type === 'administrative') d.administrative++;

      if (c.startTime && c.endTime) {
        const actual = (parseDateTime(c.endTime) - parseDateTime(c.startTime)) / 60000;
        if (actual > c.estimatedDuration * 1.2) d.overdue++;
      }
    });

    return Array.from(map.values()).map((d) => ({
      ...d,
      avgDuration: d.totalHearings > 0 ? Math.round(d.avgDuration / d.totalHearings) : 0,
    }));
  },

  getTotalStats: () => {
    const filtered = get().getFilteredCases();
    const totalHearings = filtered.length;
    const totalDuration = filtered.reduce((s, c) => s + c.estimatedDuration, 0);
    const avgDuration = totalHearings > 0 ? Math.round(totalDuration / totalHearings) : 0;
    const completed = filtered.filter((c) => c.status === 'closed').length;
    const completedRate = totalHearings > 0 ? Math.round((completed / totalHearings) * 100) : 0;
    const overdueCount = get().getOverdueList().length;

    return {
      totalHearings,
      avgDuration: `${avgDuration}分钟`,
      completedRate: `${completedRate}%`,
      overdueCount,
    };
  },

  getOverdueList: () => {
    const filtered = get().getFilteredCases();
    return filtered.filter((c) => {
      if (c.status === 'closed' || !c.startTime || !c.endTime) return false;
      const actual = (parseDateTime(c.endTime) - parseDateTime(c.startTime)) / 60000;
      return actual > c.estimatedDuration * 1.2;
    });
  },

  exportToExcel: () => {
    const filtered = get().getFilteredCases();
    const stats = get().generateDailyStats();
    const overdueList = get().getOverdueList();
    const user = useAuthStore.getState().currentUser;

    const summaryData = [
      ['统计范围', `${get().dateRange.start} 至 ${get().dateRange.end}`],
      ['总开庭次数', get().getTotalStats().totalHearings],
      ['平均时长', get().getTotalStats().avgDuration],
      ['结案率', get().getTotalStats().completedRate],
      ['超期案件数', get().getTotalStats().overdueCount],
      [],
      ['导出时间', new Date().toLocaleString('zh-CN')],
      ['导出人', user?.name || '未知'],
    ];

    const hearingData = filtered.map((c) => ({
      案号: c.caseNumber,
      案件类型: c.type === 'criminal' ? '刑事' : c.type === 'civil' ? '民事' : '行政',
      案件名称: c.title,
      原告: c.parties.plaintiff,
      被告: c.parties.defendant,
      审判长: c.panel.chiefJudge,
      合议庭: c.panel.judges.join('、') || '-',
      书记员: c.panel.clerk,
      法庭: useCourtStore.getState().courtrooms.find((r) => r.id === c.courtroomId)?.name || '-',
      排期时间: c.scheduledTime,
      预计时长: `${c.estimatedDuration}分钟`,
      实际开始: c.startTime || '-',
      实际结束: c.endTime || '-',
      优先级: c.priority === 'high' ? '高' : c.priority === 'medium' ? '中' : '低',
      状态:
        c.status === 'pending'
          ? '未开庭'
          : c.status === 'ongoing'
          ? '审理中'
          : c.status === 'recess'
          ? '休庭'
          : '闭庭',
      设备清单: c.equipment.join('、') || '-',
      证据材料: '起诉状、证据清单、证人证言、鉴定报告等（详见卷宗）',
    }));

    const overdueData = overdueList.map((c) => ({
      案号: c.caseNumber,
      案件名称: c.title,
      预计时长: `${c.estimatedDuration}分钟`,
      实际开始: c.startTime,
      实际结束: c.endTime,
      实际时长: c.startTime && c.endTime ? `${Math.round((parseDateTime(c.endTime) - parseDateTime(c.startTime)) / 60000)}分钟` : '-',
      超期原因: '庭审辩论时间过长 / 证据材料较多 / 需再次开庭',
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(hearingData);
    const ws3 = XLSX.utils.json_to_sheet(stats);
    const ws4 = XLSX.utils.json_to_sheet(overdueData.length > 0 ? overdueData : [{ 提示: '暂无超期案件' }]);

    XLSX.utils.book_append_sheet(wb, ws1, '统计概要');
    XLSX.utils.book_append_sheet(wb, ws2, '庭审明细');
    XLSX.utils.book_append_sheet(wb, ws3, '每日统计');
    XLSX.utils.book_append_sheet(wb, ws4, '超期提醒清单');

    ws1['!cols'] = [{ wch: 15 }, { wch: 30 }];
    ws2['!cols'] = Array(17).fill({ wch: 18 });
    ws3['!cols'] = Array(9).fill({ wch: 15 });
    ws4['!cols'] = Array(7).fill({ wch: 20 });

    const filename = `庭审统计报表_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    useAuthStore.getState().recordLog('导出庭审统计Excel', filename);
  },
}));
