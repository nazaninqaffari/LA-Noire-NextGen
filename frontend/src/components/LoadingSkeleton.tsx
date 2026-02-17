/**
 * Loading Skeleton Component
 * Displays placeholder UI while content is loading - Film Noir themed
 */
import React from 'react';
import './LoadingSkeleton.css';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'badge' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Basic skeleton loader
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
}) => {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  };

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={style}
      aria-label="Loading..."
    />
  );
};

/**
 * Card skeleton for case cards, evidence cards, etc.
 */
export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <Skeleton variant="badge" width="80px" height="24px" />
        <Skeleton variant="circular" width="32px" height="32px" />
      </div>
      <Skeleton variant="text" width="70%" height="1.5em" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="60%" />
      <div className="skeleton-card-footer">
        <Skeleton variant="rectangular" width="100px" height="36px" />
        <Skeleton variant="rectangular" width="100px" height="36px" />
      </div>
    </div>
  );
};

/**
 * Table skeleton for data tables
 */
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" width="100%" height="1.2em" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" width="90%" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Dashboard stats skeleton
 */
export const SkeletonStats: React.FC = () => {
  return (
    <div className="skeleton-stats-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`stat-${i}`} className="skeleton-stat-card">
          <Skeleton variant="circular" width="40px" height="40px" />
          <Skeleton variant="text" width="60%" height="2em" />
          <Skeleton variant="text" width="80%" height="1em" />
        </div>
      ))}
    </div>
  );
};

/**
 * Form skeleton for loading forms
 */
export const SkeletonForm: React.FC<{ fields?: number }> = ({ fields = 4 }) => {
  return (
    <div className="skeleton-form">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="skeleton-form-group">
          <Skeleton variant="text" width="30%" height="1em" />
          <Skeleton variant="rectangular" width="100%" height="42px" />
        </div>
      ))}
      <Skeleton variant="rectangular" width="150px" height="42px" />
    </div>
  );
};

export default Skeleton;
