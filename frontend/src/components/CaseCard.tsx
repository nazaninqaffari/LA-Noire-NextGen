/**
 * Case Card Component
 * Displays case summary in list views
 */
import React from 'react';
import { Link } from 'react-router-dom';
import type { Case } from '../types';
import CaseStatusBadge from './CaseStatusBadge';
import CrimeLevelBadge from './CrimeLevelBadge';
import './CaseCard.css';

interface CaseCardProps {
  case: Case;
  showActions?: boolean;
}

const CaseCard: React.FC<CaseCardProps> = ({ case: caseData, showActions = true }) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="case-card">
      <div className="case-card-header">
        <div className="case-card-id">{caseData.case_id}</div>
        <div className="case-card-badges">
          <CrimeLevelBadge level={caseData.crime_level} />
          <CaseStatusBadge status={caseData.status} />
        </div>
      </div>

      <div className="case-card-body">
        <h3 className="case-card-title">{caseData.title}</h3>
        <p className="case-card-description">{caseData.description}</p>

        <div className="case-card-meta">
          <div className="case-meta-item">
            <span className="meta-label">Created by:</span>
            <span className="meta-value">
              {caseData.created_by.first_name} {caseData.created_by.last_name}
            </span>
          </div>
          <div className="case-meta-item">
            <span className="meta-label">Created:</span>
            <span className="meta-value">{formatDate(caseData.created_at)}</span>
          </div>
          {caseData.assigned_to && (
            <div className="case-meta-item">
              <span className="meta-label">Assigned to:</span>
              <span className="meta-value">
                {caseData.assigned_to.first_name} {caseData.assigned_to.last_name}
              </span>
            </div>
          )}
          {caseData.formation_type && (
            <div className="case-meta-item">
              <span className="meta-label">Formation:</span>
              <span className="meta-value case-formation-type">
                {caseData.formation_type === 'complaint' ? '📜 Complaint' : '🚨 Crime Scene'}
              </span>
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div className="case-card-footer">
          <Link to={`/cases/${caseData.id}`} className="btn btn-primary">
            View Details
          </Link>
        </div>
      )}
    </div>
  );
};

export default CaseCard;
