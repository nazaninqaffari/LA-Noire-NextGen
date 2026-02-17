/**
 * Case Status Badge Component
 * Displays case status with appropriate styling
 */
import React from 'react';
import type { CaseStatus } from '../types';
import './CaseStatusBadge.css';

interface CaseStatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'status-draft' },
  cadet_review: { label: 'Cadet Review', className: 'status-pending' },
  officer_review: { label: 'Officer Review', className: 'status-pending' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
  open: { label: 'Open', className: 'status-open' },
  under_investigation: { label: 'Investigating', className: 'status-active' },
  suspects_identified: { label: 'Suspects Found', className: 'status-progress' },
  arrest_approved: { label: 'Arrest Approved', className: 'status-progress' },
  interrogation: { label: 'Interrogation', className: 'status-active' },
  trial_pending: { label: 'Trial Pending', className: 'status-warning' },
  closed: { label: 'Closed', className: 'status-closed' },
};

const CaseStatusBadge: React.FC<CaseStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status];

  return (
    <span className={`case-status-badge ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};

export default CaseStatusBadge;
