/**
 * CaseEdit Page
 * Allows complainants to edit their draft (rejected) cases and resubmit them.
 * Only accessible for cases in 'draft' status created by the current user.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, updateCase, resubmitCase } from '../services/case';
import type { Case } from '../types';
import type { AxiosError } from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { extractErrorMessage } from '../utils/errorHandler';
import CaseStatusBadge from '../components/CaseStatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './CaseEdit.css';

const CaseEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [crimeLevel, setCrimeLevel] = useState<number>(3);
  const [statement, setStatement] = useState('');

  useEffect(() => {
    const fetchCase = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const fetched = await getCase(parseInt(id));

        // Only allow editing draft cases
        if (fetched.status !== 'draft') {
          showNotification('This case is not in draft status and cannot be edited.', 'error');
          navigate(`/cases/${id}`);
          return;
        }

        setCaseData(fetched);
        setTitle(fetched.title);
        setDescription(fetched.description);
        setCrimeLevel(fetched.crime_level);
        setStatement(fetched.complainant_statement || '');
      } catch (err) {
        showNotification(extractErrorMessage(err as AxiosError, 'Failed to load case'), 'error');
        navigate('/cases');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id, navigate, showNotification]);

  // Save edits (PATCH)
  const handleSave = async () => {
    if (!id || !caseData) return;
    try {
      setSaving(true);
      await updateCase(parseInt(id), {
        title,
        description,
        crime_level: crimeLevel as any,
      });
      showNotification('Case updated successfully.', 'success');
    } catch (err) {
      showNotification(extractErrorMessage(err as AxiosError, 'Failed to update case'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save and resubmit to cadet_review
  const handleResubmit = async () => {
    if (!id || !caseData) return;
    try {
      setSaving(true);
      // First save edits
      await updateCase(parseInt(id), {
        title,
        description,
        crime_level: crimeLevel as any,
      });
      // Then resubmit
      await resubmitCase(parseInt(id));
      showNotification('Case resubmitted for review.', 'success');
      navigate(`/cases/${id}`);
    } catch (err) {
      showNotification(extractErrorMessage(err as AxiosError, 'Failed to resubmit case'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="case-edit-page">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (!caseData) return null;

  return (
    <div className="case-edit-page">
      {/* Header */}
      <div className="edit-header">
        <button onClick={() => navigate(`/cases/${id}`)} className="btn-back">
          ← Back to Case
        </button>
        <div className="edit-header-content">
          <h1 className="edit-title">Edit & Resubmit Case</h1>
          <p className="edit-subtitle">
            Correct the issues and resubmit for review
          </p>
        </div>
      </div>

      <div className="edit-grid">
        {/* Rejection Info Panel */}
        <div className="edit-column">
          <section className="edit-section rejection-info-panel">
            <h2 className="section-title">Rejection History</h2>
            <div className="section-content">
              <div className="rejection-stats">
                <div className="stat-item">
                  <span className="stat-label">Status</span>
                  <CaseStatusBadge status={caseData.status} />
                </div>
                <div className="stat-item">
                  <span className="stat-label">Rejection Count</span>
                  <span className="stat-value rejection-count">
                    {caseData.rejection_count || 0} / 3
                  </span>
                </div>
              </div>

              {caseData.rejection_count && caseData.rejection_count >= 3 && (
                <div className="alert alert-danger">
                  This case has been permanently rejected after 3 failed submissions.
                </div>
              )}

              {/* Show review history with rejection reasons */}
              {caseData.reviews && caseData.reviews.length > 0 && (
                <div className="rejection-reasons">
                  <h3>Reviewer Feedback</h3>
                  {caseData.reviews
                    .filter((r: any) => r.decision === 'rejected')
                    .map((review: any, idx: number) => (
                      <div key={idx} className="rejection-card">
                        <div className="rejection-meta">
                          <span className="reviewer-name">
                            {review.reviewer_details?.first_name} {review.reviewer_details?.last_name}
                          </span>
                          <span className="rejection-date">
                            {new Date(review.reviewed_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="rejection-text">{review.rejection_reason}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Edit Form */}
        <div className="edit-column">
          <section className="edit-section">
            <h2 className="section-title">Case Details</h2>
            <div className="section-content">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                  rows={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="crime_level">Crime Level</label>
                <select
                  id="crime_level"
                  value={crimeLevel}
                  onChange={(e) => setCrimeLevel(Number(e.target.value))}
                  disabled={saving}
                >
                  <option value={3}>Level 3 - Minor</option>
                  <option value={2}>Level 2 - Medium</option>
                  <option value={1}>Level 1 - Major</option>
                  <option value={0}>Critical</option>
                </select>
              </div>

              {caseData.formation_type === 'complaint' && (
                <div className="form-group">
                  <label htmlFor="statement">Complainant Statement</label>
                  <textarea
                    id="statement"
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    disabled={saving}
                    rows={5}
                    placeholder="Your statement about the incident..."
                  />
                </div>
              )}

              <div className="form-actions-row">
                <button
                  className="btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleResubmit}
                  disabled={saving || (caseData.rejection_count || 0) >= 3}
                >
                  {saving ? 'Submitting...' : 'Save & Resubmit for Review'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CaseEdit;
