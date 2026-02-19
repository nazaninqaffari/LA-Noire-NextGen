/**
 * Suspect Submissions Page
 * - Detectives: Create suspect submissions for a case and view their submission history
 * - Sergeants: Review pending submissions (approve / reject)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  getSuspects,
  getSuspectSubmissions,
  createSuspectSubmission,
  reviewSuspectSubmission,
} from '../services/investigation';
import type { Suspect, SuspectSubmission } from '../types';
import { SkeletonCard } from '../components/LoadingSkeleton';
import './SuspectSubmissions.css';

const SuspectSubmissionsPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case') ? Number(searchParams.get('case')) : undefined;

  // Role helpers
  const userRoles = (user?.roles || []).map((r) => r.name.toLowerCase());
  const isDetective = userRoles.includes('detective');
  const isSergeant = userRoles.includes('sergeant');

  // Submissions list
  const [submissions, setSubmissions] = useState<SuspectSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // New submission form (detective)
  const [showForm, setShowForm] = useState(false);
  const [caseSuspects, setCaseSuspects] = useState<Suspect[]>([]);
  const [selectedSuspects, setSelectedSuspects] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review form (sergeant)
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (caseId) params.case = caseId;
      const res = await getSuspectSubmissions(params);
      setSubmissions(res.results);
    } catch {
      showNotification('Failed to load suspect submissions', 'error');
    } finally {
      setLoading(false);
    }
  }, [caseId, showNotification]);

  // Fetch suspects for the case (detective form)
  const fetchCaseSuspects = useCallback(async () => {
    if (!caseId) return;
    try {
      const res = await getSuspects({ case: caseId });
      setCaseSuspects(res.results);
    } catch {
      // Silently handle
    }
  }, [caseId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    if (showForm && caseId) fetchCaseSuspects();
  }, [showForm, caseId, fetchCaseSuspects]);

  /* ─── Detective: Create Submission ─────────────────────────────── */

  const toggleSuspect = (suspectId: number) => {
    setSelectedSuspects((prev) =>
      prev.includes(suspectId)
        ? prev.filter((id) => id !== suspectId)
        : [...prev, suspectId]
    );
  };

  const handleSubmit = async () => {
    if (!caseId) {
      showNotification('No case specified. Add ?case=ID to the URL.', 'error');
      return;
    }
    if (selectedSuspects.length === 0) {
      showNotification('Select at least one suspect', 'error');
      return;
    }
    if (reasoning.trim().length < 10) {
      showNotification('Reasoning must be at least 10 characters', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createSuspectSubmission({
        case: caseId,
        suspects: selectedSuspects,
        reasoning: reasoning.trim(),
      });
      showNotification('Suspect submission sent to sergeant for review', 'success');
      setShowForm(false);
      setSelectedSuspects([]);
      setReasoning('');
      fetchSubmissions();
    } catch {
      showNotification('Failed to submit suspect list', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Sergeant: Review ─────────────────────────────────────────── */

  const handleReview = async (id: number, decision: 'approve' | 'reject') => {
    if (reviewNotes.trim().length < 10) {
      showNotification('Review notes must be at least 10 characters', 'error');
      return;
    }
    setReviewSubmitting(true);
    try {
      await reviewSuspectSubmission(id, {
        decision,
        review_notes: reviewNotes.trim(),
      });
      showNotification(
        decision === 'approve'
          ? 'Submission approved — arrest warrants issued'
          : 'Submission rejected — case returned to investigation',
        'success'
      );
      setReviewingId(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch {
      showNotification('Failed to review submission', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  /* ─── Status Badge ─────────────────────────────────────────────── */

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Pending Review', cls: 'badge-pending' },
      approved: { label: 'Approved', cls: 'badge-approved' },
      rejected: { label: 'Rejected', cls: 'badge-rejected' },
    };
    const info = map[status] || { label: status, cls: '' };
    return <span className={`submission-badge ${info.cls}`}>{info.label}</span>;
  };

  /* ─── Render ───────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="suspect-submissions-page">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="suspect-submissions-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Suspect Submissions</h1>
          <p className="page-subtitle">
            Detective → Sergeant approval workflow
            {caseId && <span className="filter-indicator"> — Case #{caseId}</span>}
          </p>
        </div>
        <div className="page-actions">
          {isDetective && caseId && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Cancel' : '+ New Submission'}
            </button>
          )}
          <Link to={caseId ? `/suspects?case=${caseId}` : '/suspects'} className="btn">
            View All Suspects
          </Link>
        </div>
      </div>

      {!caseId && (
        <div className="empty-state-large">
          <p>Select a case to view or create suspect submissions. Navigate from a case detail page or add <code>?case=ID</code> to the URL.</p>
        </div>
      )}

      {/* New Submission Form (Detective) */}
      {showForm && caseId && (
        <div className="card submission-form">
          <h3>Submit Suspect List for Sergeant Review</h3>
          <p className="form-hint">Select the suspects you've identified and explain your reasoning.</p>

          {caseSuspects.length === 0 ? (
            <p className="empty-hint">
              No suspects found for this case. Add suspects from the
              <Link to={`/suspects?case=${caseId}`}> Suspects page</Link> first.
            </p>
          ) : (
            <>
              <div className="suspect-checkboxes">
                {caseSuspects.map((s) => (
                  <label
                    key={s.id}
                    className={`suspect-checkbox ${selectedSuspects.includes(s.id) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuspects.includes(s.id)}
                      onChange={() => toggleSuspect(s.id)}
                    />
                    <div className="suspect-checkbox-info">
                      <strong>{s.person?.full_name || s.person?.username || `Suspect #${s.id}`}</strong>
                      <span className="suspect-meta">
                        Status: {s.status.replace('_', ' ')} · Danger: {s.danger_score}/10
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="form-group">
                <label htmlFor="reasoning">Reasoning</label>
                <textarea
                  id="reasoning"
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Explain why these suspects should be arrested (min 10 characters)..."
                  rows={4}
                />
              </div>
              <div className="form-actions-inline">
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting || selectedSuspects.length === 0}
                >
                  {submitting ? 'Submitting…' : 'Submit to Sergeant'}
                </button>
                <button className="btn" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Submissions List */}
      {caseId && submissions.length === 0 && !showForm && (
        <div className="empty-state-large">
          <p>No suspect submissions for this case yet.</p>
          {isDetective && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Create First Submission
            </button>
          )}
        </div>
      )}

      {submissions.length > 0 && (
        <div className="submissions-list">
          {submissions.map((sub) => (
            <div key={sub.id} className={`card submission-card ${sub.status}`}>
              <div className="submission-header">
                <div>
                  <h3>Submission #{sub.id}</h3>
                  {statusBadge(sub.status)}
                </div>
                <span className="submission-date">
                  {new Date(sub.submitted_at || sub.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="submission-meta">
                <span>
                  <strong>Detective:</strong>{' '}
                  {(sub as any).detective_name || (sub.detective as any)?.full_name || (sub.detective as any)?.username || 'Unknown'}
                </span>
                <span>
                  <strong>Suspects:</strong>{' '}
                  {Array.isArray(sub.suspects) ? sub.suspects.length : 0} identified
                </span>
              </div>

              <div className="submission-reasoning">
                <strong>Reasoning:</strong>
                <p>{sub.reasoning}</p>
              </div>

              {((sub as any).review_notes || sub.sergeant_feedback) && (
                <div className="submission-feedback">
                  <strong>Sergeant Feedback:</strong>
                  <p>{(sub as any).review_notes || sub.sergeant_feedback}</p>
                </div>
              )}

              {/* Sergeant review controls */}
              {isSergeant && sub.status === 'pending' && (
                <>
                  {reviewingId === sub.id ? (
                    <div className="review-form">
                      <div className="form-group">
                        <label>Review Notes (min 10 characters)</label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Provide your assessment and reasoning..."
                          rows={3}
                        />
                      </div>
                      <div className="form-actions-inline">
                        <button
                          className="btn btn-success"
                          onClick={() => handleReview(sub.id, 'approve')}
                          disabled={reviewSubmitting}
                        >
                          ✓ Approve & Issue Warrants
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleReview(sub.id, 'reject')}
                          disabled={reviewSubmitting}
                        >
                          ✕ Reject
                        </button>
                        <button
                          className="btn"
                          onClick={() => { setReviewingId(null); setReviewNotes(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => setReviewingId(sub.id)}
                    >
                      Review Submission
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuspectSubmissionsPage;
