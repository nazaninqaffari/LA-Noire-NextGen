/**
 * Dashboard Page
 * Main overview page after login with real API data
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getCases } from '../services/case';
import { getSuspects } from '../services/investigation';
import { getNotifications, getUnreadCount } from '../services/investigation';
import type { Case, AppNotification, DashboardStats } from '../types';
import { SkeletonStats, SkeletonTable } from '../components/LoadingSkeleton';
import CaseStatusBadge from '../components/CaseStatusBadge';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    totalSuspects: 0,
    totalEvidence: 0,
  });
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [casesRes, suspectsRes, notifRes, unreadRes] = await Promise.allSettled([
        getCases({ page: 1 }),
        getSuspects({ page: 1 }),
        getNotifications({ page: 1 }),
        getUnreadCount(),
      ]);

      if (casesRes.status === 'fulfilled') {
        setRecentCases(casesRes.value.results.slice(0, 5));
        setStats((prev) => ({ ...prev, totalCases: casesRes.value.count }));
      }
      if (suspectsRes.status === 'fulfilled') {
        setStats((prev) => ({ ...prev, totalSuspects: suspectsRes.value.count }));
      }
      if (notifRes.status === 'fulfilled') {
        setNotifications(notifRes.value.results.slice(0, 5));
      }
      if (unreadRes.status === 'fulfilled') {
        setUnreadCount(unreadRes.value.count);
      }
    } catch (err) {
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /** Role-based greeting */
  const getGreeting = (): string => {
    const roleName = user?.roles?.[0]?.name ?? user?.role?.name ?? '';
    const greetings: Record<string, string> = {
      detective: `Welcome back, Detective ${user?.last_name || user?.username}`,
      officer: `Good day, Officer ${user?.last_name || user?.username}`,
      sergeant: `Sergeant ${user?.last_name || user?.username}, reporting in`,
      captain: `Captain ${user?.last_name || user?.username}, at your service`,
      chief: `Chief ${user?.last_name || user?.username}, command overview ready`,
      judge: `Your Honor, ${user?.last_name || user?.username}`,
      cadet: `Cadet ${user?.last_name || user?.username}, awaiting orders`,
      coroner: `Dr. ${user?.last_name || user?.username}, forensic bay ready`,
    };
    return greetings[roleName.toLowerCase()] ?? `Welcome, ${user?.username}`;
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Command Dashboard</h1>
        </div>
        <SkeletonStats />
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Command Dashboard</h1>
        <p className="dashboard-subtitle">{getGreeting()}</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/cases')}>
          <div className="stat-icon">📁</div>
          <div className="stat-value">{stats.totalCases}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="stat-card stat-active" onClick={() => navigate('/cases')}>
          <div className="stat-icon">🔍</div>
          <div className="stat-value">{stats.activeCases}</div>
          <div className="stat-label">Active Investigations</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/suspects')}>
          <div className="stat-icon">👤</div>
          <div className="stat-value">{stats.totalSuspects}</div>
          <div className="stat-label">Suspects Tracked</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/evidence')}>
          <div className="stat-icon">🔬</div>
          <div className="stat-value">{stats.totalEvidence}</div>
          <div className="stat-label">Evidence Items</div>
        </div>
      </div>

      <div className="row">
        {/* Recent Cases */}
        <div className="col-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Cases</h3>
              <Link to="/cases" className="btn btn-sm">View All</Link>
            </div>
            <div className="card-body">
              {recentCases.length === 0 ? (
                <p className="empty-state">No cases on file yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Crime Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCases.map((c) => (
                      <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="clickable-row">
                        <td>{c.case_id}</td>
                        <td>{c.title}</td>
                        <td><CaseStatusBadge status={c.status} /></td>
                        <td>
                          <span className={`crime-level level-${c.crime_level}`}>
                            {['Critical', 'Major', 'Medium', 'Minor'][c.crime_level]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-4">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="action-buttons">
                <Link to="/cases/complaint/new" className="btn btn-primary btn-block">
                  📜 File Complaint
                </Link>
                <Link to="/cases/scene/new" className="btn btn-block">
                  🚨 Report Crime Scene
                </Link>
                <Link to="/evidence" className="btn btn-block">
                  🔬 Register Evidence
                </Link>
                <Link to="/most-wanted" className="btn btn-block">
                  🎯 Most Wanted
                </Link>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="card mt-lg">
            <div className="card-header">
              <h3 className="card-title">
                Notifications
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </h3>
            </div>
            <div className="card-body">
              {notifications.length === 0 ? (
                <p className="empty-state">No notifications.</p>
              ) : (
                <ul className="notification-list">
                  {notifications.map((n) => (
                    <li key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-time">
                        {new Date(n.created_at).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
