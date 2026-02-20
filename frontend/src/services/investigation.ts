/**
 * Investigation Service
 * API functions for detective boards, suspects, interrogations, decisions & notifications
 */
import { api } from './api';
import type {
  DetectiveBoard,
  BoardItem,
  EvidenceConnection,
  Suspect,
  SuspectStatus,
  SuspectSubmission,
  Interrogation,
  CaptainDecision,
  PoliceChiefDecision,
  TipOff,
  AppNotification,
  PaginatedResponse,
} from '../types';

// Base URLs
const BOARDS_URL = '/investigation/detective-boards';
const BOARD_ITEMS_URL = '/investigation/board-items';
const CONNECTIONS_URL = '/investigation/evidence-connections';
const SUSPECTS_URL = '/investigation/suspects';
const SUBMISSIONS_URL = '/investigation/suspect-submissions';
const INTERROGATIONS_URL = '/investigation/interrogations';
const CAPTAIN_URL = '/investigation/captain-decisions';
const CHIEF_URL = '/investigation/chief-decisions';
const TIPOFFS_URL = '/investigation/tipoffs';
const NOTIFICATIONS_URL = '/investigation/notifications';

/* ─── Detective Boards ──────────────────────────────────────────── */

export const getDetectiveBoards = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<DetectiveBoard>> => {
  const response = await api.get<PaginatedResponse<DetectiveBoard>>(`${BOARDS_URL}/`, { params });
  return response.data;
};

export const getDetectiveBoard = async (id: number): Promise<DetectiveBoard> => {
  const response = await api.get<DetectiveBoard>(`${BOARDS_URL}/${id}/`);
  return response.data;
};

export const createDetectiveBoard = async (
  data: { case: number }
): Promise<DetectiveBoard> => {
  const response = await api.post<DetectiveBoard>(`${BOARDS_URL}/`, data);
  return response.data;
};

export const deleteDetectiveBoard = async (id: number): Promise<void> => {
  await api.delete(`${BOARDS_URL}/${id}/`);
};

/* ─── Board Items ───────────────────────────────────────────────── */

export const createBoardItem = async (
  data: Partial<BoardItem>
): Promise<BoardItem> => {
  const response = await api.post<BoardItem>(`${BOARD_ITEMS_URL}/`, data);
  return response.data;
};

export const updateBoardItem = async (
  id: number,
  data: Partial<BoardItem>
): Promise<BoardItem> => {
  const response = await api.patch<BoardItem>(`${BOARD_ITEMS_URL}/${id}/`, data);
  return response.data;
};

export const deleteBoardItem = async (id: number): Promise<void> => {
  await api.delete(`${BOARD_ITEMS_URL}/${id}/`);
};

/* ─── Evidence Connections ──────────────────────────────────────── */

export const createEvidenceConnection = async (
  data: Partial<EvidenceConnection>
): Promise<EvidenceConnection> => {
  const response = await api.post<EvidenceConnection>(`${CONNECTIONS_URL}/`, data);
  return response.data;
};

export const deleteEvidenceConnection = async (id: number): Promise<void> => {
  await api.delete(`${CONNECTIONS_URL}/${id}/`);
};

/* ─── Suspects ──────────────────────────────────────────────────── */

export const getSuspects = async (params?: {
  case?: number;
  status?: string;
  page?: number;
}): Promise<PaginatedResponse<Suspect>> => {
  const response = await api.get<PaginatedResponse<Suspect>>(`${SUSPECTS_URL}/`, { params });
  return response.data;
};

export const getSuspect = async (id: number): Promise<Suspect> => {
  const response = await api.get<Suspect>(`${SUSPECTS_URL}/${id}/`);
  return response.data;
};

export const createSuspect = async (data: FormData): Promise<Suspect> => {
  const response = await api.post<Suspect>(`${SUSPECTS_URL}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateSuspect = async (id: number, data: Partial<Suspect>): Promise<Suspect> => {
  const response = await api.patch<Suspect>(`${SUSPECTS_URL}/${id}/`, data);
  return response.data;
};

/**
 * Change the status of a suspect.
 * All police roles except Cadet can use this endpoint.
 * Allows manual escalation to intensive_pursuit (most wanted).
 */
export const changeSuspectStatus = async (
  id: number,
  newStatus: SuspectStatus,
): Promise<Suspect> => {
  const response = await api.post<Suspect>(
    `${SUSPECTS_URL}/${id}/change-status/`,
    { status: newStatus },
  );
  return response.data;
};

/** Public endpoint - no auth required. Returns intensive-pursuit suspects */
export const getIntensivePursuitSuspects = async (): Promise<Suspect[]> => {
  const response = await api.get<Suspect[]>(`${SUSPECTS_URL}/intensive_pursuit/`);
  return response.data;
};

/* ─── Suspect Submissions ───────────────────────────────────────── */

export const getSuspectSubmissions = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<SuspectSubmission>> => {
  const response = await api.get<PaginatedResponse<SuspectSubmission>>(`${SUBMISSIONS_URL}/`, { params });
  return response.data;
};

export const createSuspectSubmission = async (
  data: { case: number; suspects: number[]; reasoning: string }
): Promise<SuspectSubmission> => {
  const response = await api.post<SuspectSubmission>(`${SUBMISSIONS_URL}/`, data);
  return response.data;
};

/** Sergeant reviews suspect submission */
export const reviewSuspectSubmission = async (
  id: number,
  data: { decision: 'approve' | 'reject'; review_notes: string }
): Promise<SuspectSubmission> => {
  const response = await api.post<SuspectSubmission>(`${SUBMISSIONS_URL}/${id}/review/`, data);
  return response.data;
};

/* ─── Interrogations ────────────────────────────────────────────── */

export const getInterrogations = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<Interrogation>> => {
  const response = await api.get<PaginatedResponse<Interrogation>>(`${INTERROGATIONS_URL}/`, { params });
  return response.data;
};

export const getInterrogation = async (id: number): Promise<Interrogation> => {
  const response = await api.get<Interrogation>(`${INTERROGATIONS_URL}/${id}/`);
  return response.data;
};

export const createInterrogation = async (
  data: { suspect: number; detective: number; sergeant: number }
): Promise<Interrogation> => {
  const response = await api.post<Interrogation>(`${INTERROGATIONS_URL}/`, data);
  return response.data;
};

export const updateInterrogation = async (
  id: number,
  data: Partial<Interrogation>
): Promise<Interrogation> => {
  const response = await api.patch<Interrogation>(`${INTERROGATIONS_URL}/${id}/`, data);
  return response.data;
};

/** Submit completed ratings to captain for review */
export const submitInterrogationRatings = async (
  id: number,
  data: {
    detective_guilt_rating: number;
    sergeant_guilt_rating: number;
    detective_notes: string;
    sergeant_notes: string;
  }
): Promise<Interrogation> => {
  const response = await api.post<Interrogation>(
    `${INTERROGATIONS_URL}/${id}/submit_ratings/`,
    data
  );
  return response.data;
};

/* ─── Captain Decisions ─────────────────────────────────────────── */

export const getCaptainDecisions = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<CaptainDecision>> => {
  const response = await api.get<PaginatedResponse<CaptainDecision>>(`${CAPTAIN_URL}/`, { params });
  return response.data;
};

export const createCaptainDecision = async (
  data: { interrogation: number; decision: string; reasoning: string; requires_chief_approval?: boolean }
): Promise<CaptainDecision> => {
  const response = await api.post<CaptainDecision>(`${CAPTAIN_URL}/`, data);
  return response.data;
};

/* ─── Police Chief Decisions ────────────────────────────────────── */

export const getChiefDecisions = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<PoliceChiefDecision>> => {
  const response = await api.get<PaginatedResponse<PoliceChiefDecision>>(`${CHIEF_URL}/`, { params });
  return response.data;
};

export const createChiefDecision = async (
  data: { captain_decision: number; decision: string; comments?: string }
): Promise<PoliceChiefDecision> => {
  const response = await api.post<PoliceChiefDecision>(`${CHIEF_URL}/`, data);
  return response.data;
};

/* ─── TipOffs ───────────────────────────────────────────────────── */

export const getTipOffs = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<TipOff>> => {
  const response = await api.get<PaginatedResponse<TipOff>>(`${TIPOFFS_URL}/`, { params });
  return response.data;
};

export const createTipOff = async (
  data: { case: number; suspect?: number; information: string }
): Promise<TipOff> => {
  const response = await api.post<TipOff>(`${TIPOFFS_URL}/`, data);
  return response.data;
};

export const officerReviewTipOff = async (
  id: number,
  data: { approved: boolean; rejection_reason?: string }
): Promise<{ message: string; tip: TipOff }> => {
  const response = await api.post<{ message: string; tip: TipOff }>(`${TIPOFFS_URL}/${id}/officer_review/`, data);
  return response.data;
};

export const detectiveReviewTipOff = async (
  id: number,
  data: { approved: boolean; rejection_reason?: string }
): Promise<{ message: string; tip: TipOff }> => {
  const response = await api.post<{ message: string; tip: TipOff }>(`${TIPOFFS_URL}/${id}/detective_review/`, data);
  return response.data;
};

export const verifyReward = async (
  data: { redemption_code: string; national_id: string }
): Promise<{ valid: boolean; reward_amount?: number }> => {
  const response = await api.post(`${TIPOFFS_URL}/verify_reward/`, data);
  return response.data;
};

export const redeemReward = async (
  data: { redemption_code: string; national_id: string }
): Promise<{ message: string }> => {
  const response = await api.post(`${TIPOFFS_URL}/redeem_reward/`, data);
  return response.data;
};

/* ─── Notifications ─────────────────────────────────────────────── */

export const getNotifications = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<AppNotification>> => {
  const response = await api.get<PaginatedResponse<AppNotification>>(`${NOTIFICATIONS_URL}/`, { params });
  return response.data;
};

export const markNotificationsRead = async (
  ids: number[]
): Promise<{ message: string }> => {
  const response = await api.post(`${NOTIFICATIONS_URL}/mark_read/`, { notification_ids: ids });
  return response.data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const response = await api.get<{ count: number }>(`${NOTIFICATIONS_URL}/unread_count/`);
  return response.data;
};
