/**
 * Create Complaint Page
 * Citizen-initiated case formation
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createComplaintCase } from '../services/case';
import type { CaseCreateComplaintData } from '../types';
import type { AxiosError } from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { extractErrorMessage } from '../utils/errorHandler';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './CreateComplaint.css';

const CreateComplaint: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CaseCreateComplaintData>({
    title: '',
    description: '',
    crime_level: 2,
    formation_type: 'complaint',
    complainant_statement: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'crime_level' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      showNotification('Please provide a case title', 'error');
      return;
    }
    if (!formData.description.trim()) {
      showNotification('Please provide a case description', 'error');
      return;
    }
    if (!formData.complainant_statement.trim()) {
      showNotification('Please provide your statement', 'error');
      return;
    }

    try {
      setLoading(true);
      await createComplaintCase(formData);
      showNotification('Complaint filed successfully', 'success');
      navigate('/cases');
    } catch (err) {
      const errorMessage = extractErrorMessage(
        err as AxiosError,
        'Failed to file complaint'
      );
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const crimeLevelInfo = {
    0: { label: 'Critical', description: 'Immediate threat to life or major crime' },
    1: { label: 'Major', description: 'Serious crime requiring urgent attention' },
    2: { label: 'Medium', description: 'Standard investigation required' },
    3: { label: 'Minor', description: 'Low priority case' },
  };

  if (loading) {
    return (
      <div className="create-complaint-page">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="create-complaint-page">
      <div className="complaint-header">
        <div className="complaint-header-content">
          <h1 className="complaint-title">File a Complaint</h1>
          <p className="complaint-subtitle">
            Report a crime or suspicious activity. A cadet will review your complaint.
          </p>
        </div>
        <div className="complaint-icon">📜</div>
      </div>

      <form onSubmit={handleSubmit} className="complaint-form">
        {/* Case Title */}
        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Case Title <span className="required">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Brief summary of the incident"
            maxLength={200}
            required
          />
          <span className="form-hint">Maximum 200 characters</span>
        </div>

        {/* Crime Level */}
        <div className="form-group">
          <label htmlFor="crime_level" className="form-label">
            Crime Severity <span className="required">*</span>
          </label>
          <select
            id="crime_level"
            name="crime_level"
            value={formData.crime_level}
            onChange={handleInputChange}
            className="form-select"
            required
          >
            <option value={0}>Critical - {crimeLevelInfo[0].description}</option>
            <option value={1}>Major - {crimeLevelInfo[1].description}</option>
            <option value={2}>Medium - {crimeLevelInfo[2].description}</option>
            <option value={3}>Minor - {crimeLevelInfo[3].description}</option>
          </select>
          <div className="crime-level-info">
            <span className="info-icon">ℹ️</span>
            <span className="info-text">
              {crimeLevelInfo[formData.crime_level as keyof typeof crimeLevelInfo].description}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Incident Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="Provide a detailed description of what happened..."
            rows={6}
            required
          />
          <span className="form-hint">Include relevant details: date, time, location, witnesses</span>
        </div>

        {/* Complainant Statement */}
        <div className="form-group">
          <label htmlFor="complainant_statement" className="form-label">
            Your Statement <span className="required">*</span>
          </label>
          <textarea
            id="complainant_statement"
            name="complainant_statement"
            value={formData.complainant_statement}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="Your personal account of the incident..."
            rows={8}
            required
          />
          <span className="form-hint">
            This is your official statement. Be as accurate and detailed as possible.
          </span>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/cases')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Filing Complaint...' : 'Submit Complaint'}
          </button>
        </div>
      </form>

      {/* Process Information */}
      <div className="process-info">
        <h3 className="process-title">What happens next?</h3>
        <ol className="process-steps">
          <li className="process-step">
            <span className="step-number">1</span>
            <div className="step-content">
              <strong>Cadet Review</strong>
              <p>A cadet officer will review your complaint and can approve or request changes</p>
            </div>
          </li>
          <li className="process-step">
            <span className="step-number">2</span>
            <div className="step-content">
              <strong>Officer Review</strong>
              <p>If approved by cadet, a senior officer will make the final decision</p>
            </div>
          </li>
          <li className="process-step">
            <span className="step-number">3</span>
            <div className="step-content">
              <strong>Investigation</strong>
              <p>Once approved, the case will be opened and assigned to an investigator</p>
            </div>
          </li>
        </ol>
        <div className="process-note">
          <strong>Note:</strong> If your complaint is rejected 3 times by a cadet, it will be
          permanently closed.
        </div>
      </div>
    </div>
  );
};

export default CreateComplaint;
