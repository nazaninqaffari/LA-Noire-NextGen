/**
 * Most Wanted Page
 * Public page showing intensive-pursuit suspects with tip submission
 * Ranking formula: max(Lj) · max(Di), Reward: max(Lj) · max(Di) · 20,000,000 Rials
 */
import React, { useEffect, useState } from 'react';
import { getIntensivePursuitSuspects, createTipOff, verifyReward } from '../services/investigation';
import { useNotification } from '../contexts/NotificationContext';
import type { Suspect } from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './MostWanted.css';

const MostWanted: React.FC = () => {
  const { showNotification } = useNotification();
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTipForm, setShowTipForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [tipSuspectId, setTipSuspectId] = useState<number | null>(null);
  const [tipInfo, setTipInfo] = useState('');
  const [submittingTip, setSubmittingTip] = useState(false);

  // Reward verification
  const [rewardCode, setRewardCode] = useState('');
  const [rewardNationalId, setRewardNationalId] = useState('');
  const [rewardResult, setRewardResult] = useState<{ valid: boolean; reward_amount?: number } | null>(null);

  useEffect(() => {
    fetchSuspects();
  }, []);

  const fetchSuspects = async () => {
    try {
      setLoading(true);
      const data = await getIntensivePursuitSuspects();
      // Sort by danger score (highest first)
      const sorted = [...data].sort((a, b) => b.danger_score - a.danger_score);
      setSuspects(sorted);
    } catch {
      showNotification('Failed to load most wanted list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipInfo.trim()) return;

    setSubmittingTip(true);
    try {
      await createTipOff({
        suspect: tipSuspectId ?? undefined,
        information: tipInfo,
      });
      showNotification('Tip submitted successfully. Thank you for your help.', 'success');
      setShowTipForm(false);
      setTipInfo('');
      setTipSuspectId(null);
    } catch {
      showNotification('Failed to submit tip', 'error');
    } finally {
      setSubmittingTip(false);
    }
  };

  const handleVerifyReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await verifyReward({
        redemption_code: rewardCode,
        national_id: rewardNationalId,
      });
      setRewardResult(result);
    } catch {
      showNotification('Invalid reward code or national ID', 'error');
      setRewardResult(null);
    }
  };

  const formatReward = (amount: number): string => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ﷼';
  };

  const getDangerLevel = (score: number): { label: string; className: string } => {
    if (score >= 8) return { label: 'EXTREME', className: 'danger-extreme' };
    if (score >= 6) return { label: 'HIGH', className: 'danger-high' };
    if (score >= 4) return { label: 'MODERATE', className: 'danger-moderate' };
    return { label: 'LOW', className: 'danger-low' };
  };

  if (loading) {
    return (
      <div className="most-wanted-page">
        <div className="wanted-header">
          <h1>Most Wanted</h1>
        </div>
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="most-wanted-page">
      <div className="wanted-header">
        <div className="wanted-seal">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="55" stroke="var(--color-crimson)" strokeWidth="3" fill="none" />
            <circle cx="60" cy="60" r="45" stroke="var(--color-crimson)" strokeWidth="1" fill="none" />
            <text x="60" y="55" textAnchor="middle" fontSize="12" fill="var(--color-crimson)" fontFamily="serif" fontWeight="bold">
              MOST
            </text>
            <text x="60" y="72" textAnchor="middle" fontSize="12" fill="var(--color-crimson)" fontFamily="serif" fontWeight="bold">
              WANTED
            </text>
          </svg>
        </div>
        <h1>Most Wanted Fugitives</h1>
        <p className="wanted-subtitle">
          Los Angeles Police Department — Intensive Pursuit List
        </p>
        <p className="wanted-warning">
          ⚠️ These individuals are considered dangerous. Do not attempt to apprehend.
          If you have information, submit a tip below.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="wanted-actions">
        <button
          className="btn btn-primary"
          onClick={() => { setShowTipForm(!showTipForm); setShowRewardForm(false); }}
        >
          📞 Submit a Tip
        </button>
        <button
          className="btn"
          onClick={() => { setShowRewardForm(!showRewardForm); setShowTipForm(false); }}
        >
          💰 Verify Reward
        </button>
      </div>

      {/* Tip Submission Form */}
      {showTipForm && (
        <div className="card tip-form-card">
          <h3>Submit Anonymous Tip</h3>
          <form onSubmit={handleSubmitTip}>
            <div className="form-group">
              <label htmlFor="tip-suspect">Related Suspect (optional)</label>
              <select
                id="tip-suspect"
                value={tipSuspectId ?? ''}
                onChange={(e) => setTipSuspectId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- General Tip --</option>
                {suspects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.person?.first_name} {s.person?.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tip-info">Your Information</label>
              <textarea
                id="tip-info"
                value={tipInfo}
                onChange={(e) => setTipInfo(e.target.value)}
                placeholder="Describe what you know..."
                rows={4}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submittingTip}>
              {submittingTip ? 'Submitting...' : 'Submit Tip'}
            </button>
          </form>
        </div>
      )}

      {/* Reward Verification Form */}
      {showRewardForm && (
        <div className="card tip-form-card">
          <h3>Verify Reward Code</h3>
          <form onSubmit={handleVerifyReward}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reward-code">Reward Code</label>
                <input
                  id="reward-code"
                  type="text"
                  value={rewardCode}
                  onChange={(e) => setRewardCode(e.target.value)}
                  placeholder="Enter your reward code"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="reward-nid">National ID</label>
                <input
                  id="reward-nid"
                  type="text"
                  value={rewardNationalId}
                  onChange={(e) => setRewardNationalId(e.target.value)}
                  placeholder="Your national ID"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Verify
            </button>
            {rewardResult && (
              <div className={`reward-result ${rewardResult.valid ? 'valid' : 'invalid'}`}>
                {rewardResult.valid
                  ? `✓ Valid! Reward amount: ${formatReward(rewardResult.reward_amount || 0)}`
                  : '✗ Invalid code or national ID.'}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Suspects Grid */}
      {suspects.length === 0 ? (
        <div className="empty-state-large">
          <p>No fugitives currently on intensive pursuit. The streets are safe... for now.</p>
        </div>
      ) : (
        <div className="wanted-grid">
          {suspects.map((suspect, index) => {
            const danger = getDangerLevel(suspect.danger_score);
            return (
              <div key={suspect.id} className={`wanted-card ${danger.className}`}>
                <div className="wanted-rank">#{index + 1}</div>
                <div className="wanted-photo">
                  {suspect.photo ? (
                    <img src={suspect.photo} alt="Suspect" />
                  ) : (
                    <div className="photo-placeholder">
                      <span>👤</span>
                    </div>
                  )}
                </div>
                <div className="wanted-info">
                  <h3 className="wanted-name">
                    {suspect.person?.first_name} {suspect.person?.last_name}
                  </h3>
                  {suspect.case_title && (
                    <div className="wanted-case">Case: {suspect.case_title}</div>
                  )}
                  <div className="wanted-reason">{suspect.reason || 'Under investigation'}</div>
                  <div className="wanted-stats">
                    <div className="danger-meter">
                      <span className="meter-label">Danger Level:</span>
                      <div className="meter-bar">
                        <div
                          className="meter-fill"
                          style={{ width: `${(suspect.danger_score / 10) * 100}%` }}
                        />
                      </div>
                      <span className={`danger-label ${danger.className}`}>{danger.label}</span>
                    </div>
                    <div className="reward-amount">
                      <span className="reward-label">Reward:</span>
                      <span className="reward-value">{formatReward(suspect.reward_amount)}</span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-tip"
                  onClick={() => {
                    setTipSuspectId(suspect.id);
                    setShowTipForm(true);
                    setShowRewardForm(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Submit Tip
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MostWanted;
