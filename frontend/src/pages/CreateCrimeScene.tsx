/**
 * Create Crime Scene Report Page
 * Officer-initiated case formation
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSceneCase } from '../services/case';
import type { CaseCreateSceneData, WitnessData } from '../types';
import type { AxiosError } from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { extractErrorMessage } from '../utils/errorHandler';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './CreateCrimeScene.css';

const CreateCrimeScene: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CaseCreateSceneData>({
    title: '',
    description: '',
    crime_level: 2,
    formation_type: 'crime_scene',
    crime_scene_location: '',
    crime_scene_datetime: '',
    witness_data: [],
  });

  const [witnesses, setWitnesses] = useState<WitnessData[]>([
    { full_name: '', phone_number: '', national_id: '' },
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'crime_level' ? parseInt(value) : value,
    }));
  };

  const handleWitnessChange = (index: number, field: keyof WitnessData, value: string) => {
    const updatedWitnesses = [...witnesses];
    updatedWitnesses[index][field] = value;
    setWitnesses(updatedWitnesses);
  };

  const addWitness = () => {
    setWitnesses([...witnesses, { full_name: '', phone_number: '', national_id: '' }]);
  };

  const removeWitness = (index: number) => {
    if (witnesses.length > 1) {
      setWitnesses(witnesses.filter((_, i) => i !== index));
    }
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
    if (!formData.crime_scene_location.trim()) {
      showNotification('Please provide crime scene location', 'error');
      return;
    }
    if (!formData.crime_scene_datetime) {
      showNotification('Please provide crime scene date and time', 'error');
      return;
    }

    // Filter out empty witnesses and validate
    const validWitnesses = witnesses.filter(
      (w) => w.full_name.trim() || w.phone_number.trim() || w.national_id.trim()
    );

    // Validate witness data
    for (const witness of validWitnesses) {
      if (!witness.full_name.trim()) {
        showNotification('Please provide witness full name', 'error');
        return;
      }
      if (!witness.phone_number.trim()) {
        showNotification('Please provide witness phone number', 'error');
        return;
      }
      if (!witness.national_id.trim()) {
        showNotification('Please provide witness national ID', 'error');
        return;
      }
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        witness_data: validWitnesses,
      };
      await createSceneCase(submitData);
      showNotification('Crime scene report filed successfully', 'success');
      navigate('/cases');
    } catch (err) {
      const errorMessage = extractErrorMessage(
        err as AxiosError,
        'Failed to file crime scene report'
      );
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="create-scene-page">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="create-scene-page">
      <div className="scene-header">
        <div className="scene-header-content">
          <h1 className="scene-title">Crime Scene Report</h1>
          <p className="scene-subtitle">
            Official crime scene documentation for law enforcement personnel only.
          </p>
        </div>
        <div className="scene-icon">🚨</div>
      </div>

      <form onSubmit={handleSubmit} className="scene-form">
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
            <option value={0}>Critical - Immediate threat to life or major crime</option>
            <option value={1}>Major - Serious crime requiring urgent attention</option>
            <option value={2}>Medium - Standard investigation required</option>
            <option value={3}>Minor - Low priority case</option>
          </select>
        </div>

        {/* Crime Scene Location */}
        <div className="form-group">
          <label htmlFor="crime_scene_location" className="form-label">
            Crime Scene Location <span className="required">*</span>
          </label>
          <input
            type="text"
            id="crime_scene_location"
            name="crime_scene_location"
            value={formData.crime_scene_location}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Exact address or location description"
            required
          />
        </div>

        {/* Crime Scene Date/Time */}
        <div className="form-group">
          <label htmlFor="crime_scene_datetime" className="form-label">
            Date & Time of Discovery <span className="required">*</span>
          </label>
          <input
            type="datetime-local"
            id="crime_scene_datetime"
            name="crime_scene_datetime"
            value={formData.crime_scene_datetime}
            onChange={handleInputChange}
            className="form-input"
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Scene Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="Detailed description of the crime scene..."
            rows={6}
            required
          />
          <span className="form-hint">
            Include: scene condition, evidence found, victim status, environmental factors
          </span>
        </div>

        {/* Witnesses Section */}
        <div className="witnesses-section">
          <div className="witnesses-header">
            <h3 className="witnesses-title">Witness Information</h3>
            <button type="button" onClick={addWitness} className="btn btn-secondary btn-sm">
              + Add Witness
            </button>
          </div>

          {witnesses.map((witness, index) => (
            <div key={index} className="witness-card">
              <div className="witness-card-header">
                <span className="witness-number">Witness #{index + 1}</span>
                {witnesses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWitness(index)}
                    className="btn-remove"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              <div className="witness-fields">
                <div className="form-group">
                  <label htmlFor={`witness-name-${index}`} className="form-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id={`witness-name-${index}`}
                    value={witness.full_name}
                    onChange={(e) => handleWitnessChange(index, 'full_name', e.target.value)}
                    className="form-input"
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`witness-phone-${index}`} className="form-label">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id={`witness-phone-${index}`}
                    value={witness.phone_number}
                    onChange={(e) => handleWitnessChange(index, 'phone_number', e.target.value)}
                    className="form-input"
                    placeholder="+1234567890"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`witness-id-${index}`} className="form-label">
                    National ID
                  </label>
                  <input
                    type="text"
                    id={`witness-id-${index}`}
                    value={witness.national_id}
                    onChange={(e) => handleWitnessChange(index, 'national_id', e.target.value)}
                    className="form-input"
                    placeholder="ID number"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/cases')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Filing Report...' : 'Submit Report'}
          </button>
        </div>
      </form>

      {/* Process Information */}
      <div className="process-info">
        <h3 className="process-title">Officer Reporting Guidelines</h3>
        <ul className="guidelines-list">
          <li>Crime scene reports require supervisor approval before opening the case</li>
          <li>Chiefs can open cases immediately without approval</li>
          <li>Document all evidence and witness statements thoroughly</li>
          <li>Include accurate location coordinates when possible</li>
          <li>Preserve chain of custody documentation</li>
        </ul>
      </div>
    </div>
  );
};

export default CreateCrimeScene;
