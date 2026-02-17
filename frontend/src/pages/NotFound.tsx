/**
 * 404 Not Found Page
 * Film Noir themed error page for missing routes
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-container">
        {/* Detective Badge Icon */}
        <div className="notfound-badge">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
            <path
              d="M50 5 L65 25 L90 30 L70 50 L75 75 L50 65 L25 75 L30 50 L10 30 L35 25 Z"
              fill="var(--color-noir-gray)"
              stroke="var(--color-brass)"
              strokeWidth="2"
              opacity="0.3"
            />
            <circle cx="50" cy="50" r="15" fill="var(--color-noir-charcoal)" />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="14"
              fill="var(--color-brass)"
              fontFamily="serif"
              opacity="0.5"
            >
              404
            </text>
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="notfound-code">404</h1>

        {/* Main Message */}
        <h2 className="notfound-title">Case Closed - No Leads Found</h2>

        {/* Description */}
        <p className="notfound-description">
          The file you're looking for has gone cold, detective. Either it never existed,
          or someone wiped the records clean. This trail leads nowhere.
        </p>

        {/* Film Noir styled quote */}
        <blockquote className="notfound-quote">
          <span className="quote-mark">"</span>
          In this city, not everything can be found. Some things stay lost in the shadows.
          <span className="quote-mark">"</span>
        </blockquote>

        {/* Action Buttons */}
        <div className="notfound-actions">
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            ← Go Back
          </button>
          <Link to="/dashboard" className="btn btn-primary">
            Return to Headquarters
          </Link>
          <Link to="/cases" className="btn btn-secondary">
            Browse Case Files
          </Link>
        </div>

        {/* Additional Info */}
        <div className="notfound-info">
          <p className="info-text">
            <strong>Looking for something specific?</strong>
          </p>
          <ul className="info-links">
            <li>
              <Link to="/cases">View All Cases</Link>
            </li>
            <li>
              <Link to="/cases/complaint/new">File a Complaint</Link>
            </li>
            <li>
              <Link to="/style-guide">System Guide</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="notfound-decoration">
        <div className="file-stamp">CASE NOT FOUND</div>
        <div className="file-stamp stamp-2">NO RECORDS</div>
      </div>
    </div>
  );
};

export default NotFound;
