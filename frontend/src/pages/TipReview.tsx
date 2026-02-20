/**
 * Tip Review Page
 * - Officers: Review pending citizen tips (approve → forward to detective, or reject)
 * - Detectives: Review officer-approved tips (approve → issue reward code, or reject)
 * - Higher ranks: View all tips for oversight
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  getTipOffs,
  officerReviewTipOff,
  detectiveReviewTipOff,
} from '../services/investigation';
import type { TipOff } from '../types';
import { SkeletonCard } from '../components/LoadingSkeleton';
import './TipReview.css';

const TipReview: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const userRoles = (user?.roles || []).map((r: any) => r.name?.toLowerCase?.() || r.toLowerCase?.() || '');
  const isOfficer = userRoles.includes('police officer');
  const isDetective = userRoles.includes('detective');
  const isSupervisor = userRoles.some((r: string) =>
    ['sergeant', 'lieutenant', 'captain', 'chief', 'administrator'].includes(r)
  );

  const [tips, setTips] = useState<TipOff[]>([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTipOffs({ page: 1 });
      setTips(res.results || []);
    } catch {
      showNotification('Failed to load tips', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const handleApprove = async (tipId: number) => {
    setSubmitting(true);
    try {
      if (isOfficer && !isDetective) {
        await officerReviewTipOff(tipId, { approved: true });
        showNotification('Tip approved and forwarded to detective', 'success');
      } else if (isDetective) {
        await detectiveReviewTipOff(tipId, { approved: true });
        showNotification('Tip approved — reward code issued to citizen', 'success');
      }
      await fetchTips();
    } catch {
      showNotification('Failed to approve tip', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (tipId: number) => {
    if (!rejectionReason.trim()) {
      showNotification('Please provide a rejection reason', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (isOfficer && !isDetective) {
        await officerReviewTipOff(tipId, { approved: false, rejection_reason: rejectionReason });
        showNotification('Tip rejected', 'success');
      } else if (isDetective) {
        await detectiveReviewTipOff(tipId, { approved: false, rejection_reason: rejectionReason });
        showNotification('Tip rejected as not useful', 'success');
      }
      setReviewingId(null);
      setRejectionReason('');
      await fetchTips();
    } catch {
      showNotification('Failed to reject tip', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'badge-warning' },
      officer_approved: { label: 'Officer Approved', className: 'badge-info' },
      officer_rejected: { label: 'Officer Rejected', className: 'badge-danger' },
      approved: { label: 'Approved', className: 'badge-success' },
      detective_rejected: { label: 'Detective Rejected', className: 'badge-danger' },
      redeemed: { label: 'Redeemed', className: 'badge-muted' },
    };
    const s = map[status] || { label: status, className: '' };
    return <span className={`badge ${s.className}`}>{s.label}</span>;
  };

  const canReview = (tip: TipOff): boolean => {
    if (isOfficer && !isDetective && tip.status === 'pending') return true;
    if (isDetective && tip.status === 'officer_approved') return true;
    return false;
  };

  if (!user) {
    return (
      <div className="page-container">
        <h1>Tip Reviews</h1>
        <p>Please log in to view tips.</p>
      </div>
    );
  }

  return (
    <div className="page-container tip-review-page">
      <div className="page-header">
        <h1>Tip-Off Reviews</h1>
        <p className="page-subtitle">
          {isOfficer && !isDetective && 'Review citizen-submitted tips and forward useful ones to detectives.'}
          {isDetective && 'Review officer-approved tips and issue rewards for useful information.'}
          {isSupervisor && !isOfficer && !isDetective && 'Oversight view of all tip-offs.'}
        </p>
      </div>

      {loading ? (
        <div className="skeleton-grid">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : tips.length === 0 ? (
        <div className="empty-state">
          <p>No tips to review at this time.</p>
        </div>
      ) : (
        <div className="tip-list">
          {tips.map((tip) => (
            <div key={tip.id} className="card tip-card" data-testid={`tip-card-${tip.id}`}>
              <div className="tip-card-header">
                <div className="tip-meta">
                  <span className="tip-case">
                    📁 {tip.case_title || tip.case_number || `Case #${tip.case}`}
                  </span>
                  {tip.suspect_name && (
                    <span className="tip-suspect">👤 {tip.suspect_name}</span>
                  )}
                </div>
                {getStatusBadge(tip.status)}
              </div>

              <div className="tip-card-body">
                <div className="tip-info-section">
                  <strong>Information:</strong>
                  <p className="tip-information">{tip.information}</p>
                </div>

                <div className="tip-details">
                  <span>Submitted by: {tip.submitted_by_name || 'Anonymous'}</span>
                  <span>Date: {new Date(tip.submitted_at).toLocaleDateString()}</span>
                  {tip.reward_amount && (
                    <span>Reward: {new Intl.NumberFormat('fa-IR').format(tip.reward_amount)} ﷼</span>
                  )}
                </div>

                {tip.officer_rejection_reason && (
                  <div className="rejection-reason">
                    <strong>Officer Rejection:</strong> {tip.officer_rejection_reason}
                  </div>
                )}
                {tip.detective_rejection_reason && (
                  <div className="rejection-reason">
                    <strong>Detective Rejection:</strong> {tip.detective_rejection_reason}
                  </div>
                )}
                {tip.redemption_code && (
                  <div className="reward-code">
                    <strong>Reward Code:</strong> <code>{tip.redemption_code}</code>
                  </div>
                )}
              </div>

              {canReview(tip) && (
                <div className="tip-card-actions">
                  {reviewingId === tip.id ? (
                    <div className="reject-form">
                      <textarea
                        className="rejection-input"
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                        data-testid={`rejection-reason-${tip.id}`}
                      />
                      <div className="reject-buttons">
                        <button
                          className="btn btn-danger"
                          onClick={() => handleReject(tip.id)}
                          disabled={submitting}
                          data-testid={`confirm-reject-${tip.id}`}
                        >
                          Confirm Reject
                        </button>
                        <button
                          className="btn"
                          onClick={() => { setReviewingId(null); setRejectionReason(''); }}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => handleApprove(tip.id)}
                        disabled={submitting}
                        data-testid={`approve-tip-${tip.id}`}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => setReviewingId(tip.id)}
                        disabled={submitting}
                        data-testid={`reject-tip-${tip.id}`}
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TipReview;
