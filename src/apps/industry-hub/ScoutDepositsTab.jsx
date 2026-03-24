import React from 'react';
import { base44 } from '@/core/data/base44Client';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { qualityPercentFromRecord } from '@/core/data/quality';

const RISK_COLOURS = {
  LOW:     'var(--live)',
  MEDIUM:  'var(--warn)',
  HIGH:    '#ff6b35',
  EXTREME: 'var(--danger)',
};

const VOLUME_COLOURS = {
  SMALL:    'var(--t2)',
  MEDIUM:   'var(--info)',
  LARGE:    'var(--warn)',
  MASSIVE:  'var(--danger)',
};

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ScoutDepositsTab({ deposits, onRefresh }) {
  const handleVote = async (id, voteType) => {
    const deposit = deposits.find(d => d.id === id);
    if (!deposit) return;
    
    const updates = voteType === 'confirmed'
      ? { confirmed_votes: (deposit.confirmed_votes || 0) + 1 }
      : { stale_votes: (deposit.stale_votes || 0) + 1 };
    
    await base44.entities.ScoutDeposit.update(id, updates);
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)' }}>
        <button className="nexus-btn" style={{ padding: '6px 12px', fontSize: 10 }}>
          + Report Deposit
        </button>
      </div>

      {/* Card Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {(deposits || []).map(deposit => {
            const quality = qualityPercentFromRecord(deposit);
            const riskColor = RISK_COLOURS[deposit.risk_level] || 'var(--t2)';
            const volColor = VOLUME_COLOURS[deposit.volume_estimate] || 'var(--t2)';
            
            return (
              <div
                key={deposit.id}
                style={{
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                {/* Title */}
                <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                  {deposit.material_name}
                </div>

                {/* Location */}
                <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 8 }}>
                  {deposit.system_name}{deposit.location_detail ? ` · ${deposit.location_detail}` : ''}
                </div>

                {/* Quality Progress */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                    <div style={{ width: `${quality}%`, height: '100%', background: quality >= 80 ? 'var(--live)' : 'var(--warn)' }} />
                  </div>
                  <div style={{ color: 'var(--t1)', fontSize: 9, fontFamily: 'monospace' }}>
                    {quality.toFixed(0)}%
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    color: volColor,
                    background: `${volColor}22`,
                    border: `0.5px solid ${volColor}55`,
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 8,
                  }}>
                    {deposit.volume_estimate || 'UNKNOWN'}
                  </span>
                  <span style={{
                    color: riskColor,
                    background: `${riskColor}22`,
                    border: `0.5px solid ${riskColor}55`,
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 8,
                  }}>
                    {deposit.risk_level || 'UNKNOWN'} RISK
                  </span>
                </div>

                {/* Reporter & Timestamp */}
                <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 8 }}>
                  Reported by {deposit.reported_by_callsign || '—'} {relativeTime(deposit.reported_at)}
                </div>

                {/* Vote counters */}
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--t1)' }}>
                  <button
                    onClick={() => handleVote(deposit.id, 'confirmed')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: 'var(--live)' }}
                  >
                    <ThumbsUp size={11} /> {deposit.confirmed_votes || 0}
                  </button>
                  <button
                    onClick={() => handleVote(deposit.id, 'stale')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: 'var(--warn)' }}
                  >
                    <ThumbsDown size={11} /> {deposit.stale_votes || 0}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {(deposits || []).length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 40 }}>
            No scout deposits. Report one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
