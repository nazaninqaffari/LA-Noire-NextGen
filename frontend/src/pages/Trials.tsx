/**
 * Trials Page
 * View and manage trial proceedings, verdicts, and bail
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { getTrials, getCaseSummary, deliverVerdict } from '../services/trial';
import { useAuth } from '../contexts/AuthContext';
import type { Trial } from '../types';
import { SkeletonTable } from '../components/LoadingSkeleton';
import './Trials.css';

const Trials: React.FC = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);
  const [caseSummary, setCaseSummary] = useState<any>(null);
  const [showVerdictForm, setShowVerdictForm] = useState(false);
  const [verdict, setVerdict] = useState<'guilty' | 'innocent'>('guilty');
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isJudge = user?.roles?.some((r) => r.name.toLowerCase() === 'judge') ||
    user?.role?.name?.toLowerCase() === 'judge';

  const fetchTrials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrials();
      setTrials(res.results);
    } catch {
      showNotification('Failed to load trials', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchTrials();
  }, [fetchTrials]);

  const handleViewSummary = async (trial: Trial) => {
    setSelectedTrial(trial);
    try {
      const summary = await getCaseSummary(trial.id);
      setCaseSummary(summary);
    } catch {
      setCaseSummary(null);
      showNotification('Failed to load case summary', 'error');
    }
  };

  const handleDeliverVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrial) return;
    setSubmitting(true);
    try {
      await deliverVerdict(selectedTrial.id, { verdict, reasoning });
      showNotification('Verdict delivered successfully', 'success');
      setShowVerdictForm(false);
      setReasoning('');
      fetchTrials();
    } catch {
      showNotification('Failed to deliver verdict', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'trial-pending' },
      in_progress: { label: 'In Progress', className: 'trial-progress' },
      completed: { label: 'Completed', className: 'trial-completed' },
    };
    const info = map[status] || { label: status, className: '' };
    return <span className={`trial-status-badge ${info.className}`}>{info.label}</span>;
  };

  if (loading) {
    return (
      <div className="trials-page">
        <div className="page-header"><h1>Trial Records</h1></div>
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="trials-page">
      <div className="page-header">
        <h1 className="page-title">Trial Records</h1>
        <p className="page-subtitle">Court proceedings and verdict management</p>
      </div>

      <div className="trials-layout">
        {/* Trial List */}
        <div className="trials-list">
          {trials.length === 0 ? (
            <div className="empty-state-large">
              <p>No trials on record.</p>
            </div>
          ) : (
            trials.map((trial) => (
              <div
                key={trial.id}
                className={`trial-card ${selectedTrial?.id === trial.id ? 'selected' : ''}`}
                onClick={() => handleViewSummary(trial)}
              >
                <div className="trial-card-header">
                  <span className="trial-id">Trial #{trial.id}</span>
                  {getStatusLabel(trial.status)}
                </div>
                <div className="trial-card-body">
                  <div className="trial-suspect">
                    Suspect: {trial.suspect?.person?.first_name} {trial.suspect?.person?.last_name}
                  </div>
                  {trial.case_title && (
                    <div className="trial-case">Case: {trial.case_title}</div>
                  )}
                  {trial.trial_date && (
                    <div className="trial-date">
                      Date: {new Date(trial.trial_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Trial Detail */}
        <div className="trial-detail">
          {selectedTrial ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Trial #{selectedTrial.id} Details</h3>
                {getStatusLabel(selectedTrial.status)}
              </div>
              <div className="card-body">
                {/* Case Summary */}
                {caseSummary && (
                  <div className="summary-section">
                    <h4>Case Summary</h4>
                    <pre className="summary-content">
                      {typeof caseSummary === 'string'
                        ? caseSummary
                        : JSON.stringify(caseSummary, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Verdict Actions (Judge only) */}
                {isJudge && selectedTrial.status !== 'completed' && (
                  <div className="verdict-section">
                    {!showVerdictForm ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowVerdictForm(true)}
                      >
                        ⚖️ Deliver Verdict
                      </button>
                    ) : (
                      <form onSubmit={handleDeliverVerdict} className="verdict-form">
                        <h4>Deliver Verdict</h4>
                        <div className="form-group">
                          <label>Verdict</label>
                          <div className="verdict-options">
                            <label className="radio-label">
                              <input
                                type="radio"
                                name="verdict"
                                value="guilty"
                                checked={verdict === 'guilty'}
                                onChange={() => setVerdict('guilty')}
                              />
                              Guilty
                            </label>
                            <label className="radio-label">
                              <input
                                type="radio"
                                name="verdict"
                                value="innocent"
                                checked={verdict === 'innocent'}
                                onChange={() => setVerdict('innocent')}
                              />
                              Innocent
                            </label>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Reasoning</label>
                          <textarea
                            value={reasoning}
                            onChange={(e) => setReasoning(e.target.value)}
                            placeholder="Explain the verdict reasoning..."
                            rows={4}
                            required
                          />
                        </div>
                        <div className="form-actions-inline">
                          <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Verdict'}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setShowVerdictForm(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Existing Verdicts */}
                {selectedTrial.verdicts && selectedTrial.verdicts.length > 0 && (
                  <div className="verdicts-section">
                    <h4>Verdicts</h4>
                    {selectedTrial.verdicts.map((v) => (
                      <div key={v.id} className={`verdict-card ${v.verdict}`}>
                        <div className="verdict-result">
                          {v.verdict === 'guilty' ? '⚖️ GUILTY' : '✓ INNOCENT'}
                        </div>
                        <div className="verdict-reasoning">{v.reasoning}</div>
                        <div className="verdict-meta">
                          Judge: {v.judge?.username} — {new Date(v.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state-large">
              <p>Select a trial to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trials;
