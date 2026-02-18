/**
 * Case Review Page
 * Cadet and Officer case review interface
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, submitCadetReview, submitOfficerReview } from '../services/case';
import type { Case, CaseReviewData } from '../types';
import type { AxiosError } from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { extractErrorMessage } from '../utils/errorHandler';
import CaseStatusBadge from '../components/CaseStatusBadge';
import CrimeLevelBadge from '../components/CrimeLevelBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './CaseReview.css';

const CaseReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState<CaseReviewData>({
    decision: 'approved',
    rejection_reason: '',
  });

  useEffect(() => {
    const fetchCase = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const fetchedCase = await getCase(parseInt(id));

        // Validate case status
        if (
          fetchedCase.status !== 'cadet_review' &&
          fetchedCase.status !== 'officer_review'
        ) {
          showNotification('This case is not available for review', 'error');
          navigate(`/cases/${id}`);
          return;
        }

        setCaseData(fetchedCase);
      } catch (err) {
        const errorMessage = extractErrorMessage(
          err as AxiosError,
          'Failed to fetch case'
        );
        showNotification(errorMessage, 'error');
        navigate('/cases');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, showNotification, navigate]);

  const handleDecisionChange = (decision: 'approved' | 'rejected') => {
    setReviewData({
      decision,
      rejection_reason: decision === 'approved' ? '' : reviewData.rejection_reason,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!caseData || !id) return;

    // Validation
    if (reviewData.decision === 'rejected' && !reviewData.rejection_reason?.trim()) {
      showNotification('Please provide a reason for rejection', 'error');
      return;
    }

    try {
      setSubmitting(true);

      if (caseData.status === 'cadet_review') {
        await submitCadetReview(parseInt(id), reviewData);
        showNotification('Cadet review submitted successfully', 'success');
      } else if (caseData.status === 'officer_review') {
        await submitOfficerReview(parseInt(id), reviewData);
        showNotification('Officer review submitted successfully', 'success');
      }

      navigate(`/cases/${id}`);
    } catch (err) {
      const errorMessage = extractErrorMessage(
        err as AxiosError,
        'Failed to submit review'
      );
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="case-review-page">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  const reviewerRole =
    caseData.status === 'cadet_review' ? 'Cadet' : 'Officer';

  return (
    <div className="case-review-page">
      {/* Header */}
      <div className="review-header">
        <button onClick={() => navigate(`/cases/${id}`)} className="btn-back">
          ← Back to Case
        </button>
        <div className="review-header-content">
          <h1 className="review-title">{reviewerRole} Review</h1>
          <p className="review-subtitle">
            Review and approve or reject this case
          </p>
        </div>
      </div>

      <div className="review-grid">
        {/* Left Column - Case Summary */}
        <div className="review-column">
          <section className="review-section">
            <h2 className="section-title">Case Summary</h2>
            <div className="section-content">
              <div className="case-summary-header">
                <h3 className="case-title">{caseData.title}</h3>
                <div className="case-badges">
                  <CrimeLevelBadge level={caseData.crime_level} />
                  <CaseStatusBadge status={caseData.status} />
                </div>
              </div>

              <div className="case-info-grid">
                <div className="info-item">
                  <label>Case ID</label>
                  <span>{caseData.case_number}</span>
                </div>
                <div className="info-item">
                  <label>Created</label>
                  <span>{formatDate(caseData.created_at)}</span>
                </div>
                <div className="info-item">
                  <label>Created By</label>
                  <span>
                    {caseData.created_by_details?.first_name} {caseData.created_by_details?.last_name}
                  </span>
                </div>
                {caseData.formation_type && (
                  <div className="info-item">
                    <label>Formation Type</label>
                    <span>
                      {caseData.formation_type === 'complaint'
                        ? '📜 Complaint'
                        : '🚨 Crime Scene'}
                    </span>
                  </div>
                )}
              </div>

              <div className="case-description">
                <label>Description</label>
                <p>{caseData.description}</p>
              </div>

              {caseData.formation_type === 'complaint' &&
                caseData.complainant_statement && (
                  <div className="case-statement">
                    <label>Complainant Statement</label>
                    <div className="statement-box">
                      <p>{caseData.complainant_statement}</p>
                    </div>
                  </div>
                )}

              {caseData.formation_type === 'crime_scene' && (
                <div className="crime-scene-details">
                  {caseData.crime_scene_location && (
                    <div className="info-item">
                      <label>Location</label>
                      <span>{caseData.crime_scene_location}</span>
                    </div>
                  )}
                  {caseData.crime_scene_datetime && (
                    <div className="info-item">
                      <label>Date & Time</label>
                      <span>{formatDate(caseData.crime_scene_datetime)}</span>
                    </div>
                  )}
                  {caseData.witness_data && caseData.witness_data.length > 0 && (
                    <div className="witnesses-section">
                      <label>Witnesses ({caseData.witness_data.length})</label>
                      <div className="witnesses-list">
                        {caseData.witness_data.map((witness, index) => (
                          <div key={index} className="witness-card">
                            <strong>{witness.full_name}</strong>
                            <span>Phone: {witness.phone_number}</span>
                            <span>ID: {witness.national_id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Review Form */}
        <div className="review-column">
          <section className="review-section review-form-section">
            <h2 className="section-title">Your Decision</h2>
            <form onSubmit={handleSubmit} className="review-form">
              {/* Decision Buttons */}
              <div className="decision-buttons">
                <button
                  type="button"
                  className={`decision-btn approve ${
                    reviewData.decision === 'approved' ? 'active' : ''
                  }`}
                  onClick={() => handleDecisionChange('approved')}
                >
                  <span className="decision-icon">✓</span>
                  <span className="decision-text">Approve</span>
                </button>
                <button
                  type="button"
                  className={`decision-btn reject ${
                    reviewData.decision === 'rejected' ? 'active' : ''
                  }`}
                  onClick={() => handleDecisionChange('rejected')}
                >
                  <span className="decision-icon">✗</span>
                  <span className="decision-text">Reject</span>
                </button>
              </div>

              {/* Rejection Reason */}
              {reviewData.decision === 'rejected' && (
                <div className="form-group rejection-form">
                  <label htmlFor="rejection_reason" className="form-label">
                    Reason for Rejection <span className="required">*</span>
                  </label>
                  <textarea
                    id="rejection_reason"
                    value={reviewData.rejection_reason}
                    onChange={(e) =>
                      setReviewData((prev) => ({
                        ...prev,
                        rejection_reason: e.target.value,
                      }))
                    }
                    className="form-textarea"
                    placeholder="Provide detailed feedback for rejection..."
                    rows={6}
                    required
                  />
                  <span className="form-hint">
                    {caseData.status === 'cadet_review'
                      ? 'After 3 cadet rejections, the case will be permanently closed.'
                      : 'Case will be sent back to cadet review.'}
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitting}
              >
                {submitting
                  ? 'Submitting...'
                  : `Submit ${reviewerRole} Review`}
              </button>
            </form>
          </section>

          {/* Review Guidelines */}
          <section className="review-section">
            <h2 className="section-title">Review Guidelines</h2>
            <div className="section-content">
              <ul className="guidelines-list">
                {caseData.status === 'cadet_review' ? (
                  <>
                    <li>Verify all information is complete and accurate</li>
                    <li>Check crime level appropriateness</li>
                    <li>
                      If approved, case moves to officer review
                    </li>
                    <li>
                      If rejected 3 times, case is permanently closed
                    </li>
                  </>
                ) : (
                  <>
                    <li>Final review before case opening</li>
                    <li>Verify cadet approval was appropriate</li>
                    <li>If approved, case opens for investigation</li>
                    <li>
                      If rejected, case returns to cadet review
                    </li>
                  </>
                )}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CaseReview;
