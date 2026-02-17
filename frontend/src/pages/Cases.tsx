/**
 * Cases List Page
 * Display and filter all cases
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCases } from '../services/case';
import type { Case, CaseStatus } from '../types';
import type { AxiosError } from 'axios';
import CaseCard from '../components/CaseCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useNotification } from '../contexts/NotificationContext';
import { extractErrorMessage } from '../utils/errorHandler';
import './Cases.css';

interface CaseFilters {
  status?: CaseStatus;
  crime_level?: number;
  search?: string;
  created_by?: number;
  assigned_to?: number;
}

const Cases: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CaseFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCases(filters);
      setCases(response.results);
    } catch (err) {
      const errorMessage = extractErrorMessage(
        err as AxiosError,
        'Failed to fetch cases'
      );
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showNotification]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      status: value ? (value as CaseStatus) : undefined,
    }));
  };

  const handleCrimeLevelFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      crime_level: value ? parseInt(value) : undefined,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      search: searchTerm || undefined,
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({});
  };

  return (
    <div className="cases-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Case Files</h1>
          <p className="page-subtitle">Manage and review all active investigations</p>
        </div>
        <div className="page-actions">
          <Link to="/cases/complaint/new" className="btn btn-primary">
            📜 File Complaint
          </Link>
          <Link to="/cases/scene/new" className="btn btn-secondary">
            🚨 Report Crime Scene
          </Link>
        </div>
      </div>

      {/* Filters Section */}
      <div className="cases-filters">
        <form onSubmit={handleSearch} className="filter-search">
          <input
            type="text"
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input search-input"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <div className="filter-group">
          <div className="filter-item">
            <label htmlFor="status-filter" className="filter-label">
              Status
            </label>
            <select
              id="status-filter"
              className="form-select"
              value={filters.status || ''}
              onChange={handleStatusFilter}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="cadet_review">Cadet Review</option>
              <option value="officer_review">Officer Review</option>
              <option value="rejected">Rejected</option>
              <option value="open">Open</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="suspects_identified">Suspects Identified</option>
              <option value="arrest_approved">Arrest Approved</option>
              <option value="interrogation">Interrogation</option>
              <option value="trial_pending">Trial Pending</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="crime-level-filter" className="filter-label">
              Crime Level
            </label>
            <select
              id="crime-level-filter"
              className="form-select"
              value={filters.crime_level !== undefined ? filters.crime_level : ''}
              onChange={handleCrimeLevelFilter}
            >
              <option value="">All Levels</option>
              <option value="0">Critical</option>
              <option value="1">Major</option>
              <option value="2">Medium</option>
              <option value="3">Minor</option>
            </select>
          </div>

          {(filters.status || filters.crime_level !== undefined || filters.search) && (
            <button type="button" onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Cases Grid */}
      <div className="cases-container">
        {loading ? (
          <>
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
          </>
        ) : cases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <h2 className="empty-state-title">No Cases Found</h2>
            <p className="empty-state-text">
              {filters.status || filters.crime_level || filters.search
                ? 'Try adjusting your filters'
                : 'Start by filing a complaint or reporting a crime scene'}
            </p>
          </div>
        ) : (
          <div className="cases-grid">
            {cases.map((caseData) => (
              <CaseCard key={caseData.id} case={caseData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cases;
