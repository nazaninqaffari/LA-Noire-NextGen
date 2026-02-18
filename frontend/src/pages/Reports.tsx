/**
 * Reports Page
 * General reports for command-level users (captain, chief, judge)
 * Provides case statistics, investigation summaries, and trial results
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { getCases } from '../services/case';
import { getSuspects } from '../services/investigation';
import { getTrials } from '../services/trial';
import type { Case } from '../types';
import { SkeletonStats, SkeletonTable } from '../components/LoadingSkeleton';
import './Reports.css';

interface ReportStats {
  totalCases: number;
  closedCases: number;
  openCases: number;
  totalSuspects: number;
  arrestedSuspects: number;
  totalTrials: number;
  completedTrials: number;
  pendingTrials: number;
}

const Reports: React.FC = () => {
  const { showNotification } = useNotification();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, closedRes, suspectsRes, arrestedRes, trialsRes, completedTrialsRes] =
        await Promise.allSettled([
          getCases({ page: 1 }),
          getCases({ status: 'closed', page: 1 }),
          getSuspects({ page: 1 }),
          getSuspects({ status: 'arrested', page: 1 }),
          getTrials({ page: 1 }),
          getTrials({ status: 'completed', page: 1 }),
        ]);

      const totalCases = casesRes.status === 'fulfilled' ? casesRes.value.count : 0;
      const closedCases = closedRes.status === 'fulfilled' ? closedRes.value.count : 0;
      const totalTrials = trialsRes.status === 'fulfilled' ? trialsRes.value.count : 0;
      const completedTrials =
        completedTrialsRes.status === 'fulfilled' ? completedTrialsRes.value.count : 0;

      setStats({
        totalCases,
        closedCases,
        openCases: totalCases - closedCases,
        totalSuspects: suspectsRes.status === 'fulfilled' ? suspectsRes.value.count : 0,
        arrestedSuspects: arrestedRes.status === 'fulfilled' ? arrestedRes.value.count : 0,
        totalTrials,
        completedTrials,
        pendingTrials: totalTrials - completedTrials,
      });

      if (casesRes.status === 'fulfilled') {
        setRecentCases(casesRes.value.results.slice(0, 10));
      }
    } catch {
      showNotification('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="reports-page">
        <div className="page-header"><h1>General Reports</h1></div>
        <SkeletonStats />
        <SkeletonTable />
      </div>
    );
  }

  const caseResolutionRate =
    stats && stats.totalCases > 0
      ? ((stats.closedCases / stats.totalCases) * 100).toFixed(1)
      : '0';

  const arrestRate =
    stats && stats.totalSuspects > 0
      ? ((stats.arrestedSuspects / stats.totalSuspects) * 100).toFixed(1)
      : '0';

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1 className="page-title">General Reports</h1>
        <p className="page-subtitle">Department performance overview and analytics</p>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="report-stats-grid">
          <div className="report-stat">
            <div className="report-stat-value">{stats.totalCases}</div>
            <div className="report-stat-label">Total Cases</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-value">{stats.openCases}</div>
            <div className="report-stat-label">Open Cases</div>
          </div>
          <div className="report-stat highlight">
            <div className="report-stat-value">{caseResolutionRate}%</div>
            <div className="report-stat-label">Resolution Rate</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-value">{stats.totalSuspects}</div>
            <div className="report-stat-label">Total Suspects</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-value">{stats.arrestedSuspects}</div>
            <div className="report-stat-label">Arrests Made</div>
          </div>
          <div className="report-stat highlight">
            <div className="report-stat-value">{arrestRate}%</div>
            <div className="report-stat-label">Arrest Rate</div>
          </div>
        </div>
      )}

      <div className="reports-grid">
        {/* Case Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Trial Statistics</h3>
          </div>
          <div className="card-body">
            {stats && (
              <div className="trial-stats">
                <div className="trial-stat-item">
                  <span className="tstat-label">Total Trials</span>
                  <span className="tstat-value">{stats.totalTrials}</span>
                </div>
                <div className="trial-stat-item">
                  <span className="tstat-label">Completed</span>
                  <span className="tstat-value completed">{stats.completedTrials}</span>
                </div>
                <div className="trial-stat-item">
                  <span className="tstat-label">Pending</span>
                  <span className="tstat-value pending">{stats.pendingTrials}</span>
                </div>
                {stats.totalTrials > 0 && (
                  <div className="trial-progress-bar">
                    <div
                      className="trial-progress-fill"
                      style={{
                        width: `${(stats.completedTrials / stats.totalTrials) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Case Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Case Activity</h3>
          </div>
          <div className="card-body">
            {recentCases.length === 0 ? (
              <p className="empty-state">No case data available.</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Level</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => (
                    <tr key={c.id}>
                      <td>{c.case_number}</td>
                      <td>{c.title}</td>
                      <td>
                        <span className={`status-badge status-${c.status.replace(/_/g, '-')}`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{['Critical', 'Major', 'Medium', 'Minor'][c.crime_level]}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
