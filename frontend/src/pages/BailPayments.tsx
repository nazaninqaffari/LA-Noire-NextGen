/**
 * Bail Payments Page
 * Citizens/suspects can request bail and initiate payment via Zarinpal.
 * Shows list of bail requests and their status.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  getBailPayments,
  createBailPayment,
  initiateBailPayment,
} from '../services/trial';
import { getSuspects } from '../services/investigation';
import type { BailPayment } from '../types';
import { SkeletonCard } from '../components/LoadingSkeleton';
import { extractErrorMessage } from '../utils/errorHandler';
import type { AxiosError } from 'axios';
import './BailPayments.css';

const BailPayments: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Any authenticated user can request bail (police or citizen)
  const canIssueBail = !!user;

  const [bailPayments, setBailPayments] = useState<BailPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [suspects, setSuspects] = useState<any[]>([]);
  const [selectedSuspect, setSelectedSuspect] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchBail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBailPayments();
      setBailPayments(res.results || []);
    } catch {
      showNotification('Failed to load bail payments', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchBail();
  }, [fetchBail]);

  useEffect(() => {
    if (!showForm) return;
    const loadSuspects = async () => {
      try {
        const res = await getSuspects({});
        setSuspects(res.results || []);
      } catch { /* ignore */ }
    };
    loadSuspects();
  }, [showForm]);

  const handleRequestBail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBailPayment({
        suspect: Number(selectedSuspect),
        amount: Number(amount),
      });
      showNotification('Bail request submitted successfully', 'success');
      setShowForm(false);
      setSelectedSuspect('');
      setAmount('');
      fetchBail();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to request bail');
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (bailId: number) => {
    setPayingId(bailId);
    try {
      const result = await initiateBailPayment(bailId);
      // Redirect to Zarinpal payment gateway
      window.location.href = result.redirect_url;
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to initiate payment');
      showNotification(msg, 'error');
      setPayingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Pending Approval', cls: 'badge-warning' },
      approved: { label: 'Approved - Ready to Pay', cls: 'badge-info' },
      paid: { label: 'Paid - Released', cls: 'badge-success' },
      rejected: { label: 'Rejected', cls: 'badge-danger' },
    };
    const s = map[status] || { label: status, cls: '' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  const formatAmount = (amt: number) =>
    new Intl.NumberFormat('fa-IR').format(amt) + ' ﷼';

  if (!user) {
    return <div className="page-container"><h1>Bail Payments</h1><p>Please log in.</p></div>;
  }

  return (
    <div className="page-container bail-page">
      <div className="page-header">
        <h1>Bail Payments</h1>
        <p className="page-subtitle">Request and pay bail for eligible suspects (crime level 2 & 3)</p>
        {canIssueBail && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Request Bail'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card bail-form-card">
          <h3>Request Bail</h3>
          <form onSubmit={handleRequestBail}>
            <div className="form-group">
              <label htmlFor="bail-suspect">Suspect</label>
              <select
                id="bail-suspect"
                value={selectedSuspect}
                onChange={(e) => setSelectedSuspect(e.target.value)}
                required
              >
                <option value="">-- Select Suspect --</option>
                {suspects.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.person_full_name || `Suspect #${s.id}`} — Case: {s.case}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="bail-amount">Amount (Rials)</label>
              <input
                id="bail-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 50000000"
                min="1000000"
                required
              />
              <small>Minimum: 1,000,000 Rials</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Bail Request'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="skeleton-grid"><SkeletonCard /><SkeletonCard /></div>
      ) : bailPayments.length === 0 ? (
        <div className="empty-state"><p>No bail payments found.</p></div>
      ) : (
        <div className="bail-list">
          {bailPayments.map((bail) => (
            <div key={bail.id} className="card bail-card" data-testid={`bail-card-${bail.id}`}>
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
                {bail.sergeant_name && (
                  <div className="bail-detail">
                    <strong>Approved by:</strong> {bail.sergeant_name}
                  </div>
                )}
                {bail.payment_reference && (
                  <div className="bail-detail">
                    <strong>Reference:</strong> <code>{bail.payment_reference}</code>
                  </div>
                )}
                <div className="bail-detail">
                  <strong>Requested:</strong> {new Date(bail.requested_at).toLocaleDateString()}
                </div>
              </div>
              {bail.status === 'approved' && (
                <div className="bail-card-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => handlePay(bail.id)}
                    disabled={payingId === bail.id}
                    data-testid={`pay-bail-${bail.id}`}
                  >
                    {payingId === bail.id ? 'Redirecting...' : '💳 Pay via Zarinpal'}
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

export default BailPayments;
