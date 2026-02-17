/**
 * Case Service
 * API functions for case management and workflows
 */
import { api } from './api';
import type { 
  Case, 
  CaseCreateComplaintData, 
  CaseCreateSceneData, 
  CaseReviewData,
  CaseReviewHistory,
  PaginatedResponse 
} from '../types';

const CASES_BASE_URL = '/cases/cases';

/**
 * Get list of cases with optional filters
 */
export const getCases = async (params?: {
  status?: string;
  crime_level?: number;
  page?: number;
  search?: string;
}): Promise<PaginatedResponse<Case>> => {
  const response = await api.get<PaginatedResponse<Case>>(CASES_BASE_URL + '/', { params });
  return response.data;
};

/**
 * Get a single case by ID
 */
export const getCase = async (id: number): Promise<Case> => {
  const response = await api.get<Case>(`${CASES_BASE_URL}/${id}/`);
  return response.data;
};

/**
 * Create a new complaint-based case
 */
export const createComplaintCase = async (data: CaseCreateComplaintData): Promise<Case> => {
  const response = await api.post<Case>(CASES_BASE_URL + '/', data);
  return response.data;
};

/**
 * Create a new crime scene-based case
 */
export const createSceneCase = async (data: CaseCreateSceneData): Promise<Case> => {
  const response = await api.post<Case>(CASES_BASE_URL + '/', data);
  return response.data;
};

/**
 * Submit cadet review for a case
 */
export const submitCadetReview = async (
  caseId: number, 
  data: CaseReviewData
): Promise<Case> => {
  const response = await api.post<Case>(`${CASES_BASE_URL}/${caseId}/cadet_review/`, data);
  return response.data;
};

/**
 * Submit officer review for a case
 */
export const submitOfficerReview = async (
  caseId: number, 
  data: CaseReviewData
): Promise<Case> => {
  const response = await api.post<Case>(`${CASES_BASE_URL}/${caseId}/officer_review/`, data);
  return response.data;
};

/**
 * Get review history for a case
 */
export const getCaseReviewHistory = async (caseId: number): Promise<CaseReviewHistory[]> => {
  const response = await api.get<CaseReviewHistory[]>(`${CASES_BASE_URL}/${caseId}/review_history/`);
  return response.data;
};

/**
 * Delete a case (if permitted)
 */
export const deleteCase = async (id: number): Promise<void> => {
  await api.delete(`${CASES_BASE_URL}/${id}/`);
};

/**
 * Update a case (if in draft status)
 */
export const updateCase = async (id: number, data: Partial<CaseCreateComplaintData | CaseCreateSceneData>): Promise<Case> => {
  const response = await api.patch<Case>(`${CASES_BASE_URL}/${id}/`, data);
  return response.data;
};
