import React, { useEffect, useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { getAdminStats } from '../../services/admin';
import type { AdminStats } from '../../types';

const AdminDashboard: React.FC = () => {
  const { showNotification } = useNotification();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch {
        showNotification('Failed to load dashboard stats', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [showNotification]);

  if (loading) {
    return <div className="admin-loading">Loading stats...</div>;
  }

  if (!stats) {
    return <div className="admin-loading">No data available</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <h3>Users</h3>
          <div className="stat-number">{stats.users.total}</div>
          <div className="stat-details">
            <span className="stat-detail active">{stats.users.active} active</span>
            <span className="stat-detail inactive">{stats.users.inactive} inactive</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>Roles</h3>
          <div className="stat-number">{stats.roles}</div>
        </div>

        <div className="stat-card">
          <h3>Cases</h3>
          <div className="stat-number">{stats.cases.total}</div>
          <div className="stat-details">
            <span className="stat-detail">{stats.cases.open} open</span>
            <span className="stat-detail">{stats.cases.under_investigation} investigating</span>
            <span className="stat-detail">{stats.cases.closed} closed</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>Evidence</h3>
          <div className="stat-number">{stats.evidence.total}</div>
          <div className="stat-details">
            <span className="stat-detail">{stats.evidence.testimonies} testimonies</span>
            <span className="stat-detail">{stats.evidence.biological} biological</span>
            <span className="stat-detail">{stats.evidence.vehicle} vehicle</span>
            <span className="stat-detail">{stats.evidence.id_documents} ID docs</span>
            <span className="stat-detail">{stats.evidence.generic} generic</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>Suspects</h3>
          <div className="stat-number">{stats.suspects}</div>
        </div>

        <div className="stat-card">
          <h3>Trials</h3>
          <div className="stat-number">{stats.trials}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
