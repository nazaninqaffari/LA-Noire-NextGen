/**
 * Interrogations Page
 * - Detective: Create interrogation for an arrested suspect, submit ratings
 * - Sergeant: View interrogations they're assigned to, submit ratings
 * - Captain: Review submitted interrogations, make guilty/not-guilty decision
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getInterrogations,
  createInterrogation,
  submitInterrogationRatings,
  getSuspects,
  createCaptainDecision,
} from '../services/investigation';
import { getUsers } from '../services/admin';
import { extractErrorMessage } from '../utils/errorHandler';
import type { AxiosError } from 'axios';
import type { Interrogation, Suspect, User } from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './Interrogations.css';

const Interrogations: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const caseFilter = searchParams.get('case') ? Number(searchParams.get('case')) : undefined;

  // Role helpers
  const userRoles = (user?.roles || []).map((r: any) => r.name.toLowerCase());
  const isDetective = userRoles.includes('detective');
  const isSergeant = userRoles.includes('sergeant');
  const isCaptain = userRoles.includes('captain');

  // Interrogation list
  const [interrogations, setInterrogations] = useState<Interrogation[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state (detective)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [caseSuspects, setCaseSuspects] = useState<Suspect[]>([]);
  const [sergeantList, setSergeantList] = useState<User[]>([]);
  const [selectedSuspect, setSelectedSuspect] = useState<number>(0);
  const [selectedSergeant, setSelectedSergeant] = useState<number>(0);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Ratings form state
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [detectiveRating, setDetectiveRating] = useState(5);
  const [sergeantRating, setSergeantRating] = useState(5);
  const [detectiveNotes, setDetectiveNotes] = useState('');
  const [sergeantNotes, setSergeantNotes] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Captain decision form state
  const [decisionId, setDecisionId] = useState<number | null>(null);
  const [decision, setDecision] = useState<'guilty' | 'not_guilty' | 'needs_more'>('guilty');
  const [reasoning, setReasoning] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const fetchInterrogations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (caseFilter) params.suspect__case = caseFilter;
      const res = await getInterrogations(params);
      setInterrogations(res.results || []);
    } catch {
      showNotification('Failed to load interrogations', 'error');
    } finally {
      setLoading(false);
    }
  }, [caseFilter, showNotification]);

  useEffect(() => {
    fetchInterrogations();
  }, [fetchInterrogations]);

  // Fetch suspects + sergeants when create form opens
  useEffect(() => {
    if (!showCreateForm || !caseFilter) return;
    const load = async () => {
      try {
        const res = await getSuspects({ case: caseFilter });
        setCaseSuspects(res.results || []);
      } catch { /* ignore */ }
      try {
        const res = await getUsers({ search: '' });
        // Filter for sergeants — user list returns all, we pick by role name
        setSergeantList((res.results || []).filter((u: any) =>
          u.roles?.some((r: any) => r.name?.toLowerCase() === 'sergeant')
        ));
      } catch { /* ignore */ }
    };
    load();
  }, [showCreateForm, caseFilter]);

  /* ─── Create Interrogation (Detective) ─────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspect || !selectedSergeant || !user?.id) {
      showNotification('Select a suspect and sergeant', 'error');
      return;
    }
    setCreateSubmitting(true);
    try {
      await createInterrogation({
        suspect: selectedSuspect,
        detective: user.id,
        sergeant: selectedSergeant,
      });
      showNotification('Interrogation created successfully', 'success');
      setShowCreateForm(false);
      setSelectedSuspect(0);
      setSelectedSergeant(0);
      fetchInterrogations();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to create interrogation');
      showNotification(msg, 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  /* ─── Submit Ratings ───────────────────────────────────────────── */

  const handleSubmitRatings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingId) return;
    setRatingSubmitting(true);
    try {
      await submitInterrogationRatings(ratingId, {
        detective_guilt_rating: detectiveRating,
        sergeant_guilt_rating: sergeantRating,
        detective_notes: detectiveNotes,
        sergeant_notes: sergeantNotes,
      });
      showNotification('Ratings submitted to captain', 'success');
      setRatingId(null);
      setDetectiveNotes('');
      setSergeantNotes('');
      fetchInterrogations();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to submit ratings');
      showNotification(msg, 'error');
    } finally {
      setRatingSubmitting(false);
    }
  };

  /* ─── Captain Decision ─────────────────────────────────────────── */

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionId) return;
    setDecisionSubmitting(true);
    try {
      await createCaptainDecision({
        interrogation: decisionId,
        decision,
        reasoning,
      });
      showNotification('Decision recorded', 'success');
      setDecisionId(null);
      setReasoning('');
      fetchInterrogations();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to record decision');
      showNotification(msg, 'error');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  /* ─── Status Badge ─────────────────────────────────────────────── */

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Pending', cls: 'badge-pending' },
      submitted: { label: 'Submitted to Captain', cls: 'badge-submitted' },
      reviewed: { label: 'Reviewed', cls: 'badge-reviewed' },
    };
    const info = map[status] || { label: status, cls: '' };
    return <span className={`interrogation-badge ${info.cls}`}>{info.label}</span>;
  };

  /* ─── Render ───────────────────────────────────────────────────── */

  return (
    <div className="interrogations-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Interrogations</h1>
          <p className="page-subtitle">
            Suspect interrogation &amp; captain review
            {caseFilter && <span className="filter-indicator"> — Case #{caseFilter}</span>}
          </p>
        </div>
        {isDetective && caseFilter && (
          <div className="page-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? '✕ Cancel' : '+ New Interrogation'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Create Interrogation Form ────────────────────────────── */}
      {showCreateForm && caseFilter && (
        <form className="card interrogation-form" onSubmit={handleCreate}>
          <h3>Create New Interrogation</h3>
          <div className="form-group">
            <label htmlFor="interrogation-suspect">Suspect</label>
            <select
              id="interrogation-suspect"
              value={selectedSuspect}
              onChange={(e) => setSelectedSuspect(Number(e.target.value))}
              required
            >
              <option value={0} disabled>Select suspect...</option>
              {caseSuspects.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s as any).person_full_name || `${(s as any).person_first_name || ''} ${(s as any).person_last_name || ''}`.trim() || `Suspect #${s.id}`} — {s.status}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="interrogation-sergeant">Sergeant</label>
            <select
              id="interrogation-sergeant"
              value={selectedSergeant}
              onChange={(e) => setSelectedSergeant(Number(e.target.value))}
              required
            >
              <option value={0} disabled>Select sergeant...</option>
              {sergeantList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} (@{s.username})
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions-inline">
            <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
              {createSubmitting ? 'Creating...' : 'Create Interrogation'}
            </button>
            <button type="button" className="btn" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ─── Interrogation List ───────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton variant="card" />
      ) : interrogations.length === 0 ? (
        <div className="empty-state-large">
          <p>No interrogations found.</p>
        </div>
      ) : (
        <div className="interrogation-list">
          {interrogations.map((intg: any) => (
            <div key={intg.id} className={`card interrogation-card ${intg.status}`}>
              <div className="interrogation-header">
                <h3>Interrogation #{intg.id}</h3>
                {statusBadge(intg.status)}
              </div>

              <div className="interrogation-meta">
                <span><strong>Suspect:</strong> {intg.suspect_name || `Suspect #${typeof intg.suspect === 'object' ? intg.suspect?.id : intg.suspect}`}</span>
                <span><strong>Detective:</strong> {intg.detective_name || `Detective #${typeof intg.detective === 'object' ? intg.detective?.id : intg.detective}`}</span>
                <span><strong>Sergeant:</strong> {intg.sergeant_name || `Sergeant #${typeof intg.sergeant === 'object' ? intg.sergeant?.id : intg.sergeant}`}</span>
              </div>

              {/* Ratings display (when submitted) */}
              {intg.detective_guilt_rating != null && (
                <div className="ratings-display">
                  <div className="rating-item">
                    <span className="rating-label">Detective Rating</span>
                    <span className="rating-value">{intg.detective_guilt_rating}/10</span>
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">Sergeant Rating</span>
                    <span className="rating-value">{intg.sergeant_guilt_rating}/10</span>
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">Average</span>
                    <span className="rating-value highlight">{intg.average_rating?.toFixed(1) || '—'}/10</span>
                  </div>
                </div>
              )}

              {intg.detective_notes && (
                <div className="interrogation-notes">
                  <strong>Detective Notes:</strong> <p>{intg.detective_notes}</p>
                </div>
              )}
              {intg.sergeant_notes && (
                <div className="interrogation-notes">
                  <strong>Sergeant Notes:</strong> <p>{intg.sergeant_notes}</p>
                </div>
              )}

              {/* Submit Ratings button (detective/sergeant, pending only) */}
              {(isDetective || isSergeant) && intg.status === 'pending' && (
                <>
                  {ratingId === intg.id ? (
                    <form className="ratings-form" onSubmit={handleSubmitRatings}>
                      <h4>Submit Interrogation Ratings</h4>
                      <div className="rating-inputs">
                        <div className="form-group">
                          <label htmlFor={`det-rating-${intg.id}`}>Detective Guilt Rating (1-10)</label>
                          <input
                            id={`det-rating-${intg.id}`}
                            type="number"
                            min={1}
                            max={10}
                            value={detectiveRating}
                            onChange={(e) => setDetectiveRating(Number(e.target.value))}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`sgt-rating-${intg.id}`}>Sergeant Guilt Rating (1-10)</label>
                          <input
                            id={`sgt-rating-${intg.id}`}
                            type="number"
                            min={1}
                            max={10}
                            value={sergeantRating}
                            onChange={(e) => setSergeantRating(Number(e.target.value))}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`det-notes-${intg.id}`}>Detective Notes</label>
                        <textarea
                          id={`det-notes-${intg.id}`}
                          value={detectiveNotes}
                          onChange={(e) => setDetectiveNotes(e.target.value)}
                          placeholder="Detective observations from the interrogation..."
                          rows={3}
                          required
                          minLength={10}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`sgt-notes-${intg.id}`}>Sergeant Notes</label>
                        <textarea
                          id={`sgt-notes-${intg.id}`}
                          value={sergeantNotes}
                          onChange={(e) => setSergeantNotes(e.target.value)}
                          placeholder="Sergeant observations and recommendation..."
                          rows={3}
                          required
                          minLength={10}
                        />
                      </div>
                      <div className="form-actions-inline">
                        <button type="submit" className="btn btn-primary" disabled={ratingSubmitting}>
                          {ratingSubmitting ? 'Submitting...' : 'Submit Ratings'}
                        </button>
                        <button type="button" className="btn" onClick={() => setRatingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => setRatingId(intg.id)}
                    >
                      📝 Submit Ratings
                    </button>
                  )}
                </>
              )}

              {/* Captain Decision button (captain, submitted only) */}
              {isCaptain && intg.status === 'submitted' && (
                <>
                  {decisionId === intg.id ? (
                    <form className="decision-form" onSubmit={handleDecision}>
                      <h4>Captain's Decision</h4>
                      <div className="form-group">
                        <label>Decision</label>
                        <div className="decision-options">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`decision-${intg.id}`}
                              value="guilty"
                              checked={decision === 'guilty'}
                              onChange={() => setDecision('guilty')}
                            />
                            Guilty
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`decision-${intg.id}`}
                              value="not_guilty"
                              checked={decision === 'not_guilty'}
                              onChange={() => setDecision('not_guilty')}
                            />
                            Not Guilty
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`decision-${intg.id}`}
                              value="needs_more"
                              checked={decision === 'needs_more'}
                              onChange={() => setDecision('needs_more')}
                            />
                            Needs More Investigation
                          </label>
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`reasoning-${intg.id}`}>Reasoning (min 20 characters)</label>
                        <textarea
                          id={`reasoning-${intg.id}`}
                          value={reasoning}
                          onChange={(e) => setReasoning(e.target.value)}
                          placeholder="Explain your decision based on the evidence and interrogation results..."
                          rows={4}
                          required
                          minLength={20}
                        />
                      </div>
                      <div className="form-actions-inline">
                        <button type="submit" className="btn btn-primary" disabled={decisionSubmitting}>
                          {decisionSubmitting ? 'Recording...' : 'Record Decision'}
                        </button>
                        <button type="button" className="btn" onClick={() => setDecisionId(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => setDecisionId(intg.id)}
                    >
                      ⚖️ Make Decision
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

export default Interrogations;
