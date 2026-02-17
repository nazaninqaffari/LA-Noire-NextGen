/**
 * Evidence Service
 * API functions for managing all evidence types
 */
import { api } from './api';
import type {
  Testimony,
  BiologicalEvidence,
  VehicleEvidence,
  IDDocument,
  GenericEvidence,
  EvidenceImage,
  PaginatedResponse,
} from '../types';

// Base URLs for evidence endpoints
const TESTIMONIES_URL = '/evidence/testimonies';
const BIOLOGICAL_URL = '/evidence/biological';
const VEHICLES_URL = '/evidence/vehicles';
const ID_DOCUMENTS_URL = '/evidence/id-documents';
const GENERIC_URL = '/evidence/generic';
const IMAGES_URL = '/evidence/images';

/* ─── Testimonies ───────────────────────────────────────────────── */

export const getTestimonies = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<Testimony>> => {
  const response = await api.get<PaginatedResponse<Testimony>>(`${TESTIMONIES_URL}/`, { params });
  return response.data;
};

export const getTestimony = async (id: number): Promise<Testimony> => {
  const response = await api.get<Testimony>(`${TESTIMONIES_URL}/${id}/`);
  return response.data;
};

export const createTestimony = async (data: FormData): Promise<Testimony> => {
  const response = await api.post<Testimony>(`${TESTIMONIES_URL}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteTestimony = async (id: number): Promise<void> => {
  await api.delete(`${TESTIMONIES_URL}/${id}/`);
};

/* ─── Biological Evidence ───────────────────────────────────────── */

export const getBiologicalEvidence = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<BiologicalEvidence>> => {
  const response = await api.get<PaginatedResponse<BiologicalEvidence>>(`${BIOLOGICAL_URL}/`, { params });
  return response.data;
};

export const getBiologicalEvidenceItem = async (id: number): Promise<BiologicalEvidence> => {
  const response = await api.get<BiologicalEvidence>(`${BIOLOGICAL_URL}/${id}/`);
  return response.data;
};

export const createBiologicalEvidence = async (data: FormData): Promise<BiologicalEvidence> => {
  const response = await api.post<BiologicalEvidence>(`${BIOLOGICAL_URL}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/** Forensic doctor verifies biological evidence */
export const verifyBiologicalEvidence = async (
  id: number,
  data: { coroner_analysis: string; identity_match?: number }
): Promise<BiologicalEvidence> => {
  const response = await api.post<BiologicalEvidence>(`${BIOLOGICAL_URL}/${id}/verify/`, data);
  return response.data;
};

export const deleteBiologicalEvidence = async (id: number): Promise<void> => {
  await api.delete(`${BIOLOGICAL_URL}/${id}/`);
};

/* ─── Vehicle Evidence ──────────────────────────────────────────── */

export const getVehicleEvidence = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<VehicleEvidence>> => {
  const response = await api.get<PaginatedResponse<VehicleEvidence>>(`${VEHICLES_URL}/`, { params });
  return response.data;
};

export const getVehicleEvidenceItem = async (id: number): Promise<VehicleEvidence> => {
  const response = await api.get<VehicleEvidence>(`${VEHICLES_URL}/${id}/`);
  return response.data;
};

export const createVehicleEvidence = async (
  data: Partial<VehicleEvidence>
): Promise<VehicleEvidence> => {
  const response = await api.post<VehicleEvidence>(`${VEHICLES_URL}/`, data);
  return response.data;
};

export const deleteVehicleEvidence = async (id: number): Promise<void> => {
  await api.delete(`${VEHICLES_URL}/${id}/`);
};

/* ─── ID Documents ──────────────────────────────────────────────── */

export const getIDDocuments = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<IDDocument>> => {
  const response = await api.get<PaginatedResponse<IDDocument>>(`${ID_DOCUMENTS_URL}/`, { params });
  return response.data;
};

export const getIDDocument = async (id: number): Promise<IDDocument> => {
  const response = await api.get<IDDocument>(`${ID_DOCUMENTS_URL}/${id}/`);
  return response.data;
};

export const createIDDocument = async (data: Partial<IDDocument>): Promise<IDDocument> => {
  const response = await api.post<IDDocument>(`${ID_DOCUMENTS_URL}/`, data);
  return response.data;
};

export const deleteIDDocument = async (id: number): Promise<void> => {
  await api.delete(`${ID_DOCUMENTS_URL}/${id}/`);
};

/* ─── Generic Evidence ──────────────────────────────────────────── */

export const getGenericEvidence = async (params?: {
  case?: number;
  page?: number;
}): Promise<PaginatedResponse<GenericEvidence>> => {
  const response = await api.get<PaginatedResponse<GenericEvidence>>(`${GENERIC_URL}/`, { params });
  return response.data;
};

export const getGenericEvidenceItem = async (id: number): Promise<GenericEvidence> => {
  const response = await api.get<GenericEvidence>(`${GENERIC_URL}/${id}/`);
  return response.data;
};

export const createGenericEvidence = async (
  data: Partial<GenericEvidence>
): Promise<GenericEvidence> => {
  const response = await api.post<GenericEvidence>(`${GENERIC_URL}/`, data);
  return response.data;
};

export const deleteGenericEvidence = async (id: number): Promise<void> => {
  await api.delete(`${GENERIC_URL}/${id}/`);
};

/* ─── Evidence Images ───────────────────────────────────────────── */

export const uploadEvidenceImage = async (data: FormData): Promise<EvidenceImage> => {
  const response = await api.post<EvidenceImage>(`${IMAGES_URL}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteEvidenceImage = async (id: number): Promise<void> => {
  await api.delete(`${IMAGES_URL}/${id}/`);
};
