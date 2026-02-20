import React, { useState, useCallback, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { getAdminCases } from '../../services/admin';
import Pagination from '../../components/Pagination';
import type { Case } from '../../types';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'under_investigation', label: 'Under Investigation' },
  { value: 'suspects_identified', label: 'Suspects Identified' },
  { value: 'arrest_approved', label: 'Arrest Approved' },
  { value: 'interrogation', label: 'Interrogation' },
  { value: 'trial_pending', label: 'Trial Pending' },
  { value: 'closed', label: 'Closed' },
];

const CRIME_LEVEL_LABELS: Record<number, string> = {
  0: 'Critical',
  1: 'Major',
  2: 'Medium',
  3: 'Minor',
};

const AdminCases: React.FC = () => {
  const { showNotification } = useNotification();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminCases({
        page,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });
      setCases(res.results);
      setTotalCount(res.count);
    } catch {
      showNotification('Failed to load cases', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, showNotification]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="admin-cases">
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Search cases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-search"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-filter"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="admin-loading">Loading cases...</p>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Case #</th>
                <th>Title</th>
                <th>Status</th>
                <th>Crime Level</th>
                <th>Created By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td className="username-cell">{c.case_number}</td>
                  <td>{c.title}</td>
                  <td>
                    <span className={`case-status-badge status-${c.status}`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{CRIME_LEVEL_LABELS[c.crime_level] ?? c.crime_level}</td>
                  <td>{c.created_by_details?.username ?? c.created_by}</td>
                  <td>{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default AdminCases;
