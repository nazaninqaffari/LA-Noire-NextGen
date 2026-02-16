/**
 * Header Component Tests
 * Tests for the Header navigation component
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../utils';
import Header from '../../src/components/Header';

describe('Header Component', () => {
  it('renders header with site title', () => {
    renderWithRouter(<Header />);
    
    expect(screen.getByText(/LA Noire NextGen/i)).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles Police Department/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter(<Header />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Cases')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Suspects')).toBeInTheDocument();
    expect(screen.getByText('Style Guide')).toBeInTheDocument();
  });

  it('renders LAPD badge icon', () => {
    renderWithRouter(<Header />);
    
    const badge = document.querySelector('.badge-icon');
    expect(badge).toBeInTheDocument();
  });

  it('navigation links have correct hrefs', () => {
    renderWithRouter(<Header />);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const casesLink = screen.getByText('Cases').closest('a');
    const evidenceLink = screen.getByText('Evidence').closest('a');
    const suspectsLink = screen.getByText('Suspects').closest('a');
    
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(casesLink).toHaveAttribute('href', '/cases');
    expect(evidenceLink).toHaveAttribute('href', '/evidence');
    expect(suspectsLink).toHaveAttribute('href', '/suspects');
  });
});
