import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanFace,
  User,
  Shield,
  Crown,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types';

interface RoleCard {
  role: UserRole;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const roleCards: RoleCard[] = [
  {
    role: 'clerk',
    name: '书记员',
    icon: <User className="w-8 h-8" />,
    description: '庭审记录与文书管理',
  },
  {
    role: 'judge',
    name: '法官',
    icon: <Scale className="w-8 h-8" />,
    description: '案件审理与裁决',
  },
  {
    role: 'chief',
    name: '庭长',
    icon: <Shield className="w-8 h-8" />,
    description: '庭室管理与监督',
  },
  {
    role: 'president',
    name: '院长',
    icon: <Crown className="w-8 h-8" />,
    description: '全院统筹与决策',
  },
];

const ParticleBackground = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.5 + 0.2,
      })),
    []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: var(--particle-opacity);
          }
          90% {
            opacity: var(--particle-opacity);
          }
          50% {
            transform: translateY(-100vh) translateX(30px);
          }
        }
        @keyframes particleGlow {
          0%, 100% {
            box-shadow: 0 0 4px rgba(201, 168, 108, 0.3);
          }
          50% {
            box-shadow: 0 0 12px rgba(201, 168, 108, 0.6);
          }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-court-gold"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            '--particle-opacity': p.opacity,
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite, particleGlow 3s ease-in-out ${p.delay}s infinite`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

const FaceScanArea = () => {
  const { isScanning, scanProgress } = useAuthStore();

  return (
    <div className="relative w-[180px] h-[180px] mx-auto">
      <div
        className={`absolute inset-0 rounded-full border-2 transition-all duration-500 ${
          isScanning
            ? 'border-court-gold shadow-glow-gold'
            : 'border-court-border/60'
        }`}
      >
        <div
          className={`absolute inset-2 rounded-full border transition-all duration-500 ${
            isScanning
              ? 'border-court-gold/50'
              : 'border-court-border/30'
          }`}
        />
        <div
          className={`absolute inset-4 rounded-full border transition-all duration-500 ${
            isScanning
              ? 'border-court-gold/30'
              : 'border-court-border/20'
          }`}
        />

        <svg
          className="absolute inset-0 w-full h-full p-6"
          viewBox="0 0 100 100"
          fill="none"
        >
          <ellipse
            cx="50"
            cy="52"
            rx="28"
            ry="34"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.6)' : 'rgba(42, 63, 95, 0.8)'}
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          <path
            d="M30 45 Q50 35 70 45"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.5)' : 'rgba(42, 63, 95, 0.6)'}
            strokeWidth="0.6"
          />
          <path
            d="M30 60 Q50 70 70 60"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.5)' : 'rgba(42, 63, 95, 0.6)'}
            strokeWidth="0.6"
          />
          <line
            x1="22"
            y1="52"
            x2="78"
            y2="52"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.3)' : 'rgba(42, 63, 95, 0.4)'}
            strokeWidth="0.5"
          />
          <line
            x1="50"
            y1="18"
            x2="50"
            y2="86"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.3)' : 'rgba(42, 63, 95, 0.4)'}
            strokeWidth="0.5"
          />
          <circle
            cx="38"
            cy="46"
            r="3"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.5)' : 'rgba(42, 63, 95, 0.6)'}
            strokeWidth="0.6"
            fill="none"
          />
          <circle
            cx="62"
            cy="46"
            r="3"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.5)' : 'rgba(42, 63, 95, 0.6)'}
            strokeWidth="0.6"
            fill="none"
          />
          <path
            d="M46 60 Q50 64 54 60"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.5)' : 'rgba(42, 63, 95, 0.6)'}
            strokeWidth="0.6"
            fill="none"
          />
          <circle
            cx="50"
            cy="54"
            r="2"
            stroke={isScanning ? 'rgba(201, 168, 108, 0.4)' : 'rgba(42, 63, 95, 0.5)'}
            strokeWidth="0.5"
            fill="none"
          />
        </svg>

        {isScanning && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-court-gold to-transparent"
              style={{
                boxShadow: '0 0 10px rgba(201, 168, 108, 0.8)',
                animation: 'scanLineMove 1.5s ease-in-out infinite',
                top: `${scanProgress}%`,
              }}
            />
            <style>{`
              @keyframes scanLineMove {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.7;
                }
              }
            `}</style>
          </div>
        )}
      </div>

      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-court-gold rounded-tl-lg" />
      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-court-gold rounded-tr-lg" />
      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-court-gold rounded-bl-lg" />
      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-court-gold rounded-br-lg" />

      {scanProgress >= 100 && !isScanning && (
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle2 className="w-16 h-16 text-court-green animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default function Login() {
  const navigate = useNavigate();
  const {
    selectedRole,
    isScanning,
    scanProgress,
    isLoggedIn,
    setSelectedRole,
    startFaceScan,
  } = useAuthStore();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    if (!isScanning) {
      setSelectedRole(role);
    }
  };

  const handleStartScan = () => {
    if (selectedRole && !isScanning) {
      startFaceScan();
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-court-bg">
      <ParticleBackground />

      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(201, 168, 108, 0.1) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl mx-4 animate-slide-up">
        <div className="glass-card p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-court-gold/10 border border-court-gold/30 mb-4">
              <Scale className="w-8 h-8 text-court-gold" />
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-court-goldLight mb-2 tracking-wide">
              市中级人民法院
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-medium">
              3D可视化调度平台
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-medium text-slate-400 mb-4 text-center tracking-wider">
              ── 请选择您的身份 ──
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {roleCards.map((card) => {
                const isSelected = selectedRole === card.role;
                return (
                  <button
                    key={card.role}
                    onClick={() => handleRoleSelect(card.role)}
                    disabled={isScanning}
                    className={`relative p-4 rounded-lg border-2 transition-all duration-300 text-center group ${
                      isSelected
                        ? 'border-court-gold bg-court-gold/10 shadow-glow-gold'
                        : 'border-court-border bg-court-card/50 hover:border-court-gold/50 hover:bg-court-card/80'
                    } ${isScanning ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-court-gold rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-court-bg" />
                      </div>
                    )}
                    <div
                      className={`mb-2 flex justify-center transition-colors duration-300 ${
                        isSelected
                          ? 'text-court-gold'
                          : 'text-slate-400 group-hover:text-court-gold/70'
                      }`}
                    >
                      {card.icon}
                    </div>
                    <div
                      className={`font-semibold text-sm mb-1 transition-colors duration-300 ${
                        isSelected
                          ? 'text-court-goldLight'
                          : 'text-slate-300 group-hover:text-slate-200'
                      }`}
                    >
                      {card.name}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      {card.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-medium text-slate-400 mb-6 text-center tracking-wider">
              ── 人脸识别 ──
            </h2>

            <FaceScanArea />

            <div className="mt-6 max-w-xs mx-auto">
              <div className="h-1.5 bg-court-border/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-court-gold to-court-goldLight rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>
                  {isScanning
                    ? `扫描中... ${scanProgress}%`
                    : scanProgress >= 100
                      ? '识别完成'
                      : selectedRole
                        ? '准备就绪'
                        : '请先选择身份'}
                </span>
                <span className="text-court-gold">{scanProgress}%</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleStartScan}
              disabled={!selectedRole || isScanning}
              className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
            >
              <ScanFace className="w-5 h-5" />
              {isScanning
                ? '扫描进行中...'
                : scanProgress >= 100
                  ? '登录成功'
                  : '开始人脸识别'}
            </button>
          </div>

          {selectedRole && !isScanning && scanProgress < 100 && (
            <p className="mt-4 text-center text-sm text-court-gold/70">
              已选择：{roleCards.find((r) => r.role === selectedRole)?.name}
            </p>
          )}
        </div>

        <div className="mt-8 text-center space-y-1 text-xs text-slate-500">
          <p>
            系统版本 v1.0.0 &nbsp;|&nbsp; 技术支持：智慧司法信息技术中心
          </p>
          <p>
            © 2024 市中级人民法院 版权所有 &nbsp;|&nbsp; 京ICP备XXXXXXXX号
          </p>
          <p className="text-slate-600">
            本系统仅限授权人员使用，使用过程将被记录
          </p>
        </div>
      </div>
    </div>
  );
}
