import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';
import RefineryEfficiencyCalculator from '@/components/industry/RefineryEfficiencyCalculator';
import { OptimisedRow, DefaultRow } from './CraftQueueRows';

// ── Main export ───────────────────────────────────────────────────────────────
export default function CraftQueueTab({ craftQueue, callsign, materials = [], blueprints = [] }) {
  const [optimising, setOptimising]         = useState(false);
  const [suggestedOrder, setSuggestedOrder] = useState(null); // null = off, [] = loaded
  const [optimiseError, setOptimiseError]   = useState('');

  const statusOrder = { IN_PROGRESS: 0, CLAIMED: 1, OPEN: 2, COMPLETE: 3, CANCELLED: 4 };

  // Default sort for non-optimised view
  const defaultSorted = [...craftQueue].sort((a, b) => {
    if (b.priority_flag !== a.priority_flag) return b.priority_flag ? 1 : -1;
    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
  });

  // Build a lookup map from blueprint_id / queue_id → original queue item
  const queueById = {};
  craftQueue.forEach(c => { queueById[c.id] = c; });

  const handleOptimise = async () => {
    setOptimising(true);
    setOptimiseError('');
    setSuggestedOrder(null);
    try {
      const res = await base44.functions.invoke('craftingOptimiser', {
        materials: materials || [],
        blueprints: blueprints || [],
        craftQueue: craftQueue || [],
      });

      if (res.data.error) {
        setOptimiseError(res.data.error);
      } else {
        // Map optimization results back to queue items by ID
        const optimizedIds = res.data.optimized_sequence.map(item => item.request_id);
        const reordered = optimizedIds
          .map(id => craftQueue.find(c => c.id === id))
          .filter(Boolean);
        setSuggestedOrder(reordered);
      }
    } catch (e) {
      setOptimiseError(e.message || 'Optimiser unavailable');
    }
    setOptimising(false);
  };

  const handleClearSuggestion = () => {
    setSuggestedOrder(null);
    setOptimiseError('');
  };

  const handleClaim = async (id) => {
    await base44.entities.CraftQueue.update(id, {
      status: 'CLAIMED',
      claimed_by_callsign: callsign,
    });
  };

  const isOptimised = suggestedOrder !== null && suggestedOrder.length > 0;
  const openCount   = craftQueue.filter(c => c.status === 'OPEN').length;

  // Build display rows for optimised view:
  // suggestedOrder gives us the rank/reason/feasibility metadata;
  // we match back to the full craftQueue item by queue_id
  const optimisedRows = isOptimised
    ? suggestedOrder.map(rec => ({
        rec,
        original: queueById[rec.queue_id] || craftQueue.find(c => c.blueprint_name === rec.blueprint_name) || null,
      })).filter(r => r.original)
    : [];

  // Any queue items NOT in the suggestion (e.g. already CLAIMED/IN_PROGRESS)
  const suggestedIds = new Set(optimisedRows.map(r => r.original?.id).filter(Boolean));
  const remainingRows = isOptimised
    ? craftQueue.filter(c => !suggestedIds.has(c.id) && !['COMPLETE', 'CANCELLED'].includes(c.status))
    : [];

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Refinery Calculator */}
      <RefineryEfficiencyCalculator />

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Optimise button */}
        {!isOptimised ? (
          <button
            onClick={handleOptimise}
            disabled={optimising || openCount === 0}
            className="nexus-btn"
            style={{
              padding: '6px 14px',
              fontSize: 11,
              borderColor: optimising ? 'var(--b2)' : 'rgba(74,143,208,0.4)',
              color: optimising ? 'var(--t2)' : 'var(--info)',
              background: optimising ? 'var(--bg2)' : 'rgba(74,143,208,0.06)',
              opacity: openCount === 0 ? 0.4 : 1,
            }}
          >
            <Zap size={11} style={{ flexShrink: 0 }} />
            {optimising ? 'ANALYSING...' : 'OPTIMISE ORDER'}
          </button>
        ) : (
          <button
            onClick={handleClearSuggestion}
            className="nexus-btn"
            style={{ padding: '6px 14px', fontSize: 11 }}
          >
            CLEAR SUGGESTION
          </button>
        )}

        {/* Mode indicator */}
        {isOptimised && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--info)',
            fontSize: 10,
            letterSpacing: '0.08em',
          }}>
            <Zap size={10} />
            SUGGESTED ORDER ACTIVE
          </span>
        )}

        {optimiseError && (
          <span style={{ color: 'var(--warn)', fontSize: 10 }}>{optimiseError}</span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {/* rank, dot, item, req-by, claimed-by, qty, value, priority, feasibility, status, action */}
              {['#', '', 'ITEM', 'REQUESTED BY', 'CLAIMED BY', 'QTY', 'EST. VALUE',
                ...(isOptimised ? ['PRIORITY', 'FEASIBILITY'] : []),
                'STATUS', 'ACTION',
              ].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '8px 14px',
                    textAlign: 'left',
                    color: 'var(--t2)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                    borderBottom: '0.5px solid var(--b1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Optimised view */}
            {isOptimised && optimisedRows.map(({ rec, original }, idx) => (
              <OptimisedRow
                key={original?.id || idx}
                item={rec}
                rank={idx + 1}
                original={original}
                onClaim={handleClaim}
                callsign={callsign}
              />
            ))}

            {/* Remaining (non-OPEN) items not in suggestion */}
            {isOptimised && remainingRows.map(item => (
              <DefaultRow key={item.id} item={item} onClaim={handleClaim} />
            ))}

            {/* Default view */}
            {!isOptimised && defaultSorted.map(c => (
              <DefaultRow key={c.id} item={c} onClaim={handleClaim} />
            ))}

            {craftQueue.length === 0 && (
              <tr>
                <td
                  colSpan={isOptimised ? 11 : 9}
                  style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}
                >
                  Craft queue is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
