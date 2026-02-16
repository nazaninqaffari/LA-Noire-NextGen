/**
 * Dashboard Page
 * Main overview page after login with TypeScript support
 */
import React, { useEffect, useState } from 'react';
import type { DashboardStats } from '../types';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    totalSuspects: 0,
    totalEvidence: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      // These endpoints would need to be implemented in the backend
      // For now, we'll use placeholder data
      setStats({
        totalCases: 42,
        activeCases: 15,
        totalSuspects: 23,
        totalEvidence: 187
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Command Dashboard</h1>
        <p className="dashboard-subtitle">Case Management Overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-value">{stats.totalCases}</div>
          <div className="stat-label">Total Cases</div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-icon">🔍</div>
          <div className="stat-value">{stats.activeCases}</div>
          <div className="stat-label">Active Investigations</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-value">{stats.totalSuspects}</div>
          <div className="stat-label">Suspects Tracked</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔬</div>
          <div className="stat-value">{stats.totalEvidence}</div>
          <div className="stat-label">Evidence Items</div>
        </div>
      </div>

      <div className="row">
        <div className="col-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Cases</h3>
            </div>
            <div className="card-body">
              <table>
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CASE-001</td>
                    <td>Downtown Robbery Investigation</td>
                    <td><span className="badge badge-warning">In Progress</span></td>
                    <td>Det. Cole Phelps</td>
                  </tr>
                  <tr>
                    <td>CASE-002</td>
                    <td>Suspect Identification Required</td>
                    <td><span className="badge badge-info">Under Review</span></td>
                    <td>Det. Roy Earle</td>
                  </tr>
                  <tr>
                    <td>CASE-003</td>
                    <td>Evidence Analysis Pending</td>
                    <td><span className="badge badge-warning">In Progress</span></td>
                    <td>Det. Rusty Galloway</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="action-buttons">
                <button className="btn btn-primary btn-block">New Case</button>
                <button className="btn btn-block">Register Evidence</button>
                <button className="btn btn-block">Add Suspect</button>
                <button className="btn btn-block">View Reports</button>
              </div>
            </div>
          </div>

          <div className="card mt-lg">
            <div className="card-header">
              <h3 className="card-title">System Status</h3>
            </div>
            <div className="card-body">
              <div className="status-item">
                <span className="status-label">Database</span>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="status-item">
                <span className="status-label">Evidence Storage</span>
                <span className="badge badge-success">Available</span>
              </div>
              <div className="status-item">
                <span className="status-label">Network</span>
                <span className="badge badge-success">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
