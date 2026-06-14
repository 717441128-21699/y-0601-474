import React, { useRef } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Float, Text, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { Dossier } from '../../types';
import { STAGE_MAP } from '../../store/useDossierStore';

interface DossierMeshProps {
  dossier: Dossier;
  index: number;
  total: number;
  selected: boolean;
  onClick: () => void;
}

function DossierMesh({ dossier, index, total, selected, onClick }: DossierMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  const statusColor = dossier.status.includes('rejected') ? '#EF4444'
    : dossier.status === 'approved' || dossier.status === 'archived' ? '#10B981'
    : dossier.status === 'format_checking' || dossier.status === 'initial_review' || dossier.status === 'chief_review' ? '#3B82F6'
    : '#F59E0B';

  const cols = Math.min(5, Math.ceil(Math.sqrt(total)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const spacing = 3.5;
  const startX = -((cols - 1) * spacing) / 2;
  const startZ = -Math.floor(total / cols) * spacing / 2;

  const stackHeight = 0.05 + dossier.pages / 500;
  const isRejected = dossier.status.includes('rejected');

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = selected ? 0.5 + Math.sin(t * 3) * 0.08 : 0;
      if (selected) {
        groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.2;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[startX + col * spacing, stackHeight / 2 + 0.3, startZ + row * spacing]}
    >
      <group
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'default')}
      >
        <mesh position={[0, stackHeight / 2, 0]}>
          <boxGeometry args={[2, stackHeight, 2.6]} />
          <meshStandardMaterial
            color={isRejected ? '#7F1D1D' : '#1A2C4A'}
            metalness={0.2}
            roughness={0.7}
            emissive={statusColor}
            emissiveIntensity={selected ? 0.35 : 0.12}
          />
        </mesh>

        <mesh position={[0, stackHeight / 2, 1.31]}>
          <boxGeometry args={[2.02, stackHeight + 0.02, 0.02]} />
          <meshStandardMaterial
            color={isRejected ? '#EF4444' : '#C9A86C'}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>

        <mesh position={[0, stackHeight / 2, -1.28]}>
          <boxGeometry args={[2.02, stackHeight + 0.02, 0.02]} />
          <meshStandardMaterial color="#2A3F5F" metalness={0.5} roughness={0.4} />
        </mesh>

        {Array.from({ length: Math.min(5, Math.ceil(dossier.pages / 50)) }).map((_, i) => (
          <mesh key={i} position={[0, 0.05 + i * stackHeight / 8, 0]}>
            <boxGeometry args={[1.9, 0.01, 2.5]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.1} roughness={0.95} />
          </mesh>
        ))}

        {isRejected && (
          <mesh position={[0, stackHeight + 0.15, 0]} rotation={[0, 0, Math.PI / 6]}>
            <boxGeometry args={[2.2, 0.08, 0.4]} />
            <meshStandardMaterial
              color="#EF4444"
              emissive="#EF4444"
              emissiveIntensity={0.8}
            />
          </mesh>
        )}
      </group>

      <Html position={[0, -0.5, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className={`bg-court-panel/95 backdrop-blur-md border rounded-lg p-2.5 min-w-[200px] ${
            selected ? 'border-court-gold shadow-glow-gold' : 'border-court-border'
          } transition-all`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${statusColor}20`,
                color: statusColor,
                borderColor: `${statusColor}60`,
              }}
            >
              {STAGE_MAP[dossier.status] || dossier.status}
            </span>
            <span className="text-[10px] text-slate-500">{dossier.pages}页</span>
          </div>
          <p className="text-[10px] font-mono text-slate-300 mb-0.5">{dossier.caseNumber}</p>
          <p className="text-xs text-slate-200 font-medium mb-1 truncate">{dossier.name}</p>
          <div className="flex items-center gap-2 text-[9px] text-slate-500">
            <span>提交: {dossier.submittedBy}</span>
          </div>
        </div>
      </Html>

      <Text position={[0, stackHeight + 0.5, 0]} fontSize={0.18} color="#C9A86C" anchorX="center">
        {dossier.caseNumber.match(/第(\d+)号/)?.[1] || dossier.caseNumber}
      </Text>
    </group>
  );
}

interface TimelineNodeProps {
  x: number;
  label: string;
  color: string;
  active: boolean;
  done: boolean;
}

function TimelineNode({ x, label, color, active, done }: TimelineNodeProps) {
  return (
    <group position={[x, -2, 0]}>
      <mesh>
        <cylinderGeometry args={[done ? 0.15 : 0.2, done ? 0.15 : 0.2, 0.1, 24]} />
        <meshStandardMaterial
          color={done ? '#10B981' : active ? color : '#475569'}
          emissive={active ? color : '#000'}
          emissiveIntensity={active ? 1 : 0}
        />
      </mesh>
      <Text position={[0, -0.35, 0]} fontSize={0.14} color={active ? color : '#64748B'} anchorX="center">
        {label}
      </Text>
    </group>
  );
}

interface TimelineConnectorProps {
  x1: number;
  x2: number;
  active: boolean;
  progress: number;
}

function TimelineConnector({ x1, x2, active, progress }: TimelineConnectorProps) {
  const points: [number, number, number][] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (active && t > progress) {
      points.push([x1 + (x2 - x1) * t, -2, 0.001]);
      continue;
    }
    points.push([x1 + (x2 - x1) * t, -2, 0]);
  }

  const colors: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (active && t > progress) {
      colors.push([0.3, 0.3, 0.35]);
    } else {
      colors.push([0.16, 0.66, 0.5]);
    }
  }

  return null;
}

export interface DossierScene3DProps {
  dossiers: Dossier[];
  selectedId?: string | null;
  onDossierClick?: (id: string) => void;
  showTimeline?: boolean;
  timelineSteps?: { label: string; done: boolean; active: boolean }[];
}

export const DossierScene3D: React.FC<DossierScene3DProps> = ({
  dossiers,
  selectedId,
  onDossierClick,
}) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 12, 14], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(180deg, #050D1A 0%, #0A1628 40%, #112240 100%)' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 15, 8]} intensity={0.9} color="#E0C997" castShadow />
      <pointLight position={[0, 6, 4]} intensity={0.6} color="#C9A86C" distance={20} />
      <pointLight position={[-6, 5, -4]} intensity={0.4} color="#3B82F6" distance={15} />

      <Stars radius={60} depth={30} count={500} factor={2} fade speed={0.3} />
      <fog attach="fog" args={['#050D1A', 20, 50]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0A1628" metalness={0.1} roughness={0.95} />
      </mesh>
      <gridHelper args={[30, 30, '#C9A86C20', '#2A3F5F20']} position={[0, 0.01, 0]} />

      <group>
        {dossiers.map((d, i) => (
          <DossierMesh
            key={d.id}
            dossier={d}
            index={i}
            total={dossiers.length}
            selected={selectedId === d.id}
            onClick={() => onDossierClick?.(d.id)}
          />
        ))}
      </group>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={6}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
};
