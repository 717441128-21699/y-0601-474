import { create } from 'zustand';
import type { User, UserRole, OperationLog } from '../types';
import { mockUsers, mockOperationLogs } from '../data/mockData';

interface AuthState {
  currentUser: User | null;
  isLoggedIn: boolean;
  isScanning: boolean;
  scanProgress: number;
  selectedRole: UserRole | null;
  operationLogs: OperationLog[];
  login: (role: UserRole) => Promise<boolean>;
  startFaceScan: () => void;
  logout: () => void;
  setSelectedRole: (role: UserRole) => void;
  checkPermission: (requiredRole: UserRole[]) => boolean;
  recordLog: (action: string, target: string) => void;
}

const roleOrder: Record<UserRole, number> = {
  clerk: 1,
  judge: 2,
  chief: 3,
  president: 4,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isLoggedIn: false,
  isScanning: false,
  scanProgress: 0,
  selectedRole: null,
  operationLogs: mockOperationLogs,

  setSelectedRole: (role) => set({ selectedRole: role }),

  startFaceScan: () => {
    set({ isScanning: true, scanProgress: 0 });
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      set({ scanProgress: progress });
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const role = get().selectedRole;
          if (role) {
            get().login(role);
          }
          set({ isScanning: false });
        }, 300);
      }
    }, 150);
  },

  login: async (role) => {
    const user = mockUsers.find((u) => u.role === role);
    if (user) {
      const updatedUser = { ...user, lastLogin: new Date().toLocaleString('zh-CN') };
      set({ currentUser: updatedUser, isLoggedIn: true });
      get().recordLog('登录系统', '系统登录');
      return true;
    }
    return false;
  },

  logout: () => {
    get().recordLog('登出系统', '系统登出');
    set({ currentUser: null, isLoggedIn: false, selectedRole: null });
  },

  checkPermission: (requiredRole) => {
    const user = get().currentUser;
    if (!user) return false;
    return requiredRole.some((role) => roleOrder[user.role] >= roleOrder[role]);
  },

  recordLog: (action, target) => {
    const user = get().currentUser;
    if (!user) return;
    const newLog: OperationLog = {
      id: `l${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      target,
      timestamp: new Date().toLocaleString('zh-CN'),
      ip: '192.168.1.100',
    };
    set((state) => ({ operationLogs: [newLog, ...state.operationLogs] }));
  },
}));
