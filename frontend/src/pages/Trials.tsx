/**
 * Trials Page
 * View and manage trial proceedings, verdicts, bail, and punishments.
 * - Captain: Create trial from guilty captain decision
 * - Judge: Review case summary, deliver verdict (with punishment if guilty)
 * - Sergeant: Approve bail payments
 * - Suspect: Request and pay bail
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import {
  getTrials,
  getCaseSummary,
  deliverVerdict,
  createTrial,
  getBailPayments,
  createBailPayment,
  approveBailPayment,
  payBail,
} from '../services/trial';
import { getSuspects } from '../services/investigation';
import { getUsers } from '../services/admin';
import { getCases } from '../services/case';
import { useAuth } from '../contexts/AuthContext';
import { extractErrorMessage } from '../utils/errorHandler';
import type { AxiosError } from 'axios';
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

  // Verdict form state
  const [showVerdictForm, setShowVerdictForm] = useState(false);
  const [verdictDecision, setVerdictDecision] = useState<'guilty' | 'innocent'>('guilty');
  const [reasoning, setReasoning] = useState('');
  const [punishmentTitle, setPunishmentTitle] = useState('');
  const [punishmentDesc, setPunishmentDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Trial creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createCaseId, setCreateCaseId] = useState('');
  const [createSuspectId, setCreateSuspectId] = useState('');
  const [createJudgeId, setCreateJudgeId] = useState('');
  const [createCaptainNotes, setCreateCaptainNotes] = useState('');
  const [judgeList, setJudgeList] = useState<any[]>([]);
  const [caseList, setCaseList] = useState<any[]>([]);
  const [caseSuspectList, setCaseSuspectList] = useState<any[]>([]);
  const [loadingSuspects, setLoadingSuspects] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Bail state
  const [bailPayments, setBailPayments] = useState<any[]>([]);
  const [showBailForm, setShowBailForm] = useState(false);
  const [bailSuspectId, setBailSuspectId] = useState('');
  const [bailAmount, setBailAmount] = useState('');
  const [bailSubmitting, setBailSubmitting] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [allSuspects, setAllSuspects] = useState<any[]>([]);

  // Role helpers
  const userRoles = (user?.roles || []).map((r: any) => r.name.toLowerCase());
  const isJudge = userRoles.includes('judge');
  const isCaptain = userRoles.includes('captain') || userRoles.includes('police chief') || userRoles.includes('administrator');
  const isSergeant = userRoles.includes('sergeant');

  const fetchTrials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrials();
      setTrials(res.results || []);
    } catch {
      showNotification('Failed to load trials', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const fetchBail = useCallback(async () => {
    try {
      const res = await getBailPayments();
      setBailPayments(res.results || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTrials();
    fetchBail();
  }, [fetchTrials, fetchBail]);

  // Fetch judges and cases when create form opens
  useEffect(() => {
    if (!showCreateForm) return;
    const loadFormData = async () => {
      try {
        const res = await getUsers({ search: '', page_size: 200 });
        setJudgeList((res.results || []).filter((u: any) =>
          u.roles?.some((r: any) => r.name?.toLowerCase() === 'judge')
        ));
      } catch { /* ignore */ }
      try {
        const res = await getCases({ page_size: 100 } as any);
        setCaseList(res.results || []);
      } catch { /* ignore */ }
    };
    loadFormData();
  }, [showCreateForm]);

  // Fetch suspects for bail form
  useEffect(() => {
    if (!showBailForm) return;
    const loadAllSuspects = async () => {
      try {
        const res = await getSuspects({});
        setAllSuspects(res.results || []);
      } catch { /* ignore */ }
    };
    loadAllSuspects();
  }, [showBailForm]);

  // Fetch suspects when case ID changes in create form
  useEffect(() => {
    if (!createCaseId) {
      setCaseSuspectList([]);
      setCreateSuspectId('');
      return;
    }
    const loadSuspects = async () => {
      setLoadingSuspects(true);
      try {
        const res = await getSuspects({ case: Number(createCaseId) });
        setCaseSuspectList(res.results || []);
        setCreateSuspectId('');
      } catch {
        setCaseSuspectList([]);
      } finally {
        setLoadingSuspects(false);
      }
    };
    loadSuspects();
  }, [createCaseId]);

  const handleViewSummary = async (trial: Trial) => {
    setSelectedTrial(trial);
    setShowVerdictForm(false);
    try {
      const summary = await getCaseSummary(trial.id);
      setCaseSummary(summary);
    } catch {
      setCaseSummary(null);
    }
  };

  /* ─── Create Trial (Captain) ───────────────────────────────────── */

  const handleCreateTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      await createTrial({
        case: Number(createCaseId),
        suspect: Number(createSuspectId),
        judge: Number(createJudgeId),
        submitted_by_captain: user?.id,
        captain_notes: createCaptainNotes,
      });
      showNotification('Trial created successfully', 'success');
      setShowCreateForm(false);
      setCreateCaseId('');
      setCreateSuspectId('');
      setCreateJudgeId('');
      setCreateCaptainNotes('');
      fetchTrials();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to create trial');
      showNotification(msg, 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  /* ─── Deliver Verdict (Judge) ──────────────────────────────────── */

  const handleDeliverVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrial) return;
    setSubmitting(true);
    try {
      await deliverVerdict(selectedTrial.id, {
        decision: verdictDecision,
        reasoning,
        punishment_title: verdictDecision === 'guilty' ? punishmentTitle : undefined,
        punishment_description: verdictDecision === 'guilty' ? punishmentDesc : undefined,
      });
      showNotification('Verdict delivered successfully', 'success');
      setShowVerdictForm(false);
      setReasoning('');
      setPunishmentTitle('');
      setPunishmentDesc('');
      fetchTrials();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to deliver verdict');
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Bail ─────────────────────────────────────────────────────── */

  const handleRequestBail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBailSubmitting(true);
    try {
      await createBailPayment({
        suspect: Number(bailSuspectId),
        amount: Number(bailAmount),
      });
      showNotification('Bail request submitted', 'success');
      setShowBailForm(false);
      setBailSuspectId('');
      setBailAmount('');
      fetchBail();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to request bail');
      showNotification(msg, 'error');
    } finally {
      setBailSubmitting(false);
    }
  };

  const handleApproveBail = async (id: number) => {
    try {
      await approveBailPayment(id);
      showNotification('Bail approved', 'success');
      fetchBail();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to approve bail');
      showNotification(msg, 'error');
    }
  };

  const handlePayBail = async (id: number) => {
    try {
      await payBail(id, { payment_reference: payRef || `PAY-${Date.now()}` });
      showNotification('Bail paid successfully', 'success');
      setPayRef('');
      fetchBail();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to pay bail');
      showNotification(msg, 'error');
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

  const getBailStatusLabel = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Pending Approval', cls: 'bail-pending' },
      approved: { label: 'Approved', cls: 'bail-approved' },
      paid: { label: 'Paid', cls: 'bail-paid' },
      rejected: { label: 'Rejected', cls: 'bail-rejected' },
    };
    const info = map[status] || { label: status, cls: '' };
    return <span className={`bail-badge ${info.cls}`}>{info.label}</span>;
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
        <div className="page-title-section">
          <h1 className="page-title">Trial Records</h1>
          <p className="page-subtitle">Court proceedings, verdicts, and bail management</p>
        </div>
        <div className="page-actions">
          {isCaptain && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? '✕ Cancel' : '+ Create Trial'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Create Trial Form (Captain) ──────────────────────────── */}
      {showCreateForm && (
        <form className="card trial-create-form" onSubmit={handleCreateTrial}>
          <h3>Create New Trial</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="trial-case-id">Case</label>
              <select
                id="trial-case-id"
                value={createCaseId}
                onChange={(e) => setCreateCaseId(e.target.value)}
                required
              >
                <option value="" disabled>Select case...</option>
                {caseList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.case_number})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="trial-suspect-id">Suspect</label>
              <select
                id="trial-suspect-id"
                value={createSuspectId}
                onChange={(e) => setCreateSuspectId(e.target.value)}
                required
                disabled={!createCaseId || loadingSuspects}
              >
                <option value="" disabled>
                  {!createCaseId
                    ? 'Select a case first...'
                    : loadingSuspects
                    ? 'Loading suspects...'
                    : caseSuspectList.length === 0
                    ? 'No suspects for this case'
                    : 'Select suspect...'}
                </option>
                {caseSuspectList.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.person_full_name || s.person_first_name
                      ? `${s.person_first_name || ''} ${s.person_last_name || ''}`.trim()
                      : `Suspect #${s.id}`} — {s.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="trial-judge">Judge</label>
              <select
                id="trial-judge"
                value={createJudgeId}
                onChange={(e) => setCreateJudgeId(e.target.value)}
                required
              >
                <option value="" disabled>Select judge...</option>
                {judgeList.map((j: any) => (
                  <option key={j.id} value={j.id}>
                    {j.first_name} {j.last_name} (@{j.username})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="trial-captain-notes">Captain Notes</label>
            <textarea
              id="trial-captain-notes"
              value={createCaptainNotes}
              onChange={(e) => setCreateCaptainNotes(e.target.value)}
              placeholder="Notes for the judge about this case..."
              rows={3}
            />
          </div>
          <div className="form-actions-inline">
            <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
              {createSubmitting ? 'Creating...' : 'Create Trial'}
            </button>
            <button type="button" className="btn" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

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
                    Suspect: {(trial as any).suspect_name || trial.suspect?.person?.first_name + ' ' + trial.suspect?.person?.last_name}
                  </div>
                  {((trial as any).case_number || trial.case_title) && (
                    <div className="trial-case">Case: {(trial as any).case_number || trial.case_title}</div>
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

                    {/* Case Info */}
                    {caseSummary.case && (
                      <div className="summary-block">
                        <h5>Case Information</h5>
                        <div className="summary-grid">
                          <div className="summary-item"><span className="label">Case #</span><span className="value">{caseSummary.case.case_number}</span></div>
                          <div className="summary-item"><span className="label">Title</span><span className="value">{caseSummary.case.title}</span></div>
                          <div className="summary-item"><span className="label">Status</span><span className="value">{caseSummary.case.status?.replace(/_/g, ' ')}</span></div>
                          <div className="summary-item"><span className="label">Crime Level</span><span className="value">{caseSummary.case.crime_level_details?.name || `Level ${caseSummary.case.crime_level}`}</span></div>
                          <div className="summary-item"><span className="label">Type</span><span className="value">{caseSummary.case.formation_type}</span></div>
                          {caseSummary.case.description && (
                            <div className="summary-item full-width"><span className="label">Description</span><span className="value">{caseSummary.case.description}</span></div>
                          )}
                          {caseSummary.case.created_by_details && (
                            <div className="summary-item"><span className="label">Filed By</span><span className="value">{caseSummary.case.created_by_details.full_name}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Suspect Info */}
                    {caseSummary.suspect && (
                      <div className="summary-block">
                        <h5>Suspect</h5>
                        <div className="summary-grid">
                          <div className="summary-item"><span className="label">Name</span><span className="value">{caseSummary.suspect.person_full_name || `Person #${caseSummary.suspect.person}`}</span></div>
                          <div className="summary-item"><span className="label">Status</span><span className="value">{caseSummary.suspect.status?.replace(/_/g, ' ')}</span></div>
                          {caseSummary.suspect.reason && (
                            <div className="summary-item full-width"><span className="label">Reason</span><span className="value">{caseSummary.suspect.reason}</span></div>
                          )}
                          {caseSummary.suspect.sergeant_approval_message && (
                            <div className="summary-item full-width"><span className="label">Sergeant Notes</span><span className="value">{caseSummary.suspect.sergeant_approval_message}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Police Members */}
                    {caseSummary.police_members && caseSummary.police_members.length > 0 && (
                      <div className="summary-block">
                        <h5>Police Members ({caseSummary.police_members.length})</h5>
                        <div className="summary-list">
                          {caseSummary.police_members.map((m: any, idx: number) => (
                            <div key={idx} className="summary-list-item">
                              <strong>{m.full_name}</strong> — {(m.roles || []).join(', ')}
                              {m.email && <span className="secondary"> ({m.email})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interrogations */}
                    {caseSummary.interrogations && caseSummary.interrogations.length > 0 && (
                      <div className="summary-block">
                        <h5>Interrogations ({caseSummary.interrogations.length})</h5>
                        {caseSummary.interrogations.map((intg: any, idx: number) => (
                          <div key={idx} className="summary-subcard">
                            <div className="summary-grid">
                              <div className="summary-item"><span className="label">Suspect</span><span className="value">{intg.suspect_name}</span></div>
                              <div className="summary-item"><span className="label">Detective</span><span className="value">{intg.detective_name}</span></div>
                              <div className="summary-item"><span className="label">Sergeant</span><span className="value">{intg.sergeant_name}</span></div>
                              <div className="summary-item"><span className="label">Status</span><span className="value">{intg.status}</span></div>
                              {intg.detective_guilt_rating != null && (
                                <div className="summary-item"><span className="label">Detective Rating</span><span className="value">{intg.detective_guilt_rating}/10</span></div>
                              )}
                              {intg.sergeant_guilt_rating != null && (
                                <div className="summary-item"><span className="label">Sergeant Rating</span><span className="value">{intg.sergeant_guilt_rating}/10</span></div>
                              )}
                              {intg.average_rating != null && (
                                <div className="summary-item"><span className="label">Average</span><span className="value highlight">{intg.average_rating.toFixed(1)}/10</span></div>
                              )}
                            </div>
                            {intg.detective_notes && <p className="summary-notes"><strong>Detective:</strong> {intg.detective_notes}</p>}
                            {intg.sergeant_notes && <p className="summary-notes"><strong>Sergeant:</strong> {intg.sergeant_notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Testimonies */}
                    {caseSummary.testimonies && caseSummary.testimonies.length > 0 && (
                      <div className="summary-block">
                        <h5>Testimonies ({caseSummary.testimonies.length})</h5>
                        {caseSummary.testimonies.map((t: any, idx: number) => (
                          <div key={idx} className="summary-subcard">
                            <div className="summary-grid">
                              <div className="summary-item"><span className="label">Title</span><span className="value">{t.title}</span></div>
                              <div className="summary-item"><span className="label">Witness</span><span className="value">{t.witness_full_name || t.witness_name || 'Unknown'}</span></div>
                              <div className="summary-item"><span className="label">Recorded By</span><span className="value">{t.recorded_by_name}</span></div>
                            </div>
                            {t.description && <p className="summary-notes">{t.description}</p>}
                            {t.transcript && <p className="summary-notes"><strong>Transcript:</strong> {t.transcript}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Biological Evidence */}
                    {caseSummary.biological_evidence && caseSummary.biological_evidence.length > 0 && (
                      <div className="summary-block">
                        <h5>Biological Evidence ({caseSummary.biological_evidence.length})</h5>
                        {caseSummary.biological_evidence.map((e: any, idx: number) => (
                          <div key={idx} className="summary-subcard">
                            <div className="summary-grid">
                              <div className="summary-item"><span className="label">Title</span><span className="value">{e.title}</span></div>
                              <div className="summary-item"><span className="label">Type</span><span className="value">{e.evidence_type || 'N/A'}</span></div>
                              <div className="summary-item"><span className="label">Recorded By</span><span className="value">{e.recorded_by_name}</span></div>
                            </div>
                            {e.description && <p className="summary-notes">{e.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Vehicle Evidence */}
                    {caseSummary.vehicle_evidence && caseSummary.vehicle_evidence.length > 0 && (
                      <div className="summary-block">
                        <h5>Vehicle Evidence ({caseSummary.vehicle_evidence.length})</h5>
                        {caseSummary.vehicle_evidence.map((v: any, idx: number) => (
                          <div key={idx} className="summary-subcard">
                            <div className="summary-grid">
                              <div className="summary-item"><span className="label">Title</span><span className="value">{v.title}</span></div>
                              <div className="summary-item"><span className="label">Model</span><span className="value">{v.model}</span></div>
                              <div className="summary-item"><span className="label">Color</span><span className="value">{v.color}</span></div>
                              <div className="summary-item"><span className="label">License Plate</span><span className="value">{v.license_plate}</span></div>
                            </div>
                            {v.description && <p className="summary-notes">{v.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Captain Decision */}
                    {caseSummary.captain_decision && (
                      <div className="summary-block">
                        <h5>Captain Decision</h5>
                        <div className="summary-grid">
                          <div className="summary-item"><span className="label">Captain</span><span className="value">{caseSummary.captain_decision.captain_name}</span></div>
                          {caseSummary.captain_decision.notes && (
                            <div className="summary-item full-width"><span className="label">Notes</span><span className="value">{caseSummary.captain_decision.notes}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Chief Decision */}
                    {caseSummary.chief_decision && (
                      <div className="summary-block">
                        <h5>Chief Decision</h5>
                        <div className="summary-grid">
                          <div className="summary-item"><span className="label">Chief</span><span className="value">{caseSummary.chief_decision.chief_name}</span></div>
                          {caseSummary.chief_decision.notes && (
                            <div className="summary-item full-width"><span className="label">Notes</span><span className="value">{caseSummary.chief_decision.notes}</span></div>
                          )}
                        </div>
                      </div>
                    )}
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
                                checked={verdictDecision === 'guilty'}
                                onChange={() => setVerdictDecision('guilty')}
                              />
                              Guilty
                            </label>
                            <label className="radio-label">
                              <input
                                type="radio"
                                name="verdict"
                                value="innocent"
                                checked={verdictDecision === 'innocent'}
                                onChange={() => setVerdictDecision('innocent')}
                              />
                              Innocent
                            </label>
                          </div>
                        </div>
                        <div className="form-group">
                          <label htmlFor="verdict-reasoning">Reasoning (min 30 characters)</label>
                          <textarea
                            id="verdict-reasoning"
                            value={reasoning}
                            onChange={(e) => setReasoning(e.target.value)}
                            placeholder="Explain the verdict reasoning..."
                            rows={4}
                            required
                            minLength={30}
                          />
                        </div>
                        {/* Punishment fields (required for guilty) */}
                        {verdictDecision === 'guilty' && (
                          <>
                            <div className="form-group">
                              <label htmlFor="punishment-title">Punishment Title (min 5 characters)</label>
                              <input
                                id="punishment-title"
                                type="text"
                                value={punishmentTitle}
                                onChange={(e) => setPunishmentTitle(e.target.value)}
                                placeholder="e.g., Imprisonment and Restitution"
                                required
                                minLength={5}
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="punishment-desc">Punishment Description (min 20 characters)</label>
                              <textarea
                                id="punishment-desc"
                                value={punishmentDesc}
                                onChange={(e) => setPunishmentDesc(e.target.value)}
                                placeholder="Describe the punishment in detail..."
                                rows={3}
                                required
                                minLength={20}
                              />
                            </div>
                          </>
                        )}
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
                {(selectedTrial as any).verdict_details && (
                  <div className="verdicts-section">
                    <h4>Verdict</h4>
                    <div className={`verdict-card ${(selectedTrial as any).verdict_details.decision}`}>
                      <div className="verdict-result">
                        {(selectedTrial as any).verdict_details.decision === 'guilty' ? '⚖️ GUILTY' : '✓ INNOCENT'}
                      </div>
                      <div className="verdict-reasoning">{(selectedTrial as any).verdict_details.reasoning}</div>
                      {(selectedTrial as any).verdict_details.punishment && (
                        <div className="punishment-info">
                          <strong>Punishment:</strong> {(selectedTrial as any).verdict_details.punishment.title}
                          <p>{(selectedTrial as any).verdict_details.punishment.description}</p>
                        </div>
                      )}
                    </div>
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

      {/* ─── Bail Payments Section ────────────────────────────────── */}
      <div className="bail-section">
        <div className="section-header">
          <h2>Bail Payments</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowBailForm(!showBailForm)}
          >
            {showBailForm ? '✕ Cancel' : '+ Request Bail'}
          </button>
        </div>

        {showBailForm && (
          <form className="card bail-form" onSubmit={handleRequestBail}>
            <h3>Request Bail Payment</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bail-suspect">Suspect</label>
                <select
                  id="bail-suspect"
                  value={bailSuspectId}
                  onChange={(e) => setBailSuspectId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select suspect...</option>
                  {allSuspects.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.person_full_name || `${s.person_first_name || ''} ${s.person_last_name || ''}`.trim() || `Suspect #${s.id}`} — {s.status?.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="bail-amount">Amount (Rials, min 1,000,000)</label>
                <input
                  id="bail-amount"
                  type="number"
                  value={bailAmount}
                  onChange={(e) => setBailAmount(e.target.value)}
                  placeholder="e.g., 5000000"
                  min={1000000}
                  required
                />
              </div>
            </div>
            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary" disabled={bailSubmitting}>
                {bailSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" className="btn" onClick={() => setShowBailForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {bailPayments.length === 0 ? (
          <div className="empty-state-large"><p>No bail payments on record.</p></div>
        ) : (
          <div className="bail-list">
            {bailPayments.map((bail: any) => (
              <div key={bail.id} className={`card bail-card ${bail.status}`}>
                <div className="bail-header">
                  <span>Bail #{bail.id}</span>
                  {getBailStatusLabel(bail.status)}
                </div>
                <div className="bail-meta">
                  <span><strong>Suspect:</strong> {bail.suspect_name || `#${bail.suspect}`}</span>
                  <span><strong>Amount:</strong> {Number(bail.amount).toLocaleString()} Rials</span>
                  {bail.payment_reference && (
                    <span><strong>Ref:</strong> {bail.payment_reference}</span>
                  )}
                </div>
                <div className="bail-actions">
                  {isSergeant && bail.status === 'pending' && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleApproveBail(bail.id)}
                    >
                      ✓ Approve Bail
                    </button>
                  )}
                  {bail.status === 'approved' && (
                    <div className="pay-form-inline">
                      <input
                        type="text"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="Payment reference (optional)"
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => handlePayBail(bail.id)}
                      >
                        💰 Pay Bail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trials;
