export type UserRole = 'staff' | 'secretariat' | 'case_manager' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
}

export type CaseStatus = 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'escalated';
export type CaseCategory = 'Safety' | 'Policy' | 'Facilities' | 'HR' | 'Other';
export type Severity = 'Low' | 'Medium' | 'High';

export interface Case {
  id: string; // NEO-YYYY-001
  category: CaseCategory;
  department: string;
  location: string;
  severity: Severity;
  anonymous: boolean;
  submitterUid: string;
  submitterName: string;
  status: CaseStatus;
  caseManagerUid?: string;
  createdAt: string;
  updatedAt: string;
  lastResponseAt?: string;
  description: string;
  fileUrl?: string;
  notes?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  createdAt: string;
  createdBy: string;
}

export interface Vote {
  pollId: string;
  userUid: string;
  optionIndex: number;
  createdAt: string;
}

export interface QuarterlyDigest {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Impact {
  id: string;
  raised: string;
  action: string;
  change: string;
  createdAt: string;
}

export interface Minute {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
}
