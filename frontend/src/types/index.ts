/**
 * Type definitions for the application
 */

// User types
export interface Role {
  id: number;
  name: string;
  hierarchy_level: number;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phone_number?: string;
  national_id?: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
}

// Case types
export type CaseStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'in_progress' 
  | 'under_investigation' 
  | 'closed' 
  | 'rejected';

export type CrimeLevel = 0 | 1 | 2 | 3; // 0=critical, 1=major, 2=medium, 3=minor

export interface Case {
  id: number;
  case_id: string;
  title: string;
  description: string;
  status: CaseStatus;
  crime_level: CrimeLevel;
  assigned_to: User;
  created_by: User;
  created_at: string;
  updated_at: string;
  rejection_count?: number;
}

// Evidence types
export type EvidenceType = 
  | 'testimony' 
  | 'biological' 
  | 'vehicle' 
  | 'id_document' 
  | 'generic';

export interface Evidence {
  id: number;
  evidence_type: EvidenceType;
  title: string;
  description: string;
  case: number;
  registered_by: User;
  created_at: string;
  photo?: string;
}

// Suspect types
export type SuspectStatus = 
  | 'under_pursuit' 
  | 'intensive_pursuit' 
  | 'arrested' 
  | 'cleared';

export interface Suspect {
  id: number;
  name: string;
  status: SuspectStatus;
  danger_score: number;
  case: number;
  crime_level: CrimeLevel;
  description?: string;
  mugshot?: string;
  created_at: string;
  updated_at: string;
}

// Trial types
export type TrialStatus = 'pending' | 'in_progress' | 'completed';
export type Verdict = 'guilty' | 'innocent';

export interface Trial {
  id: number;
  case: number;
  suspect: number;
  status: TrialStatus;
  verdict?: Verdict;
  judge_notes?: string;
  created_at: string;
  completed_at?: string;
}

// API Response types
export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Dashboard types
export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalSuspects: number;
  totalEvidence: number;
}

// Form types
export interface LoginCredentials {
  identifier: string;
  password: string;
}

// Auth types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
