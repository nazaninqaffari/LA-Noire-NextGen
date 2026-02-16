/**
 * Footer Component
 * Site footer with credits and links
 */
import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4 className="footer-title">LA Noire NextGen</h4>
          <p className="footer-text">
            Police Case Management System<br />
            Inspired by the 1940s era detective operations
          </p>
        </div>
        
        <div className="footer-section">
          <h4 className="footer-title">System Information</h4>
          <p className="footer-text">
            Version 1.0.0<br />
            © {currentYear} Los Angeles Police Department
          </p>
        </div>
        
        <div className="footer-section">
          <h4 className="footer-title">Quick Links</h4>
          <ul className="footer-links">
            <li><a href="/api/docs" target="_blank" rel="noopener noreferrer">API Documentation</a></li>
            <li><a href="/api/redoc" target="_blank" rel="noopener noreferrer">API Reference</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p className="footer-copyright">
          "Every story has a beginning, every crime has a truth" - LAPD
        </p>
      </div>
    </footer>
  );
};

export default Footer;
