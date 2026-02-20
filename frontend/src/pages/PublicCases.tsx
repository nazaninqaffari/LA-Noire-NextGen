/**
 * Public Cases Page
 * Shows crime-scene-based cases that citizens can browse and join.
 * Citizens provide a statement to become a complainant on a case.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPublicCases, joinPublicCase } from '../services/case';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { SkeletonCard } from '../components/LoadingSkeleton';
import { extractErrorMessage } from '../utils/errorHandler';
import type { Case } from '../types';
import type { AxiosError } from 'axios';
import './PublicCases.css';

const PublicCases: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningCaseId, setJoiningCaseId] = useState<number | null>(null);
  const [statement, setStatement] = useState('');

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPublicCases();
      setCases(data);
    } catch {
      showNotification('Failed to load public cases', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleJoin = async (caseId: number) => {
    if (!statement.trim() || statement.trim().length < 10) {
      showNotification('Please provide a statement (at least 10 characters)', 'error');
      return;
    }
    try {
      await joinPublicCase(caseId, statement.trim());
      showNotification('You have successfully joined this case as a complainant!', 'success');
      setJoiningCaseId(null);
      setStatement('');
      fetchCases();
    } catch (err) {
      const msg = extractErrorMessage(err as AxiosError, 'Failed to join case');
      showNotification(msg, 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      cadet_review: { label: 'Under Review', cls: 'badge-warning' },
      officer_review: { label: 'Under Review', cls: 'badge-warning' },
      open: { label: 'Open', cls: 'badge-info' },
      under_investigation: { label: 'Under Investigation', cls: 'badge-primary' },
      suspects_identified: { label: 'Suspects Identified', cls: 'badge-success' },
    };
    const s = map[status] || { label: status, cls: '' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  const alreadyJoined = (c: Case) => {
    return c.complainants?.some((comp: any) => comp.user === user?.id || comp.user_details?.id === user?.id);
  };

  if (!user) {
    return (
      <div className="page-container">
        <h1>Public Cases</h1>
        <p>Please log in to view and join public cases.</p>
      </div>
    );
  }

  return (
    <div className="page-container public-cases-page">
      <div className="page-header">
        <h1>Public Cases</h1>
        <p className="page-subtitle">
          Crime scene reports filed by police. If you were affected by any of these incidents,
          you can join the case as a complainant.
        </p>
      </div>

      {loading ? (
        <div className="skeleton-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : cases.length === 0 ? (
        <div className="empty-state">
          <p>No public cases available at this time.</p>
        </div>
      ) : (
        <div className="public-cases-grid">
          {cases.map((c) => (
            <div key={c.id} className="card public-case-card" data-testid={`public-case-${c.id}`}>
              <div className="public-case-header">
                <Link to={`/cases/${c.id}`} className="public-case-title">
                  {c.title}
                </Link>
                {getStatusBadge(c.status)}
              </div>
              <div className="public-case-body">
                <p className="public-case-description">{c.description}</p>
                {c.crime_scene_location && (
                  <div className="public-case-detail">
                    <strong>📍 Location:</strong> {c.crime_scene_location}
                  </div>
                )}
                {c.crime_scene_datetime && (
                  <div className="public-case-detail">
                    <strong>🕐 Date/Time:</strong>{' '}
                    {new Date(c.crime_scene_datetime).toLocaleString()}
                  </div>
                )}
                <div className="public-case-detail">
                  <strong>👥 Complainants:</strong> {c.complainants?.length || 0}
                </div>
                <div className="public-case-detail">
                  <strong>Case #:</strong> {c.case_number}
                </div>
              </div>
              <div className="public-case-actions">
                {alreadyJoined(c) ? (
                  <span className="badge badge-success">✓ Already Joined</span>
                ) : joiningCaseId === c.id ? (
                  <div className="join-form">
                    <textarea
                      className="form-textarea"
                      placeholder="Your statement about this incident (min 10 characters)..."
                      value={statement}
                      onChange={(e) => setStatement(e.target.value)}
                      rows={3}
                      data-testid={`join-statement-${c.id}`}
                    />
                    <div className="join-buttons">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleJoin(c.id)}
                        data-testid={`confirm-join-${c.id}`}
                      >
                        Confirm & Join
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setJoiningCaseId(null);
                          setStatement('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => setJoiningCaseId(c.id)}
                    data-testid={`join-case-${c.id}`}
                  >
                    🤝 Join as Complainant
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicCases;
