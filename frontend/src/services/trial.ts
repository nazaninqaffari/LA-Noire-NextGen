/**
 * Trial Service
 * API functions for trials, verdicts, punishments, and bail payments
 */
import { api } from './api';
import type {
  Trial,
  TrialVerdict,
  Punishment,
  BailPayment,
  PaginatedResponse,
} from '../types';

// Base URLs
const TRIALS_URL = '/trial/trials';
const VERDICTS_URL = '/trial/verdicts';
const PUNISHMENTS_URL = '/trial/punishments';
const BAIL_URL = '/trial/bail-payments';

/* ─── Trials ────────────────────────────────────────────────────── */

export const getTrials = async (params?: {
  case?: number;
  status?: string;
  page?: number;
}): Promise<PaginatedResponse<Trial>> => {
  const response = await api.get<PaginatedResponse<Trial>>(`${TRIALS_URL}/`, { params });
  return response.data;
};

export const getTrial = async (id: number): Promise<Trial> => {
  const response = await api.get<Trial>(`${TRIALS_URL}/${id}/`);
  return response.data;
};

export const createTrial = async (
  data: { case: number; suspect: number; trial_date?: string }
): Promise<Trial> => {
  const response = await api.post<Trial>(`${TRIALS_URL}/`, data);
  return response.data;
};

/** Get complete case summary for judge review */
export const getCaseSummary = async (trialId: number): Promise<any> => {
  const response = await api.get(`${TRIALS_URL}/${trialId}/case_summary/`);
  return response.data;
};

/** Judge delivers verdict on trial */
export const deliverVerdict = async (
  trialId: number,
  data: { verdict: 'guilty' | 'innocent'; reasoning: string }
): Promise<Trial> => {
  const response = await api.post<Trial>(`${TRIALS_URL}/${trialId}/deliver_verdict/`, data);
  return response.data;
};

/* ─── Verdicts ──────────────────────────────────────────────────── */

export const getVerdicts = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<TrialVerdict>> => {
  const response = await api.get<PaginatedResponse<TrialVerdict>>(`${VERDICTS_URL}/`, { params });
  return response.data;
};

/* ─── Punishments ───────────────────────────────────────────────── */

export const getPunishments = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<Punishment>> => {
  const response = await api.get<PaginatedResponse<Punishment>>(`${PUNISHMENTS_URL}/`, { params });
  return response.data;
};

export const createPunishment = async (
  data: Partial<Punishment>
): Promise<Punishment> => {
  const response = await api.post<Punishment>(`${PUNISHMENTS_URL}/`, data);
  return response.data;
};

/* ─── Bail Payments ─────────────────────────────────────────────── */

export const getBailPayments = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<BailPayment>> => {
  const response = await api.get<PaginatedResponse<BailPayment>>(`${BAIL_URL}/`, { params });
  return response.data;
};

export const createBailPayment = async (
  data: { verdict: number; amount: number }
): Promise<BailPayment> => {
  const response = await api.post<BailPayment>(`${BAIL_URL}/`, data);
  return response.data;
};

/** Sergeant approves bail payment */
export const approveBailPayment = async (id: number): Promise<BailPayment> => {
  const response = await api.post<BailPayment>(`${BAIL_URL}/${id}/approve/`);
  return response.data;
};

/** Process bail payment */
export const payBail = async (
  id: number,
  data: { payment_reference: string }
): Promise<BailPayment> => {
  const response = await api.post<BailPayment>(`${BAIL_URL}/${id}/pay/`, data);
  return response.data;
};
