export type UserRole = 'clerk' | 'judge' | 'chief' | 'president';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  faceId: string;
  department: string;
  qualification: string[];
  lastLogin: string;
}

export type CaseType = 'criminal' | 'civil' | 'administrative';
export type HearingStatus = 'pending' | 'ongoing' | 'recess' | 'closed';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface CourtCase {
  id: string;
  caseNumber: string;
  type: CaseType;
  title: string;
  parties: {
    plaintiff: string;
    defendant: string;
  };
  panel: {
    chiefJudge: string;
    judges: string[];
    clerk: string;
  };
  status: HearingStatus;
  priority: PriorityLevel;
  scheduledTime: string;
  estimatedDuration: number;
  courtroomId: string;
  equipment: string[];
  conflictId?: string;
  startTime?: string;
  endTime?: string;
}

export interface Courtroom {
  id: string;
  name: string;
  number: string;
  floor: number;
  capacity: number;
  equipment: string[];
  suitableTypes: CaseType[];
  status: 'available' | 'occupied' | 'maintenance';
  position: { x: number; y: number; z: number };
}

export type DossierStatus =
  | 'submitted'
  | 'format_checking'
  | 'format_rejected'
  | 'initial_review'
  | 'initial_rejected'
  | 'chief_review'
  | 'chief_rejected'
  | 'approved'
  | 'archived';

export interface Dossier {
  id: string;
  caseNumber: string;
  name: string;
  submittedBy: string;
  submittedAt: string;
  status: DossierStatus;
  pages: number;
  courtroomId?: string;
  formatErrors?: string[];
  rejectReason?: string;
  reviewHistory: {
    stage: string;
    reviewer: string;
    result: 'pass' | 'reject';
    comment: string;
    timestamp: string;
  }[];
  materials: string[];
}

export type DetentionStatus = 'occupied' | 'empty' | 'maintenance';

export interface Detainee {
  id: string;
  name: string;
  caseNumber: string;
  roomId: string;
  checkInTime: string;
  status: 'detained' | 'escorting' | 'hearing' | 'returned';
}

export interface DetentionRoom {
  id: string;
  number: string;
  capacity: number;
  currentCount: number;
  status: DetentionStatus;
  detainees: Detainee[];
  position: { x: number; y: number; z: number };
}

export interface EscortMission {
  id: string;
  detaineeId: string;
  detaineeName: string;
  fromRoom: string;
  toCourtroom: string;
  startTime: string;
  expectedReturn: string;
  escortOfficers: string[];
  status: 'planned' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
  pathPoints: { x: number; y: number; z: number }[];
  terminalPushed: boolean;
}

export type ApprovalStage = 'judge' | 'chief' | 'president';
export type ApprovalResult = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  caseNumber: string;
  caseTitle: string;
  type: 'schedule_conflict' | 'dossier' | 'other';
  currentStage: ApprovalStage;
  result: ApprovalResult;
  conflictDescription?: string;
  timeline: {
    stage: ApprovalStage;
    approver: string;
    approverRole: UserRole;
    result: ApprovalResult;
    comment: string;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface Transcript {
  id: string;
  caseNumber: string;
  caseTitle: string;
  content: string;
  keyFields: {
    caseFacts: boolean;
    evidence: boolean;
    finalStatement: boolean;
    signatures: boolean;
  };
  missingItems: string[];
  status: 'draft' | 'complete' | 'pending_revision';
  lastEdited: string;
  remindersSent: number;
  editor: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  target: string;
  timestamp: string;
  ip: string;
}

export interface CourtZone {
  id: string;
  name: string;
  type: 'courtroom' | 'mediation' | 'reading' | 'detention' | 'command';
  position: { x: number; y: number; z: number };
  size: { w: number; h: number; d: number };
  status: 'normal' | 'warning' | 'alert';
  description: string;
}
