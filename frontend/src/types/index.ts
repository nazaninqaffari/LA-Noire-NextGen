/**
 * Type definitions for the LA Noire NextGen application
 * Covers all entities: users, cases, evidence, investigation, trial
 */

// User & Role types
export interface Role {
  id: number;
  name: string;
  hierarchy_level: number;
  description?: string;
  is_police_rank?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phone_number?: string;
  national_id?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  roles?: Role[];
  role?: Role; // backwards compatibility
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined: string;
  last_login?: string;
}

// Case types
export type CaseStatus = 
  | 'draft'
  | 'cadet_review'
  | 'officer_review'
  | 'rejected'
  | 'open'
  | 'under_investigation'
  | 'suspects_identified'
  | 'arrest_approved'
  | 'interrogation'
  | 'trial_pending'
  | 'closed';

export type CrimeLevel = 0 | 1 | 2 | 3; // 0=critical, 1=major, 2=medium, 3=minor

export type CaseFormationType = 'complaint' | 'crime_scene';

export interface WitnessData {
  full_name: string;
  phone_number: string;
  national_id: string;
}

export interface Case {
  id: number;
  case_number: string;
  title: string;
  description: string;
  status: CaseStatus;
  crime_level: CrimeLevel;
  crime_level_details?: any;
  formation_type?: CaseFormationType;
  created_by: number;
  created_by_details?: User;
  assigned_cadet?: number;
  assigned_cadet_details?: User;
  assigned_officer?: number;
  assigned_officer_details?: User;
  assigned_detective?: number;
  assigned_detective_details?: User;
  assigned_sergeant?: number;
  assigned_sergeant_details?: User;
  complainants?: any[];
  witnesses?: any[];
  reviews?: any[];
  created_at: string;
  updated_at: string;
  opened_at?: string;
  closed_at?: string;
  rejection_count?: number;
  complainant_statement?: string;
  crime_scene_location?: string;
  crime_scene_datetime?: string;
  witness_data?: WitnessData[];
}

export interface CaseCreateComplaintData {
  title: string;
  description: string;
  crime_level: CrimeLevel;
  formation_type: 'complaint';
  complainant_statement: string;
}

export interface CaseCreateSceneData {
  title: string;
  description: string;
  crime_level: CrimeLevel;
  formation_type: 'crime_scene';
  crime_scene_location: string;
  crime_scene_datetime: string;
  witness_data: WitnessData[];
}

export interface CaseReviewData {
  decision: 'approved' | 'rejected';
  rejection_reason?: string;
}

export interface CaseReviewHistory {
  id: number;
  reviewer: User;
  decision: 'approved' | 'rejected';
  rejection_reason?: string;
  timestamp: string;
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

export interface Testimony {
  id: number;
  case: number;
  title: string;
  description: string;
  witness?: number;
  witness_name?: string;
  transcript: string;
  image?: string;
  audio?: string;
  video?: string;
  recorded_by: User;
  recorded_at: string;
}

export interface EvidenceImage {
  id: number;
  image: string;
  caption?: string;
  uploaded_at: string;
}

export interface BiologicalEvidence {
  id: number;
  case: number;
  title: string;
  description: string;
  evidence_type: string;
  images: EvidenceImage[];
  coroner_analysis?: string;
  identity_match?: User;
  verified_by_coroner: boolean;
  verified_at?: string;
  recorded_by: User;
  recorded_at: string;
}

export interface VehicleEvidence {
  id: number;
  case: number;
  title: string;
  description: string;
  model: string;
  color: string;
  license_plate?: string;
  serial_number?: string;
  recorded_by: User;
  recorded_at: string;
}

export interface IDDocument {
  id: number;
  case: number;
  title: string;
  description: string;
  owner_full_name: string;
  document_type?: string;
  attributes: Record<string, string>;
  recorded_by: User;
  recorded_at: string;
}

export interface GenericEvidence {
  id: number;
  case: number;
  title: string;
  description: string;
  recorded_by: User;
  recorded_at: string;
}

// Suspect types
export type SuspectStatus = 
  | 'under_pursuit' 
  | 'intensive_pursuit' 
  | 'arrested' 
  | 'cleared';

export interface Suspect {
  id: number;
  case: number;
  case_title?: string;
  person: User;
  status: SuspectStatus;
  reason?: string;
  photo?: string;
  identified_by_detective?: User;
  approved_by_sergeant: boolean;
  arrest_warrant_issued: boolean;
  danger_score: number;
  reward_amount: number;
  created_at: string;
  updated_at: string;
}

export interface SuspectSubmission {
  id: number;
  case: number;
  detective: User;
  suspects: number[];
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected';
  sergeant_feedback?: string;
  created_at: string;
}

export interface Interrogation {
  id: number;
  suspect: Suspect;
  detective: User;
  sergeant: User;
  status: 'pending' | 'in_progress' | 'completed';
  detective_guilt_rating?: number;
  sergeant_guilt_rating?: number;
  detective_notes?: string;
  sergeant_notes?: string;
  created_at: string;
}

export interface CaptainDecision {
  id: number;
  interrogation: number;
  captain: User;
  decision: 'guilty' | 'not_guilty' | 'needs_more_investigation';
  reasoning: string;
  requires_chief_approval: boolean;
  created_at: string;
}

export interface PoliceChiefDecision {
  id: number;
  captain_decision: number;
  chief: User;
  decision: 'approved' | 'rejected';
  comments?: string;
  created_at: string;
}

// Detective Board types
export interface DetectiveBoard {
  id: number;
  case: number;
  detective: User;
  items: BoardItem[];
  connections: EvidenceConnection[];
  created_at: string;
  updated_at: string;
}

export interface BoardItem {
  id: number;
  board: number;
  content_type: string;
  object_id: number;
  label?: string;
  notes?: string;
  position_x: number;
  position_y: number;
}

export interface EvidenceConnection {
  id: number;
  board: number;
  from_item: number;
  to_item: number;
  notes?: string;
}

// Notification types
export interface AppNotification {
  id: number;
  recipient: number;
  notification_type: string;
  title: string;
  message: string;
  related_case?: number;
  is_read: boolean;
  created_at: string;
}

// TipOff types
export interface TipOff {
  id: number;
  case?: number;
  suspect?: number;
  submitted_by: User;
  information: string;
  status: string;
  officer_reviewed: boolean;
  detective_reviewed: boolean;
  reward_amount?: number;
  redemption_code?: string;
  created_at: string;
}

// Trial types
export type TrialStatus = 'pending' | 'in_progress' | 'completed';

export interface TrialVerdict {
  id: number;
  trial: number;
  judge: User;
  verdict: 'guilty' | 'innocent';
  reasoning: string;
  created_at: string;
}

export interface Punishment {
  id: number;
  verdict: number;
  punishment_type: string;
  description: string;
  duration?: string;
  fine_amount?: number;
  created_at: string;
}

export interface BailPayment {
  id: number;
  verdict: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requester?: User;
  approved_by?: User;
  payment_reference?: string;
  created_at: string;
}

export interface Trial {
  id: number;
  case: number;
  case_title?: string;
  suspect: Suspect;
  judge?: User;
  submitted_by_captain?: User;
  submitted_by_chief?: User;
  status: TrialStatus;
  trial_date?: string;
  verdicts?: TrialVerdict[];
  punishments?: Punishment[];
  bail_payments?: BailPayment[];
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
  username: string;
  password: string;
}

export interface RegistrationData {
  username: string;
  password: string;
  confirm_password: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  national_id: string;
}

// Auth types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
