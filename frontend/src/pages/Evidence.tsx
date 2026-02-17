/**
 * Evidence Page
 * Browse, register, and manage all evidence types
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import {
  getTestimonies,
  getBiologicalEvidence,
  getVehicleEvidence,
  getIDDocuments,
  getGenericEvidence,
} from '../services/evidence';
import type {
  Testimony,
  BiologicalEvidence,
  VehicleEvidence,
  IDDocument,
  GenericEvidence,
} from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './Evidence.css';

type EvidenceTab = 'testimonies' | 'biological' | 'vehicles' | 'documents' | 'generic';

const Evidence: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotification();

  const activeTab = (searchParams.get('tab') as EvidenceTab) || 'testimonies';
  const caseFilter = searchParams.get('case') ? Number(searchParams.get('case')) : undefined;

  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [biologicals, setBiologicals] = useState<BiologicalEvidence[]>([]);
  const [vehicles, setVehicles] = useState<VehicleEvidence[]>([]);
  const [documents, setDocuments] = useState<IDDocument[]>([]);
  const [generics, setGenerics] = useState<GenericEvidence[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs: { key: EvidenceTab; label: string; icon: string }[] = [
    { key: 'testimonies', label: 'Testimonies', icon: '🗣️' },
    { key: 'biological', label: 'Biological', icon: '🧬' },
    { key: 'vehicles', label: 'Vehicles', icon: '🚗' },
    { key: 'documents', label: 'ID Documents', icon: '📄' },
    { key: 'generic', label: 'Other Evidence', icon: '📦' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = caseFilter ? { case: caseFilter } : {};
      switch (activeTab) {
        case 'testimonies': {
          const res = await getTestimonies(params);
          setTestimonies(res.results);
          break;
        }
        case 'biological': {
          const res = await getBiologicalEvidence(params);
          setBiologicals(res.results);
          break;
        }
        case 'vehicles': {
          const res = await getVehicleEvidence(params);
          setVehicles(res.results);
          break;
        }
        case 'documents': {
          const res = await getIDDocuments(params);
          setDocuments(res.results);
          break;
        }
        case 'generic': {
          const res = await getGenericEvidence(params);
          setGenerics(res.results);
          break;
        }
      }
    } catch {
      showNotification('Failed to load evidence', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, caseFilter, showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const switchTab = (tab: EvidenceTab) => {
    const params: Record<string, string> = { tab };
    if (caseFilter) params.case = String(caseFilter);
    setSearchParams(params);
  };

  const renderTestimonies = () => (
    <div className="evidence-grid">
      {testimonies.length === 0 ? (
        <p className="empty-state">No testimonies recorded.</p>
      ) : (
        testimonies.map((t) => (
          <div key={t.id} className="evidence-card">
            <div className="evidence-card-header">
              <span className="evidence-type-badge testimony">Testimony</span>
              <span className="evidence-date">{new Date(t.recorded_at).toLocaleDateString()}</span>
            </div>
            <h3 className="evidence-title">{t.title}</h3>
            <p className="evidence-desc">{t.description}</p>
            {t.witness_name && (
              <div className="evidence-meta">
                <span>Witness: {t.witness_name}</span>
              </div>
            )}
            <div className="evidence-footer">
              <span>Recorded by: {t.recorded_by?.username ?? 'Unknown'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderBiological = () => (
    <div className="evidence-grid">
      {biologicals.length === 0 ? (
        <p className="empty-state">No biological evidence recorded.</p>
      ) : (
        biologicals.map((b) => (
          <div key={b.id} className="evidence-card">
            <div className="evidence-card-header">
              <span className="evidence-type-badge biological">Biological</span>
              <span className={`verify-badge ${b.verified_by_coroner ? 'verified' : 'pending'}`}>
                {b.verified_by_coroner ? '✓ Verified' : '⏳ Pending'}
              </span>
            </div>
            <h3 className="evidence-title">{b.title}</h3>
            <p className="evidence-desc">{b.description}</p>
            {b.coroner_analysis && (
              <div className="evidence-analysis">
                <strong>Coroner Analysis:</strong> {b.coroner_analysis}
              </div>
            )}
            {b.images && b.images.length > 0 && (
              <div className="evidence-images">
                {b.images.map((img) => (
                  <img key={img.id} src={img.image} alt={img.caption || 'Evidence'} className="evidence-thumb" />
                ))}
              </div>
            )}
            <div className="evidence-footer">
              <span>Recorded by: {b.recorded_by?.username ?? 'Unknown'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderVehicles = () => (
    <div className="evidence-grid">
      {vehicles.length === 0 ? (
        <p className="empty-state">No vehicle evidence recorded.</p>
      ) : (
        vehicles.map((v) => (
          <div key={v.id} className="evidence-card">
            <div className="evidence-card-header">
              <span className="evidence-type-badge vehicle">Vehicle</span>
            </div>
            <h3 className="evidence-title">{v.title}</h3>
            <p className="evidence-desc">{v.description}</p>
            <div className="evidence-details">
              <div className="detail-row"><strong>Model:</strong> {v.model}</div>
              <div className="detail-row"><strong>Color:</strong> {v.color}</div>
              {v.license_plate && <div className="detail-row"><strong>Plate:</strong> {v.license_plate}</div>}
              {v.serial_number && <div className="detail-row"><strong>Serial:</strong> {v.serial_number}</div>}
            </div>
            <div className="evidence-footer">
              <span>Recorded by: {v.recorded_by?.username ?? 'Unknown'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="evidence-grid">
      {documents.length === 0 ? (
        <p className="empty-state">No ID documents recorded.</p>
      ) : (
        documents.map((d) => (
          <div key={d.id} className="evidence-card">
            <div className="evidence-card-header">
              <span className="evidence-type-badge document">ID Document</span>
            </div>
            <h3 className="evidence-title">{d.title}</h3>
            <p className="evidence-desc">{d.description}</p>
            <div className="evidence-details">
              <div className="detail-row"><strong>Owner:</strong> {d.owner_full_name}</div>
              {d.document_type && <div className="detail-row"><strong>Type:</strong> {d.document_type}</div>}
              {Object.entries(d.attributes || {}).map(([k, v]) => (
                <div key={k} className="detail-row"><strong>{k}:</strong> {v}</div>
              ))}
            </div>
            <div className="evidence-footer">
              <span>Recorded by: {d.recorded_by?.username ?? 'Unknown'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderGeneric = () => (
    <div className="evidence-grid">
      {generics.length === 0 ? (
        <p className="empty-state">No other evidence recorded.</p>
      ) : (
        generics.map((g) => (
          <div key={g.id} className="evidence-card">
            <div className="evidence-card-header">
              <span className="evidence-type-badge generic">Evidence</span>
            </div>
            <h3 className="evidence-title">{g.title}</h3>
            <p className="evidence-desc">{g.description}</p>
            <div className="evidence-footer">
              <span>Recorded by: {g.recorded_by?.username ?? 'Unknown'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) return <LoadingSkeleton variant="card" />;
    switch (activeTab) {
      case 'testimonies': return renderTestimonies();
      case 'biological': return renderBiological();
      case 'vehicles': return renderVehicles();
      case 'documents': return renderDocuments();
      case 'generic': return renderGeneric();
    }
  };

  return (
    <div className="evidence-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Evidence Locker</h1>
          <p className="page-subtitle">
            Manage and review all case evidence
            {caseFilter && <span className="filter-indicator"> — Case #{caseFilter}</span>}
          </p>
        </div>
        <div className="page-actions">
          <Link to="/evidence/register" className="btn btn-primary">
            + Register Evidence
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="evidence-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => switchTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default Evidence;
