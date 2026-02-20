/**
 * Create Complaint Page
 * Citizen-initiated case formation with collaborative complainant support.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createComplaintCase, getCrimeLevels } from '../services/case';
import { getUsers } from '../services/admin';
import type { CaseCreateComplaintData } from '../types';
import type { AxiosError } from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { extractErrorMessage } from '../utils/errorHandler';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './CreateComplaint.css';

interface CoComplainant {
  user_id: number;
  username: string;
  statement: string;
}

const CreateComplaint: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [crimeLevels, setCrimeLevels] = useState<any[]>([]);
  const [formData, setFormData] = useState<CaseCreateComplaintData>({
    title: '',
    description: '',
    crime_level: 0,
    formation_type: 'complaint',
    complainant_statement: '',
  });

  // Co-complainant state
  const [coComplainants, setCoComplainants] = useState<CoComplainant[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [newCoStatement, setNewCoStatement] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch crime levels from backend so we use real FK IDs
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const levels = await getCrimeLevels();
        setCrimeLevels(levels);
        // Default to first available if formData has no valid selection
        if (levels.length > 0 && !levels.find((l: any) => l.id === formData.crime_level)) {
          setFormData((prev) => ({ ...prev, crime_level: levels[0].id }));
        }
      } catch {
        // Fallback: leave as-is
      }
    };
    fetchLevels();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'crime_level' ? parseInt(value) : value,
    }));
  };

  // Search users for co-complainants
  const handleUserSearch = async () => {
    if (!userSearchQuery.trim() || userSearchQuery.trim().length < 2) return;
    setSearchingUsers(true);
    try {
      const res = await getUsers({ search: userSearchQuery.trim() });
      const results = (res.results || []).filter((u: any) =>
        u.id !== currentUser?.id &&
        !coComplainants.some(c => c.user_id === u.id)
      );
      setUserSearchResults(results);
    } catch {
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddCoComplainant = () => {
    if (!selectedUserId || !newCoStatement.trim() || newCoStatement.trim().length < 10) {
      showNotification('Select a user and provide a statement (min 10 chars)', 'error');
      return;
    }
    const found = userSearchResults.find((u: any) => u.id === selectedUserId);
    if (!found) return;
    setCoComplainants(prev => [...prev, {
      user_id: found.id,
      username: found.username || found.full_name || `User #${found.id}`,
      statement: newCoStatement.trim(),
    }]);
    setSelectedUserId(null);
    setNewCoStatement('');
    setUserSearchResults([]);
    setUserSearchQuery('');
  };

  const handleRemoveCoComplainant = (userId: number) => {
    setCoComplainants(prev => prev.filter(c => c.user_id !== userId));
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
      const payload: CaseCreateComplaintData = {
        ...formData,
        additional_complainants: coComplainants.length > 0
          ? coComplainants.map(c => ({ user_id: c.user_id, statement: c.statement }))
          : undefined,
      };
      await createComplaintCase(payload);
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
            {crimeLevels.length > 0 ? (
              crimeLevels.map((cl: any) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name || `Level ${cl.level}`} — {cl.description || ''}
                </option>
              ))
            ) : (
              <>
                <option value={0}>Critical - Immediate threat to life or major crime</option>
                <option value={1}>Major - Serious crime requiring urgent attention</option>
                <option value={2}>Medium - Standard investigation required</option>
                <option value={3}>Minor - Low priority case</option>
              </>
            )}
          </select>
          <div className="crime-level-info">
            <span className="info-icon">ℹ️</span>
            <span className="info-text">
              {crimeLevels.find((cl: any) => cl.id === formData.crime_level)?.description
                || 'Select a crime severity level'}
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

        {/* Co-Complainants Section */}
        <div className="form-group co-complainant-section">
          <label className="form-label">Add Other Complainants (Optional)</label>
          <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
            You can add other persons who are also affected by this incident.
          </p>

          {/* List existing co-complainants */}
          {coComplainants.length > 0 && (
            <div className="co-complainant-list" data-testid="co-complainant-list">
              {coComplainants.map(c => (
                <div key={c.user_id} className="co-complainant-card" data-testid={`co-complainant-${c.user_id}`}>
                  <div className="co-complainant-info">
                    <strong>{c.username}</strong>
                    <p>{c.statement}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveCoComplainant(c.user_id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search and add */}
          <div className="co-complainant-add">
            <div className="search-row">
              <input
                type="text"
                id="co-complainant-search"
                className="form-input"
                placeholder="Search by username, name, or national ID..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUserSearch(); } }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleUserSearch}
                disabled={searchingUsers}
              >
                {searchingUsers ? 'Searching...' : '🔍 Search'}
              </button>
            </div>

            {userSearchResults.length > 0 && (
              <div className="user-search-results" data-testid="user-search-results">
                {userSearchResults.map((u: any) => (
                  <label key={u.id} className={`user-result${selectedUserId === u.id ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="co-user"
                      value={u.id}
                      checked={selectedUserId === u.id}
                      onChange={() => setSelectedUserId(u.id)}
                    />
                    <span>{u.username} — {u.first_name} {u.last_name}</span>
                  </label>
                ))}
              </div>
            )}

            {selectedUserId && (
              <div className="co-statement-row">
                <textarea
                  id="co-complainant-statement"
                  className="form-textarea"
                  placeholder="Their statement about the incident (min 10 chars)..."
                  value={newCoStatement}
                  onChange={e => setNewCoStatement(e.target.value)}
                  rows={3}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddCoComplainant}
                >
                  + Add Person
                </button>
              </div>
            )}
          </div>
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
