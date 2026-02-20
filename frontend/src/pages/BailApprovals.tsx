/**
 * Bail Approvals Page (Sergeant)
 * Sergeants can view and approve/reject pending bail requests for level 3 crimes.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getBailPayments, approveBailPayment } from '../services/trial';
import type { BailPayment } from '../types';
import { SkeletonCard } from '../components/LoadingSkeleton';
import { extractErrorMessage } from '../utils/errorHandler';
import type { AxiosError } from 'axios';
import './BailPayments.css';

const BailApprovals: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [bailPayments, setBailPayments] = useState<BailPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchBail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBailPayments();
      setBailPayments(res.results || []);
    } catch {
      showNotification('Failed to load bail requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { fetchBail(); }, [fetchBail]);

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      await approveBailPayment(id);
      showNotification('Bail approved successfully', 'success');
      fetchBail();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to approve bail');
      showNotification(msg, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Pending Approval', cls: 'badge-warning' },
      approved: { label: 'Approved', cls: 'badge-info' },
      paid: { label: 'Paid', cls: 'badge-success' },
      rejected: { label: 'Rejected', cls: 'badge-danger' },
    };
    const s = map[status] || { label: status, cls: '' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  const formatAmount = (amt: number) =>
    new Intl.NumberFormat('fa-IR').format(amt) + ' ﷼';

  if (!user) {
    return <div className="page-container"><h1>Bail Approvals</h1><p>Please log in.</p></div>;
  }

  return (
    <div className="page-container bail-page">
      <div className="page-header">
        <h1>Bail Approvals</h1>
        <p className="page-subtitle">
          Review and approve bail requests for level 3 crimes (sergeant only)
        </p>
      </div>

      {loading ? (
        <div className="skeleton-grid"><SkeletonCard /><SkeletonCard /></div>
      ) : bailPayments.length === 0 ? (
        <div className="empty-state"><p>No bail requests to review.</p></div>
      ) : (
        <div className="bail-list">
          {bailPayments.map((bail) => (
            <div key={bail.id} className="card bail-card" data-testid={`bail-approval-${bail.id}`}>
              <div className="bail-card-header">
                <span className="bail-id">Bail #{bail.id}</span>
                {getStatusBadge(bail.status)}
              </div>
              <div className="bail-card-body">
                <div className="bail-detail">
                  <strong>Suspect:</strong> {bail.suspect_name || `#${bail.suspect}`}
                </div>
                <div className="bail-detail">
                  <strong>Amount:</strong> {formatAmount(bail.amount)}
                </div>
                <div className="bail-detail">
                  <strong>Requested:</strong> {new Date(bail.requested_at).toLocaleDateString()}
                </div>
                {bail.sergeant_name && (
                  <div className="bail-detail">
                    <strong>Approved by:</strong> {bail.sergeant_name}
                  </div>
                )}
              </div>
              {bail.status === 'pending' && (
                <div className="bail-card-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(bail.id)}
                    disabled={approvingId === bail.id}
                    data-testid={`approve-bail-${bail.id}`}
                  >
                    {approvingId === bail.id ? 'Approving...' : '✓ Approve Bail'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BailApprovals;
