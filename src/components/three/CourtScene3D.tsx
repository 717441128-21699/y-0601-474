import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Float, Text, Line, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { CourtCase, Courtroom, DetentionRoom, CourtZone } from '../../types';
import { mockZones } from '../../data/mockData';

interface CourtroomMeshProps {
  courtroom: Courtroom;
  cases: CourtCase[];
  selected: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}

function CourtroomMesh({ courtroom, cases, selected, onClick, onHover }: CourtroomMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const activeCase = cases.find((c) => c.courtroomId === courtroom.id && c.status !== 'closed');

  const statusColor = useMemo(() => {
    if (courtroom.status === 'maintenance') return '#94A3B8';
    if (courtroom.status === 'available') return '#10B981';
    return activeCase?.status === 'ongoing' ? '#EF4444' : activeCase?.status === 'recess' ? '#F59E0B' : '#3B82F6';
  }, [courtroom.status, activeCase]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = selected
        ? 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.05
        : 0;
    }
  });

  return (
    <group position={[courtroom.position.x, 1.2, courtroom.position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(false);
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[3.2, 2.2, 2.6]} />
        <meshStandardMaterial
          color="#1A2C4A"
          metalness={0.3}
          roughness={0.6}
          emissive={statusColor}
          emissiveIntensity={selected ? 0.4 : 0.15}
        />
      </mesh>

      <mesh position={[0, 1.15, 1.31]}>
        <boxGeometry args={[3.2, 2.1, 0.02]} />
        <meshStandardMaterial color="#112240" transparent opacity={0.85} />
      </mesh>

      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[3.4, 0.1, 2.8]} />
        <meshStandardMaterial color="#C9A86C" metalness={0.8} roughness={0.2} />
      </mesh>

      <Text
        position={[0, 3.1, 0]}
        fontSize={0.28}
        color="#C9A86C"
        anchorX="center"
        anchorY="middle"
      >
        {courtroom.name}
      </Text>

      <mesh position={[0, 2.75, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={1.2}
        />
      </mesh>

      {activeCase && (
        <Html position={[0, -0.6, 0]} center distanceFactor={12} zIndexRange={[10, 0]}>
          <div className="bg-court-panel/95 backdrop-blur-md border border-court-gold/40 rounded-lg p-3 min-w-[220px] shadow-glow-gold">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-court-gold">{courtroom.name}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: statusColor }}
              >
                {activeCase.status === 'pending' ? '待开庭' :
                 activeCase.status === 'ongoing' ? '审理中' :
                 activeCase.status === 'recess' ? '休庭' : '闭庭'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mb-1">{activeCase.caseNumber}</p>
            <p className="text-xs text-slate-400 mb-2">{activeCase.title}</p>
            <div className="text-[10px] text-slate-500 space-y-0.5">
              <p>原告: {activeCase.parties.plaintiff}</p>
              <p>被告: {activeCase.parties.defendant}</p>
              <p>审判长: {activeCase.panel.chiefJudge}</p>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

interface DetentionRoomMeshProps {
  room: DetentionRoom;
  selected: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}

function DetentionRoomMesh({ room, selected, onClick, onHover }: DetentionRoomMeshProps) {
  const statusColor = room.status === 'maintenance' ? '#94A3B8'
    : room.currentCount >= room.capacity ? '#EF4444'
    : room.currentCount > 0 ? '#F59E0B' : '#10B981';

  return (
    <group position={[room.position.x, 1, room.position.z]}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => { onHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[2.2, 1.8, 2]} />
        <meshStandardMaterial
          color="#1A2C4A"
          metalness={0.4}
          roughness={0.5}
          emissive={statusColor}
          emissiveIntensity={selected ? 0.35 : 0.1}
        />
      </mesh>
      <mesh position={[0.5, 0, 1.02]}>
        <boxGeometry args={[0.6, 1.2, 0.04]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.5, 0.2, 1.02]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.4} />
      </mesh>

      <Text position={[0, 1.4, 0]} fontSize={0.22} color="#C9A86C" anchorX="center">
        羁押室 {room.number}
      </Text>
      <Text position={[0, -1.1, 0]} fontSize={0.18} color={statusColor} anchorX="center">
        {room.currentCount}/{room.capacity} 人
      </Text>
    </group>
  );
}

interface ZoneBoxProps {
  zone: CourtZone;
}

function ZoneBox({ zone }: ZoneBoxProps) {
  const color = zone.status === 'alert' ? '#EF4444' : zone.status === 'warning' ? '#F59E0B' : '#3B82F6';
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
    }
  });

  return (
    <group position={[zone.position.x, zone.position.y + zone.size.h / 2, zone.position.z]}>
      <mesh ref={ref}>
        <boxGeometry args={[zone.size.w, zone.size.h, zone.size.d]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} wireframe={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[zone.size.w + 0.02, zone.size.h + 0.02, zone.size.d + 0.02]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} wireframe />
      </mesh>
      <Text
        position={[0, zone.size.h / 2 + 0.5, 0]}
        fontSize={0.35}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {zone.name}
      </Text>
    </group>
  );
}

interface EscortPathProps {
  points: { x: number; y: number; z: number }[];
  progress: number;
  color?: string;
  isAlarm?: boolean;
}

function EscortPath({ points, progress, color = '#3B82F6', isAlarm = false }: EscortPathProps) {
  const lineRef = useRef<any>(null);
  const startMarkerRef = useRef<THREE.Mesh>(null);
  const endMarkerRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const pathColor = isAlarm ? '#EF4444' : color;
  const baseLineWidth = isAlarm ? 5 : 3;
  const baseOpacity = isAlarm ? 1 : 0.9;

  const interpolatedPoints = useMemo(() => {
    const result: [number, number, number][] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      for (let t = 0; t <= 1; t += 0.05) {
        result.push([
          start.x + (end.x - start.x) * t,
          0.3,
          start.z + (end.z - start.z) * t,
        ]);
      }
    }
    result.push([points[points.length - 1].x, 0.3, points[points.length - 1].z]);
    return result;
  }, [points]);

  const markerPos = useMemo(() => {
    if (interpolatedPoints.length === 0) return new THREE.Vector3();
    const idx = Math.min(
      Math.floor((progress / 100) * (interpolatedPoints.length - 1)),
      interpolatedPoints.length - 1
    );
    return new THREE.Vector3(...interpolatedPoints[idx]);
  }, [progress, interpolatedPoints]);

  const startPoint = useMemo(() => {
    if (points.length === 0) return new THREE.Vector3();
    return new THREE.Vector3(points[0].x, 0.3, points[0].z);
  }, [points]);

  const endPoint = useMemo(() => {
    if (points.length === 0) return new THREE.Vector3();
    return new THREE.Vector3(points[points.length - 1].x, 0.3, points[points.length - 1].z);
  }, [points]);

  useFrame((state) => {
    if (isAlarm) {
      const pulse = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2;
      
      if (lineRef.current) {
        lineRef.current.opacity = baseOpacity - pulse * 0.3;
      }
      
      if (startMarkerRef.current) {
        const mat = startMarkerRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + pulse * 0.7;
      }
      if (endMarkerRef.current) {
        const mat = endMarkerRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + pulse * 0.7;
      }
      
      if (pulseRef.current) {
        const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
        const scale = 1 + pulse * 0.8;
        pulseRef.current.scale.set(scale, scale, scale);
        mat.opacity = 0.6 - pulse * 0.4;
      }
    }
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={interpolatedPoints}
        color={pathColor}
        lineWidth={baseLineWidth}
        transparent
        opacity={baseOpacity}
      />
      
      {isAlarm && (
        <>
          <mesh ref={startMarkerRef} position={startPoint}>
            <ringGeometry args={[0.25, 0.35, 32]} />
            <meshBasicMaterial
              color={pathColor}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[startPoint.x, 0.31, startPoint.z]}>
            <circleGeometry args={[0.15, 32]} />
            <meshBasicMaterial
              color={pathColor}
              transparent
              opacity={0.9}
            />
          </mesh>
          
          <mesh ref={endMarkerRef} position={endPoint}>
            <ringGeometry args={[0.25, 0.35, 32]} />
            <meshBasicMaterial
              color={pathColor}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[endPoint.x, 0.31, endPoint.z]}>
            <circleGeometry args={[0.15, 32]} />
            <meshBasicMaterial
              color={pathColor}
              transparent
              opacity={0.9}
            />
          </mesh>
          
          <mesh ref={pulseRef} position={markerPos}>
            <ringGeometry args={[0.2, 0.3, 32]} />
            <meshBasicMaterial
              color={pathColor}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
      
      <mesh position={markerPos}>
        <sphereGeometry args={[isAlarm ? 0.22 : 0.18, 20, 20]} />
        <meshStandardMaterial
          color={pathColor}
          emissive={pathColor}
          emissiveIntensity={isAlarm ? 2 : 1.5}
        />
      </mesh>
      <Float speed={4} rotationIntensity={0} floatIntensity={0.5}>
        <mesh position={[markerPos.x, markerPos.y + 0.5, markerPos.z]}>
          <coneGeometry args={[0.12, 0.3, 6]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive={pathColor}
            emissiveIntensity={isAlarm ? 1.2 : 0.8}
          />
        </mesh>
      </Float>
    </group>
  );
}

interface FloorProps {
  width?: number;
  depth?: number;
}

function Floor({ width = 40, depth = 30 }: FloorProps) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        color="#0A1628"
        metalness={0.1}
        roughness={0.9}
      />
    </mesh>
  );
}

function GridHelperCustom() {
  const divisions = 40;
  const size = 40;
  return (
    <gridHelper
      args={[size, divisions, '#C9A86C20', '#2A3F5F30']}
      position={[0, 0.01, 0]}
    />
  );
}

export interface CourtScene3DProps {
  courtrooms: Courtroom[];
  cases: CourtCase[];
  detentionRooms: DetentionRoom[];
  escortPaths?: { missionId: string; points: { x: number; y: number; z: number }[]; progress: number; alarm?: boolean }[];
  selectedCourtroomId?: string | null;
  selectedDetentionId?: string | null;
  onCourtroomClick?: (id: string) => void;
  onDetentionClick?: (id: string) => void;
  showZones?: boolean;
}

export const CourtScene3D: React.FC<CourtScene3DProps> = ({
  courtrooms,
  cases,
  detentionRooms,
  escortPaths = [],
  selectedCourtroomId,
  selectedDetentionId,
  onCourtroomClick,
  onDetentionClick,
  showZones = true,
}) => {
  return (
    <Canvas
      shadows
      camera={{ position: [15, 18, 20], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(180deg, #050D1A 0%, #0A1628 40%, #112240 100%)' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        color="#E0C997"
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.4} color="#3B82F6" />
      <pointLight position={[0, 8, 8]} intensity={0.6} color="#C9A86C" distance={25} />
      <pointLight position={[-8, 6, 0]} intensity={0.4} color="#3B82F6" distance={15} />

      <Stars radius={80} depth={40} count={800} factor={3} fade speed={0.5} />
      <fog attach="fog" args={['#050D1A', 25, 60]} />

      <Floor />
      <GridHelperCustom />

      {showZones && mockZones.map((zone) => (
        <ZoneBox key={zone.id} zone={zone} />
      ))}

      {courtrooms.map((cr) => (
        <CourtroomMesh
          key={cr.id}
          courtroom={cr}
          cases={cases}
          selected={selectedCourtroomId === cr.id}
          onClick={() => onCourtroomClick?.(cr.id)}
          onHover={() => {}}
        />
      ))}

      {detentionRooms.map((dr) => (
        <DetentionRoomMesh
          key={dr.id}
          room={dr}
          selected={selectedDetentionId === dr.id}
          onClick={() => onDetentionClick?.(dr.id)}
          onHover={() => {}}
        />
      ))}

      {escortPaths.map((ep) => (
        <EscortPath
          key={ep.missionId}
          points={ep.points}
          progress={ep.progress}
          color={ep.progress >= 100 ? '#10B981' : '#3B82F6'}
          isAlarm={ep.alarm}
        />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={8}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 2, 3]}
      />
    </Canvas>
  );
};
