/**
 * Crime Level Badge Component
 * Displays crime severity level
 */
import React from 'react';
import type { CrimeLevel } from '../types';
import './CaseStatusBadge.css';

interface CrimeLevelBadgeProps {
  level: CrimeLevel;
  className?: string;
}

const levelConfig: Record<CrimeLevel, { label: string; className: string }> = {
  0: { label: 'Critical', className: 'level-critical' },
  1: { label: 'Major', className: 'level-major' },
  2: { label: 'Medium', className: 'level-medium' },
  3: { label: 'Minor', className: 'level-minor' },
};

const CrimeLevelBadge: React.FC<CrimeLevelBadgeProps> = ({ level, className = '' }) => {
  const config = levelConfig[level] ?? { label: `Level ${level}`, className: 'level-unknown' };

  return (
    <span className={`crime-level-badge ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};

export default CrimeLevelBadge;
