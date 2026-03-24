/**
 * DepositPanel — right rail, 260px.
 * Props: {
 *   mode: 'default' | 'detail' | 'log',
 *   selectedDeposit, deposits, materials, blueprints, liveOp,
 *   callsign, rank,
 *   onModeChange, onSelectDeposit, onDepositUpdated,
 * }
 *
 * MODE default: top 5 deposits, crafting gaps, scout leaderboard.
 * MODE detail:  deposit detail, confirm/stale votes, plan run, log to op.
 * MODE log:     LogForm rendered by parent (panel header + back arrow only).
 */
import React from 'react';
import LogForm from './LogForm';
import { DefaultMode, DetailMode } from './DepositPanelModes';

// ─── DepositPanel ─────────────────────────────────────────────────────────────

export default function DepositPanel({
  mode,
  selectedDeposit,
  deposits = [],
  materials = [],
  blueprints = [],
  liveOp,
  callsign,
  rank,
  onModeChange,
  onSelectDeposit,
  onDepositUpdated,
}) {
  const handleSelect = (deposit) => {
    onSelectDeposit(deposit);
    onModeChange('detail');
  };

  return (
    <div style={{
      width: 260, flexShrink: 0,
      background: 'var(--bg0)',
      borderLeft: '0.5px solid var(--b0)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {mode === 'log' ? (
          <LogForm
            callsign={callsign}
            onSubmit={() => { onDepositUpdated(); onModeChange('default'); }}
            onCancel={() => onModeChange('default')}
          />
        ) : mode === 'detail' && selectedDeposit ? (
          <DetailMode
            deposit={selectedDeposit}
            liveOp={liveOp}
            callsign={callsign}
            onBack={() => onModeChange('default')}
            onDepositUpdated={onDepositUpdated}
          />
        ) : (
          <DefaultMode
            deposits={deposits}
            materials={materials}
            blueprints={blueprints}
            onSelectDeposit={handleSelect}
          />
        )}
      </div>
    </div>
  );
}
