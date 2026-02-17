/**
 * Case Detail Page
 * Display full case information and review history
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, getCaseReviewHistory } from '../services/case';
import type { Case, CaseReviewHistory } from '../types';
import type { AxiosError } from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { extractErrorMessage } from '../utils/errorHandler';
import CaseStatusBadge from '../components/CaseStatusBadge';
import CrimeLevelBadge from '../components/CrimeLevelBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './CaseDetail.css';

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [reviewHistory, setReviewHistory] = useState<CaseReviewHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [caseData, historyData] = await Promise.all([
          getCase(parseInt(id)),
          getCaseReviewHistory(parseInt(id)),
        ]);
        setCaseData(caseData);
        setReviewHistory(historyData);
      } catch (err) {
        const errorMessage = extractErrorMessage(
          err as AxiosError,
          'Failed to fetch case details'
        );
        showNotification(errorMessage, 'error');
        navigate('/cases');
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [id, showNotification, navigate]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="case-detail-page">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="case-detail-page">
      {/* Header */}
      <div className="detail-header">
        <button onClick={() => navigate('/cases')} className="btn-back">
          ← Back to Cases
        </button>
        <div className="detail-header-content">
          <div className="detail-header-top">
            <h1 className="detail-title">{caseData.title}</h1>
            <div className="detail-badges">
              <CrimeLevelBadge level={caseData.crime_level} />
              <CaseStatusBadge status={caseData.status} />
            </div>
          </div>
          <div className="detail-meta">
            <span className="meta-item">
              <strong>Case ID:</strong> {caseData.case_id}
            </span>
            <span className="meta-item">
              <strong>Created:</strong> {formatDate(caseData.created_at)}
            </span>
            {caseData.formation_type && (
              <span className="meta-item">
                <strong>Formation:</strong>{' '}
                {caseData.formation_type === 'complaint' ? '📜 Complaint' : '🚨 Crime Scene'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="detail-grid">
        {/* Left Column - Case Information */}
        <div className="detail-column">
          <section className="detail-section">
            <h2 className="section-title">Case Information</h2>
            <div className="section-content">
              <div className="info-group">
                <label className="info-label">Description</label>
                <p className="info-value">{caseData.description}</p>
              </div>

              <div className="info-row">
                <div className="info-group">
                  <label className="info-label">Created By</label>
                  <p className="info-value">
                    {caseData.created_by.first_name} {caseData.created_by.last_name}
                    <br />
                    <span className="info-subtitle">{caseData.created_by.email}</span>
                  </p>
                </div>

                {caseData.assigned_to && (
                  <div className="info-group">
                    <label className="info-label">Assigned To</label>
                    <p className="info-value">
                      {caseData.assigned_to.first_name} {caseData.assigned_to.last_name}
                      <br />
                      <span className="info-subtitle">{caseData.assigned_to.email}</span>
                    </p>
                  </div>
                )}
              </div>

              {caseData.opened_at && (
                <div className="info-group">
                  <label className="info-label">Opened At</label>
                  <p className="info-value">{formatDate(caseData.opened_at)}</p>
                </div>
              )}
            </div>
          </section>

          {/* Formation-Specific Information */}
          {caseData.formation_type === 'complaint' && caseData.complainant_statement && (
            <section className="detail-section">
              <h2 className="section-title">Complainant Statement</h2>
              <div className="section-content">
                <div className="statement-box">
                  <p className="statement-text">{caseData.complainant_statement}</p>
                </div>
              </div>
            </section>
          )}

          {caseData.formation_type === 'crime_scene' && (
            <section className="detail-section">
              <h2 className="section-title">Crime Scene Details</h2>
              <div className="section-content">
                {caseData.crime_scene_location && (
                  <div className="info-group">
                    <label className="info-label">Location</label>
                    <p className="info-value">{caseData.crime_scene_location}</p>
                  </div>
                )}
                {caseData.crime_scene_datetime && (
                  <div className="info-group">
                    <label className="info-label">Date & Time</label>
                    <p className="info-value">{formatDate(caseData.crime_scene_datetime)}</p>
                  </div>
                )}
                {caseData.witness_data && caseData.witness_data.length > 0 && (
                  <div className="info-group">
                    <label className="info-label">Witnesses</label>
                    <div className="witnesses-list">
                      {caseData.witness_data.map((witness, index) => (
                        <div key={index} className="witness-item">
                          <strong>{witness.full_name}</strong>
                          <span>Phone: {witness.phone_number}</span>
                          <span>ID: {witness.national_id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Review History */}
        <div className="detail-column">
          <section className="detail-section">
            <h2 className="section-title">Review History</h2>
            <div className="section-content">
              {reviewHistory.length === 0 ? (
                <div className="empty-history">
                  <p>No review history available</p>
                </div>
              ) : (
                <div className="timeline">
                  {reviewHistory.map((review, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker" />
                      <div className="timeline-content">
                        <div className="review-header">
                          <strong className="reviewer-name">
                            {review.reviewer.first_name} {review.reviewer.last_name}
                          </strong>
                          <span
                            className={`review-decision ${
                              review.decision === 'approved' ? 'approved' : 'rejected'
                            }`}
                          >
                            {review.decision === 'approved' ? '✓ Approved' : '✗ Rejected'}
                          </span>
                        </div>
                        <p className="review-timestamp">{formatDate(review.timestamp)}</p>
                        {review.rejection_reason && (
                          <div className="rejection-reason">
                            <label>Reason:</label>
                            <p>{review.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          {(caseData.status === 'cadet_review' || caseData.status === 'officer_review') && (
            <div className="detail-actions">
              <button
                onClick={() => navigate(`/cases/${caseData.id}/review`)}
                className="btn btn-primary btn-block"
              >
                Review Case
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
