/**
 * Suspects Page
 * View and manage case suspects with submission workflow
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { getSuspects } from '../services/investigation';
import type { Suspect, SuspectStatus } from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './Suspects.css';

const Suspects: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotification();

  const statusFilter = (searchParams.get('status') as SuspectStatus) || '';
  const caseFilter = searchParams.get('case') ? Number(searchParams.get('case')) : undefined;

  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>

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
