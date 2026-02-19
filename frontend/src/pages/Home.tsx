/**
 * Home Page
 * Public landing page with system introduction and stats
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPublicStats } from '../services/case';
import { SkeletonStats } from '../components/LoadingSkeleton';
import './Home.css';

interface HomeStats {
  totalCases: number;
  activeCases: number;
  solvedCases: number;
}

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<HomeStats>({ totalCases: 0, activeCases: 0, solvedCases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getPublicStats();
      setStats({
        totalCases: data.total_cases,
        activeCases: data.active_cases,
        solvedCases: data.solved_cases,
      });
    } catch {
      // Silently fail – stats default to 0
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-badge">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M50 5 L65 25 L90 30 L70 50 L75 75 L50 65 L25 75 L30 50 L10 30 L35 25 Z"
                fill="var(--color-gold)"
                stroke="var(--color-noir-charcoal)"
                strokeWidth="2"
              />
              <circle cx="50" cy="50" r="15" fill="var(--color-noir-charcoal)" />
              <text x="50" y="55" textAnchor="middle" fontSize="12" fill="var(--color-gold)" fontFamily="serif">
                LAPD
              </text>
            </svg>
          </div>
          <h1 className="hero-title">LA Noire NextGen</h1>
          <p className="hero-subtitle">Los Angeles Police Department — Case Management System</p>
          <p className="hero-tagline">
            "In a city of lies, the truth always surfaces."
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Enter Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary btn-lg">
                  Officer Login
                </Link>
                <Link to="/register" className="btn btn-lg">
                  New Registration
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="home-stats">
        <h2 className="section-title">Department Overview</h2>
        {loading ? (
          <SkeletonStats />
        ) : (
          <div className="stats-row">
            <div className="home-stat-card">
              <div className="stat-number">{stats.totalCases}</div>
              <div className="stat-desc">Total Cases Filed</div>
            </div>
            <div className="home-stat-card">
              <div className="stat-number">{stats.activeCases}</div>
              <div className="stat-desc">Active Investigations</div>
            </div>
            <div className="home-stat-card">
              <div className="stat-number">{stats.solvedCases}</div>
              <div className="stat-desc">Cases Solved</div>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="home-features">
        <h2 className="section-title">System Capabilities</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Case Management</h3>
            <p>File complaints, register crime scenes, and track investigations through the full workflow.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔬</div>
            <h3>Evidence Registry</h3>
            <p>Manage physical, biological, testimonial, and digital evidence with forensic verification.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗂️</div>
            <h3>Detective Board</h3>
            <p>Build visual investigation boards connecting evidence, suspects, and leads.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Most Wanted</h3>
            <p>Track high-priority suspects with danger scores, rewards, and public tip submission.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚖️</div>
            <h3>Trial Management</h3>
            <p>Track trials from captain decision through verdict, punishment, and bail processing.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Reports & Analytics</h3>
            <p>Comprehensive case summaries and reports for command-level oversight.</p>
          </div>
        </div>
      </section>

      {/* Most Wanted Teaser */}
      <section className="home-wanted">
        <h2 className="section-title">Public Information</h2>
        <p className="wanted-desc">
          If you have information about wanted suspects, visit our{' '}
          <Link to="/most-wanted">Most Wanted</Link> page or submit a tip anonymously.
        </p>
        <Link to="/most-wanted" className="btn btn-primary">
          View Most Wanted
        </Link>
      </section>
    </div>
  );
};

export default Home;
