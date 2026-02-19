/**
 * Evidence Registration Page
 * Multi-type evidence registration form
 */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { extractErrorMessage } from '../utils/errorHandler';
import type { AxiosError } from 'axios';
import {
  createTestimony,
  createBiologicalEvidence,
  createVehicleEvidence,
  createIDDocument,
  createGenericEvidence,
} from '../services/evidence';
import type { EvidenceType } from '../types';
import './EvidenceRegister.css';

const EvidenceRegister: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const presetCase = searchParams.get('case') || '';

  const [evidenceType, setEvidenceType] = useState<EvidenceType>('testimony');
  const [submitting, setSubmitting] = useState(false);

  // Common fields
  const [caseId, setCaseId] = useState(presetCase);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Testimony-specific
  const [transcript, setTranscript] = useState('');
  const [witnessName, setWitnessName] = useState('');

  // Vehicle-specific
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  // ID Document-specific
  const [ownerName, setOwnerName] = useState('');
  const [documentType, setDocumentType] = useState('');

  // File upload
  const [files, setFiles] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) {
      showNotification('Please specify a case ID', 'error');
      return;
    }

    setSubmitting(true);
    try {
      switch (evidenceType) {
        case 'testimony': {
          const formData = new FormData();
          formData.append('case', caseId);
          formData.append('title', title);
          formData.append('description', description);
          formData.append('transcript', transcript);
          if (witnessName) formData.append('witness_name', witnessName);
          if (files?.[0]) formData.append('image', files[0]);
          await createTestimony(formData);
          break;
        }
        case 'biological': {
          const formData = new FormData();
          formData.append('case', caseId);
          formData.append('title', title);
          formData.append('description', description);
          formData.append('evidence_type', 'biological');
          if (files) {
            Array.from(files).forEach((f) => formData.append('images', f));
          }
          await createBiologicalEvidence(formData);
          break;
        }
        case 'vehicle':
          await createVehicleEvidence({
            case: Number(caseId),
            title,
            description,
            model,
            color,
            license_plate: licensePlate || undefined,
            serial_number: serialNumber || undefined,
          } as any);
          break;
        case 'id_document':
          await createIDDocument({
            case: Number(caseId),
            title,
            description,
            owner_full_name: ownerName,
            document_type: documentType || undefined,
            attributes: {},
          } as any);
          break;
        case 'generic':
          await createGenericEvidence({
            case: Number(caseId),
            title,
            description,
          } as any);
          break;
      }

      showNotification('Evidence registered successfully', 'success');
      navigate(`/evidence?case=${caseId}`);
    } catch (err) {
      const errorMessage = extractErrorMessage(err as AxiosError, 'Failed to register evidence');
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="evidence-register-page">
      <div className="page-header">
        <h1 className="page-title">Register Evidence</h1>
        <p className="page-subtitle">Submit new evidence to the case file</p>
      </div>

      <form onSubmit={handleSubmit} className="evidence-form card">
        {/* Evidence Type Selector */}
        <div className="form-group">
          <label>Evidence Type</label>
          <div className="type-selector">
            {[
              { key: 'testimony' as EvidenceType, label: '🗣️ Testimony' },
              { key: 'biological' as EvidenceType, label: '🧬 Biological' },
              { key: 'vehicle' as EvidenceType, label: '🚗 Vehicle' },
              { key: 'id_document' as EvidenceType, label: '📄 ID Document' },
              { key: 'generic' as EvidenceType, label: '📦 Other' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`type-btn ${evidenceType === t.key ? 'active' : ''}`}
                onClick={() => setEvidenceType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Common Fields */}
        <div className="form-group">
          <label htmlFor="case-id">Case ID</label>
          <input
            id="case-id"
            type="number"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="Enter case ID"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Evidence title"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the evidence..."
            rows={4}
            required
          />
        </div>

        {/* Testimony Fields */}
        {evidenceType === 'testimony' && (
          <>
            <div className="form-group">
              <label htmlFor="transcript">Transcript</label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Full testimony transcript..."
                rows={6}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="witness-name">Witness Name (optional)</label>
              <input
                id="witness-name"
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Witness full name"
              />
            </div>
          </>
        )}

        {/* Vehicle Fields */}
        {evidenceType === 'vehicle' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="model">Model</label>
              <input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Vehicle model"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="color">Color</label>
              <input
                id="color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Vehicle color"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="license-plate">License Plate</label>
              <input
                id="license-plate"
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="License plate number"
              />
            </div>
            <div className="form-group">
              <label htmlFor="serial-number">Serial Number</label>
              <input
                id="serial-number"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Vehicle serial/VIN"
              />
            </div>
          </div>
        )}

        {/* ID Document Fields */}
        {evidenceType === 'id_document' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="owner-name">Owner Full Name</label>
              <input
                id="owner-name"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Document owner's full name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="doc-type">Document Type</label>
              <input
                id="doc-type"
                type="text"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder="e.g., National ID, Passport"
              />
            </div>
          </div>
        )}

        {/* File Upload for Testimony & Biological */}
        {(evidenceType === 'testimony' || evidenceType === 'biological') && (
          <div className="form-group">
            <label htmlFor="evidence-files">
              {evidenceType === 'testimony' ? 'Image (optional)' : 'Images (optional)'}
            </label>
            <input
              id="evidence-files"
              type="file"
              accept="image/*"
              multiple={evidenceType === 'biological'}
              onChange={(e) => setFiles(e.target.files)}
              className="file-input"
            />
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Register Evidence'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EvidenceRegister;
