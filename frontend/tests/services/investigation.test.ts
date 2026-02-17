/**
 * Investigation Service Tests
 * Tests API calls for detective boards, suspects, interrogations, tipoffs, notifications
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/services/api';
import {
  getDetectiveBoards,
  getDetectiveBoard,
  createDetectiveBoard,
  createBoardItem,
  deleteBoardItem,
  createEvidenceConnection,
  deleteEvidenceConnection,
  getSuspects,
  getIntensivePursuitSuspects,
  createSuspectSubmission,
  reviewSuspectSubmission,
  getInterrogations,
  submitInterrogationRatings,
  getCaptainDecisions,
  getChiefDecisions,
  createTipOff,
  getNotifications,
  markNotificationsRead,
  getUnreadCount,
} from '../../src/services/investigation';

vi.mock('../../src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Investigation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Detective Boards', () => {
    it('getDetectiveBoards calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getDetectiveBoards();
      expect(api.get).toHaveBeenCalledWith('/investigation/detective-boards/', { params: undefined });
    });

    it('getDetectiveBoard calls with id', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { id: 1 } });
      await getDetectiveBoard(1);
      expect(api.get).toHaveBeenCalledWith('/investigation/detective-boards/1/');
    });

    it('createDetectiveBoard posts data', async () => {
      const data = { case: 1, title: 'Board 1' };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1, ...data } });
      await createDetectiveBoard(data);
      expect(api.post).toHaveBeenCalledWith('/investigation/detective-boards/', data);
    });
  });

  describe('Board Items', () => {
    it('createBoardItem posts data', async () => {
      const data = { board: 1, title: 'Item', content: 'Content' };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1 } });
      await createBoardItem(data);
      expect(api.post).toHaveBeenCalledWith('/investigation/board-items/', data);
    });

    it('deleteBoardItem calls correct endpoint', async () => {
      vi.mocked(api.delete).mockResolvedValue({});
      await deleteBoardItem(5);
      expect(api.delete).toHaveBeenCalledWith('/investigation/board-items/5/');
    });
  });

  describe('Evidence Connections', () => {
    it('createEvidenceConnection posts data', async () => {
      const data = { board: 1, from_item: 1, to_item: 2 };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1 } });
      await createEvidenceConnection(data);
      expect(api.post).toHaveBeenCalledWith('/investigation/evidence-connections/', data);
    });

    it('deleteEvidenceConnection calls correct endpoint', async () => {
      vi.mocked(api.delete).mockResolvedValue({});
      await deleteEvidenceConnection(3);
      expect(api.delete).toHaveBeenCalledWith('/investigation/evidence-connections/3/');
    });
  });

  describe('Suspects', () => {
    it('getSuspects calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getSuspects();
      expect(api.get).toHaveBeenCalledWith('/investigation/suspects/', { params: undefined });
    });

    it('getSuspects with status filter', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getSuspects({ status: 'arrested' });
      expect(api.get).toHaveBeenCalledWith('/investigation/suspects/', { params: { status: 'arrested' } });
    });

    it('getIntensivePursuitSuspects calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getIntensivePursuitSuspects();
      expect(api.get).toHaveBeenCalledWith('/investigation/suspects/intensive_pursuit/');
    });
  });

  describe('Suspect Submissions', () => {
    it('createSuspectSubmission posts data', async () => {
      const data = { suspect: 1, notes: 'Submission' };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1 } });
      await createSuspectSubmission(data);
      expect(api.post).toHaveBeenCalledWith('/investigation/suspect-submissions/', data);
    });

    it('reviewSuspectSubmission patches with decision', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });
      await reviewSuspectSubmission(1, { approved: true });
      expect(api.post).toHaveBeenCalledWith(
        '/investigation/suspect-submissions/1/review/',
        { approved: true }
      );
    });
  });

  describe('Interrogations', () => {
    it('getInterrogations calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getInterrogations();
      expect(api.get).toHaveBeenCalledWith('/investigation/interrogations/', { params: undefined });
    });

    it('submitInterrogationRatings posts ratings', async () => {
      const ratings = { score: 8, notes: 'Good interrogation' };
      vi.mocked(api.post).mockResolvedValue({ data: {} });
      await submitInterrogationRatings(1, ratings);
      expect(api.post).toHaveBeenCalledWith(
        '/investigation/interrogations/1/submit_ratings/',
        ratings
      );
    });
  });

  describe('Captain/Chief Decisions', () => {
    it('getCaptainDecisions calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getCaptainDecisions();
      expect(api.get).toHaveBeenCalledWith('/investigation/captain-decisions/', { params: undefined });
    });

    it('getChiefDecisions calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getChiefDecisions();
      expect(api.get).toHaveBeenCalledWith('/investigation/chief-decisions/', { params: undefined });
    });
  });

  describe('TipOffs', () => {
    it('createTipOff posts data', async () => {
      const data = { suspect: 1, description: 'Seen at location X' };
      vi.mocked(api.post).mockResolvedValue({ data: { id: 1 } });
      await createTipOff(data);
      expect(api.post).toHaveBeenCalledWith('/investigation/tipoffs/', data);
    });
  });

  describe('Notifications', () => {
    it('getNotifications calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
      await getNotifications();
      expect(api.get).toHaveBeenCalledWith('/investigation/notifications/', { params: undefined });
    });

    it('markNotificationsRead calls correct endpoint', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });
      await markNotificationsRead([5]);
      expect(api.post).toHaveBeenCalledWith('/investigation/notifications/mark_read/', { notification_ids: [5] });
    });

    it('getUnreadCount calls correct endpoint', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { count: 3 } });
      const result = await getUnreadCount();
      expect(api.get).toHaveBeenCalledWith('/investigation/notifications/unread_count/');
      expect(result).toEqual({ count: 3 });
    });
  });
});
