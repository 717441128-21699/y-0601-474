import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Gavel,
  FileStack,
  ShieldAlert,
  FileText,
  BarChart3,
  LogOut,
  User,
  Scale,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const ROLE_LABEL = {
  clerk: '书记员',
  judge: '法官',
  chief: '庭长',
  president: '院长',
};

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { path: '/dashboard', label: '3D总览', icon: LayoutDashboard },
  { path: '/courtroom', label: '庭审调度', icon: Gavel },
  { path: '/dossier', label: '案卷管理', icon: FileStack },
  { path: '/detention', label: '羁押监控', icon: ShieldAlert },
  { path: '/transcript', label: '笔录管理', icon: FileText },
  { path: '/statistics', label: '统计导出', icon: BarChart3 },
];

export const NavSidebar: React.FC<Props> = ({ collapsed, onToggle }) => {
  const authStore = useAuthStore();
  const currentUser = authStore.currentUser;
  const logout = authStore.logout;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`h-screen flex flex-col bg-court-panel/90 backdrop-blur-xl border-r border-court-border transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="h-20 flex items-center justify-between px-5 border-b border-court-border">
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-court-gold to-court-goldLight flex items-center justify-center flex-shrink-0 shadow-glow-gold">
            <Scale className="text-court-bg" size={22} />
          </div>
          {!collapsed && (
            <div>
              <p className="font-serif font-bold text-court-goldLight text-sm leading-tight">司法可视化</p>
              <p className="text-xs text-slate-500">调度保障平台</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`text-slate-500 hover:text-court-gold p-1 rounded-lg hover:bg-court-card ${collapsed ? 'hidden' : ''}`}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="text-slate-500 hover:text-court-gold p-2 rounded-lg hover:bg-court-card mx-auto mt-2"
        >
          <ChevronRight size={18} />
        </button>
      )}

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-court-gold/20 to-transparent text-court-goldLight border-l-2 border-court-gold shadow-glow-gold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-court-card/60'
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <item.icon size={20} />
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-court-border p-3 space-y-2">
        {!collapsed && currentUser && (
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-court-blue to-court-cyan flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{currentUser.name}</p>
              <p className="text-xs text-court-gold">{ROLE_LABEL[currentUser.role]}</p>
            </div>
          </div>
        )}
        {collapsed && currentUser && (
          <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-court-blue to-court-cyan flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-court-red hover:bg-court-red/10 transition-all ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm">退出登录</span>}
        </button>
      </div>
    </aside>
  );
};
