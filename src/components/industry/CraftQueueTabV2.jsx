import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, AlertCircle } from 'lucide-react';
import NexusToken from '@/components/ui/NexusToken';
import { T } from '@/lib/tokenMap';

const STATUS_COLOURS = {
  OPEN:        'var(--info)',
  CLAIMED:     'var(--warn)',
  IN_PROGRESS: 'var(--live)',
  COMPLETE:    'var(--t1)',
  CANCELLED:   'var(--danger)',
};

const STATUS_ORDER = ['OPEN', 'CLAIMED', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED'];

export default function CraftQueueTabV2({ craftQueue, callsign, onRefresh }) {
  const grouped = useMemo(() => {
    const groups = {};
    STATUS_ORDER.forEach(status => { groups[status] = []; });
    (craftQueue || []).forEach(item => {
      if (groups[item.status]) groups[item.status].push(item);
    });
    return groups;
  }, [craftQueue]);

  const handleClaim = async (id, item) => {
    await base44.entities.CraftQueue.update(id, {
      status: 'CLAIMED',
      claimed_by_callsign: callsign,
    });
    onRefresh();
  };

  const handleStart = async (id) => {
    await base44.entities.CraftQueue.update(id, { status: 'IN_PROGRESS' });
    onRefresh();
  };

  const handleComplete = async (id) => {
    await base44.entities.CraftQueue.update(id, { status: 'COMPLETE' });
    onRefresh();
  };

  const handleCancel = async (id) => {
    await base44.entities.CraftQueue.update(id, { status: 'CANCELLED' });
    onRefresh();
  };

  const renderStatus = (status, count) => {
    if (count === 0) return null;
    return (
      <div key={status} style={{ marginBottom: 20 }}>
        <div style={{
          color: STATUS_COLOURS[status],
          fontSize: 10,
          letterSpacing: '0.12em',
          marginBottom: 10,
          fontWeight: 500,
          textTransform: 'uppercase',
        }}>
          {status} ({count})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {grouped[status].map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg1)',
                border: '0.5px solid var(--b0)',
                borderRadius: 6,
                padding: 10,
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto auto auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: 'var(--t0)', fontSize: 11, marginBottom: 2 }}>
                  {item.blueprint_name}
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 9 }}>
                  Requested by {item.requested_by_callsign || '—'}
                </div>
              </div>
              <div style={{ color: 'var(--t1)', fontSize: 10 }}>
                {item.claimed_by_callsign || (
                  <span style={{ color: 'var(--t2)' }}>UNCLAIMED</span>
                )}
              </div>
              <div style={{ color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
                ×{item.quantity || 1}
              </div>
              <div style={{ color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
                {item.aUEC_value_est ? `${item.aUEC_value_est.toLocaleString()}` : '—'}
              </div>
              {item.priority_flag && (
                <div style={{ color: 'var(--warn)' }}>
                  <AlertCircle size={12} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 3 }}>
                {status === 'OPEN' && (
                  <button className="nexus-btn" onClick={() => handleClaim(item.id, item)} style={{ padding: '4px 8px', fontSize: 9 }}>
                    Claim
                  </button>
                )}
                {status === 'CLAIMED' && (
                  <button className="nexus-btn" onClick={() => handleStart(item.id)} style={{ padding: '4px 8px', fontSize: 9 }}>
                    Start
                  </button>
                )}
                {status === 'IN_PROGRESS' && (
                  <button className="nexus-btn" onClick={() => handleComplete(item.id)} style={{ padding: '4px 8px', fontSize: 9, background: 'rgba(39,201,106,0.1)', borderColor: 'var(--live)' }}>
                    ✓
                  </button>
                )}
                {status !== 'COMPLETE' && status !== 'CANCELLED' && (
                  <button className="nexus-btn" onClick={() => handleCancel(item.id)} style={{ padding: '4px 8px', fontSize: 9 }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)' }}>
        <button className="nexus-btn" style={{ padding: '6px 12px', fontSize: 10 }}>
          <Plus size={10} style={{ marginRight: 4 }} /> Add to Queue
        </button>
      </div>

      {/* Queue Groups */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {STATUS_ORDER.map(status => renderStatus(status, grouped[status].length))}
        {Object.values(grouped).every(g => g.length === 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 12 }}>
            <NexusToken src={T('square-grey')} size={40} opacity={0.25} alt="Empty craft queue" />
            <span style={{ color: 'var(--t2)', fontSize: 13 }}>Craft queue is empty</span>
            <span style={{ color: 'var(--t3)', fontSize: 11 }}>Queue a blueprint from the Blueprints tab to begin crafting</span>
          </div>
        )}
      </div>
    </div>
  );
}