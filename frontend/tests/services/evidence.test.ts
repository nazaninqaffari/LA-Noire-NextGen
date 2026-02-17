/**
 * Evidence Service Tests
 * Tests API calls for all evidence types (cookie-based auth)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/services/api';
import {
  getTestimonies,
  getTestimony,
  createTestimony,
  deleteTestimony,
  getBiologicalEvidence,
  getVehicleEvidence,
  getIDDocuments,
  getGenericEvidence,
  verifyBiologicalEvidence,
} from '../../src/services/evidence';

// Mock the api module
vi.mock('../../src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Evidence Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Testimonies', () => {
    it('getTestimonies calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getTestimonies();
      expect(api.get).toHaveBeenCalledWith('/evidence/testimonies/', { params: undefined });
    });

    it('getTestimonies with case filter', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getTestimonies({ case: 5 });
      expect(api.get).toHaveBeenCalledWith('/evidence/testimonies/', { params: { case: 5 } });
    });

    it('getTestimony calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { id: 1 } });
      const result = await getTestimony(1);
      expect(api.get).toHaveBeenCalledWith('/evidence/testimonies/1/');
      expect(result).toEqual({ id: 1 });
    });

    it('createTestimony posts FormData', async () => {
      const formData = new FormData();
      formData.append('title', 'Test');
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1, title: 'Test' } });
      await createTestimony(formData);
      expect(api.post).toHaveBeenCalledWith(
        '/evidence/testimonies/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });

    it('deleteTestimony calls correct endpoint', async () => {
      vi.mocked(api.delete).mockResolvedValue({});
      await deleteTestimony(3);
      expect(api.delete).toHaveBeenCalledWith('/evidence/testimonies/3/');
    });
  });

  describe('Biological Evidence', () => {
    it('getBiologicalEvidence calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getBiologicalEvidence();
      expect(api.get).toHaveBeenCalledWith('/evidence/biological/', { params: undefined });
    });

    it('verifyBiologicalEvidence calls correct endpoint', async () => {
      const data = { coroner_analysis: 'Analysis result' };
      vi.mocked(api.post).mockResolvedValue({ data: { verified: true } });
      await verifyBiologicalEvidence(1, data);
      expect(api.post).toHaveBeenCalledWith('/evidence/biological/1/verify/', data);
    });
  });

  describe('Vehicle Evidence', () => {
    it('getVehicleEvidence calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getVehicleEvidence();
      expect(api.get).toHaveBeenCalledWith('/evidence/vehicles/', { params: undefined });
    });
  });

  describe('ID Documents', () => {
    it('getIDDocuments calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getIDDocuments();
      expect(api.get).toHaveBeenCalledWith('/evidence/id-documents/', { params: undefined });
    });
  });

  describe('Generic Evidence', () => {
    it('getGenericEvidence calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getGenericEvidence();
      expect(api.get).toHaveBeenCalledWith('/evidence/generic/', { params: undefined });
    });
  });
});
