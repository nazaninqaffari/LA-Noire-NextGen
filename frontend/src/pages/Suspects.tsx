/**
 * Suspects Page
 * View and manage case suspects with submission workflow.
 * Detectives can add new suspects from this page.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { getSuspects, createSuspect, changeSuspectStatus } from '../services/investigation';
import { getUsers } from '../services/admin';
import { extractErrorMessage } from '../utils/errorHandler';
import type { AxiosError } from 'axios';
import type { Suspect, SuspectStatus, User } from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './Suspects.css';

const Suspects: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const { user } = useAuth();

  const statusFilter = (searchParams.get('status') as SuspectStatus) || '';
  const caseFilter = searchParams.get('case') ? Number(searchParams.get('case')) : undefined;

  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [loading, setLoading] = useState(true);

  // Add suspect form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [personResults, setPersonResults] = useState<User[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  // Check if user can add suspects (detective or higher police rank)
  const canAddSuspect = user?.roles?.some(
    (r) => ['detective', 'sergeant', 'lieutenant', 'captain', 'police chief', 'administrator'].includes(r.name.toLowerCase())
  );

  // Check if user can change suspect status (all police roles except cadet)
  const canChangeStatus = user?.roles?.some(
    (r) => ['detective', 'sergeant', 'lieutenant', 'captain', 'police chief', 'administrator'].includes(r.name.toLowerCase())
  );

  // Track which suspect is being status-changed
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  const handleStatusChange = async (suspectId: number, newStatus: SuspectStatus) => {
    setChangingStatusId(suspectId);
    try {
      await changeSuspectStatus(suspectId, newStatus);
      showNotification('Suspect status updated successfully', 'success');
      fetchSuspects();
    } catch (err) {
      const errorMessage = extractErrorMessage(err as AxiosError, 'Failed to change suspect status');
      showNotification(errorMessage, 'error');
    } finally {
      setChangingStatusId(null);
    }
  };

  const fetchSuspects = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      if (caseFilter) params.case = caseFilter;
      const res = await getSuspects(params);
      setSuspects(res.results);
    } catch {
      showNotification('Failed to load suspects', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, caseFilter, showNotification]);

  useEffect(() => {
    fetchSuspects();
  }, [fetchSuspects]);

  // Search users when typing in person search
  useEffect(() => {
    if (personSearch.length < 2) {
      setPersonResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await getUsers({ search: personSearch });
        setPersonResults(res.results);
      } catch {
        // silently fail
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [personSearch]);

  const handleAddSuspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !caseFilter) {
      showNotification('Please select a person and ensure a case is specified', 'error');
      return;
    }

    setAddSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('case', String(caseFilter));
      formData.append('person', String(selectedPerson.id));
      if (reason) formData.append('reason', reason);
      if (photo) formData.append('photo', photo);

      await createSuspect(formData);
      showNotification('Suspect added successfully', 'success');
      setShowAddForm(false);
      setSelectedPerson(null);
      setPersonSearch('');
      setReason('');
      setPhoto(null);
      fetchSuspects();
    } catch (err) {
      const errorMessage = extractErrorMessage(err as AxiosError, 'Failed to add suspect');
      showNotification(errorMessage, 'error');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleStatusFilter = (status: string) => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (caseFilter) params.case = String(caseFilter);
    setSearchParams(params);
  };

  const getStatusBadge = (status: SuspectStatus) => {
    const map: Record<SuspectStatus, { label: string; className: string }> = {
      under_pursuit: { label: 'Under Pursuit', className: 'status-pursuit' },
      intensive_pursuit: { label: 'Intensive Pursuit', className: 'status-intensive' },
      arrested: { label: 'Arrested', className: 'status-arrested' },
      cleared: { label: 'Cleared', className: 'status-cleared' },
    };
    const info = map[status] || { label: status, className: '' };
    return <span className={`suspect-status ${info.className}`}>{info.label}</span>;
  };

  return (
    <div className="suspects-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Suspect Registry</h1>
          <p className="page-subtitle">
            Track and manage all case suspects
            {caseFilter && <span className="filter-indicator"> — Case #{caseFilter}</span>}
          </p>
        </div>
        {/* Add Suspect button — only visible for detectives with a case selected */}
        {canAddSuspect && caseFilter && (
          <div className="page-actions">
            <button
              className="btn btn-primary add-suspect-btn"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? '✕ Cancel' : '+ Add Suspect'}
            </button>
          </div>
        )}
      </div>

      {/* Add Suspect Form */}
      {showAddForm && caseFilter && (
        <form className="add-suspect-form card" onSubmit={handleAddSuspect}>
          <h3>Identify New Suspect</h3>
          <div className="form-group">
            <label htmlFor="person-search">Search Person</label>
            <input
              id="person-search"
              type="text"
              className="person-search-input"
              value={personSearch}
              onChange={(e) => { setPersonSearch(e.target.value); setSelectedPerson(null); }}
              placeholder="Type name or username to search..."
              autoComplete="off"
            />
            {personResults.length > 0 && !selectedPerson && (
              <ul className="person-results-dropdown">
                {personResults.map((p) => (
                  <li
                    key={p.id}
                    className="person-result-item"
                    onClick={() => {
                      setSelectedPerson(p);
                      setPersonSearch(`${p.first_name} ${p.last_name} (${p.username})`);
                      setPersonResults([]);
                    }}
                  >
                    <span className="person-name">{p.first_name} {p.last_name}</span>
                    <span className="person-username">@{p.username}</span>
                  </li>
                ))}
              </ul>
            )}
            {selectedPerson && (
              <div className="selected-person-badge">
                ✓ Selected: {selectedPerson.first_name} {selectedPerson.last_name}
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="suspect-reason">Reason / Evidence</label>
            <textarea
              id="suspect-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this person is a suspect..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="suspect-photo">Photo (optional)</label>
            <input
              id="suspect-photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedPerson || addSubmitting}
            >
              {addSubmitting ? 'Adding...' : 'Add Suspect'}
            </button>
            <button type="button" className="btn" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Status Filters */}
      <div className="suspect-filters">
        {['', 'under_pursuit', 'intensive_pursuit', 'arrested', 'cleared'].map((s) => (
          <button
            key={s}
            className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => handleStatusFilter(s)}
          >
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" />
      ) : suspects.length === 0 ? (
        <div className="empty-state-large">
          <p>No suspects matching the current filter.</p>
        </div>
      ) : (
        <div className="suspects-grid">
          {suspects.map((suspect) => (
            <div key={suspect.id} className="suspect-card">
              <div className="suspect-photo-section">
                {suspect.photo ? (
                  <img src={suspect.photo} alt="Suspect" className="suspect-photo" />
                ) : (
                  <div className="suspect-photo-placeholder">👤</div>
                )}
              </div>
              <div className="suspect-info">
                <h3 className="suspect-name">
                  {suspect.person?.first_name} {suspect.person?.last_name}
                </h3>
                {getStatusBadge(suspect.status)}
                {/* Status change dropdown for authorized police roles */}
                {canChangeStatus && (
                  <div className="status-change-section">
                    <select
                      className="status-change-select"
                      value={suspect.status}
                      disabled={changingStatusId === suspect.id}
                      onChange={(e) => handleStatusChange(suspect.id, e.target.value as SuspectStatus)}
                      data-testid={`status-select-${suspect.id}`}
                    >
                      <option value="under_pursuit">Under Pursuit</option>
                      <option value="intensive_pursuit">Intensive Pursuit (Most Wanted)</option>
                      <option value="arrested">Arrested</option>
                      <option value="cleared">Cleared</option>
                    </select>
                    {changingStatusId === suspect.id && (
                      <span className="status-changing-indicator">Updating…</span>
                    )}
                  </div>
                )}
                {suspect.case_title && (
                  <div className="suspect-meta">Case: {suspect.case_title}</div>
                )}
                {suspect.reason && (
                  <div className="suspect-reason">{suspect.reason}</div>
                )}
                <div className="suspect-details">
                  <div className="detail-item">
                    <span className="detail-label">Danger Score</span>
                    <span className="detail-value danger">{suspect.danger_score}/10</span>
                  </div>
                  {suspect.reward_amount > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">Reward</span>
                      <span className="detail-value reward">
                        {new Intl.NumberFormat('fa-IR').format(suspect.reward_amount)} ﷼
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Warrant</span>
                    <span className={`detail-value ${suspect.arrest_warrant_issued ? 'yes' : 'no'}`}>
                      {suspect.arrest_warrant_issued ? '✓ Issued' : '✗ Not issued'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Sgt. Approved</span>
                    <span className={`detail-value ${suspect.approved_by_sergeant ? 'yes' : 'no'}`}>
                      {suspect.approved_by_sergeant ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Suspects;
