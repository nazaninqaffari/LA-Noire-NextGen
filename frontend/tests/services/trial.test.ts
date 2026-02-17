/**
 * Trial Service Tests
 * Tests API calls for trials, verdicts, punishments, and bail payments
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/services/api';
import {
  getTrials,
  getTrial,
  getCaseSummary,
  deliverVerdict,
  getVerdicts,
  getPunishments,
  getBailPayments,
  approveBailPayment,
  payBail,
} from '../../src/services/trial';

vi.mock('../../src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Trial Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trials', () => {
    it('getTrials calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getTrials();
      expect(api.get).toHaveBeenCalledWith('/trial/trials/', { params: undefined });
    });

    it('getTrial calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { id: 1 } });
      await getTrial(1);
      expect(api.get).toHaveBeenCalledWith('/trial/trials/1/');
    });

    it('getCaseSummary calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { summary: 'Test' } });
      const result = await getCaseSummary(3);
      expect(api.get).toHaveBeenCalledWith('/trial/trials/3/case_summary/');
      expect(result).toEqual({ summary: 'Test' });
    });

    it('deliverVerdict posts verdict data', async () => {
      const verdictData = { verdict: 'guilty', reasoning: 'Strong evidence' };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1, ...verdictData } });
      await deliverVerdict(2, verdictData);
      expect(api.post).toHaveBeenCalledWith('/trial/trials/2/deliver_verdict/', verdictData);
    });
  });

  describe('Verdicts', () => {
    it('getVerdicts calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getVerdicts();
      expect(api.get).toHaveBeenCalledWith('/trial/verdicts/', { params: undefined });
    });
  });

  describe('Punishments', () => {
    it('getPunishments calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getPunishments();
      expect(api.get).toHaveBeenCalledWith('/trial/punishments/', { params: undefined });
    });
  });

  describe('Bail Payments', () => {
    it('getBailPayments calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getBailPayments();
      expect(api.get).toHaveBeenCalledWith('/trial/bail-payments/', { params: undefined });
    });

    it('approveBailPayment calls correct endpoint', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { approved: true } });
      await approveBailPayment(4);
      expect(api.post).toHaveBeenCalledWith('/trial/bail-payments/4/approve/');
    });

    it('payBail calls correct endpoint', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { paid: true } });
      await payBail(4, { amount: 5000 });
      expect(api.post).toHaveBeenCalledWith('/trial/bail-payments/4/pay/', { amount: 5000 });
    });
  });
});
