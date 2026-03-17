/**
 * ScoutIntel — main container.
 * Route: /app/scout (via src/pages/ScoutIntel.jsx re-export)
 *
 * Layout: flex row — SystemMap (flex:1) | DepositPanel (260px fixed).
 * "Log Deposit" button top-right of toolbar (inside SystemMap toolbar area).
 *
 * Data loaded on mount:
 *   ScoutDeposit.list('-reported_at', 100)
 *   Material.list('-logged_at', 50)          — for crafting gap analysis
 *   Blueprint.filter({ is_priority: true })   — for gap analysis + op overlay
 *   Op.filter({ status: 'LIVE' }, limit 1)    — for op overlay
 *
 * rank/callsign/discordId from useOutletContext (NexusShell).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';

import SystemMap    from './SystemMap';
import DepositPanel from './DepositPanel';

// ─── Initial filter state ─────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  system:     'ALL',
  material:   'ALL',
  qualityMin: 0,
  staleness:  'ALL',  // ALL | FRESH | WEEK
  heatmap:    false,
  opOverlay:  false,
};

// ─── ScoutIntel ───────────────────────────────────────────────────────────────

export default function ScoutIntel() {
  const ctx = /** @type {any} */ (useOutletContext() || {});
  const rank     = ctx.rank     || 'VAGRANT';
  const callsign = ctx.callsign || 'UNKNOWN';
  const discordId = ctx.discordId || '';

  const [deposits,   setDeposits]   = useState([]);
  const [materials,  setMaterials]  = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [liveOp,     setLiveOp]     = useState(null);
  const [loading,    setLoading]    = useState(true);

  const [filterState,      setFilterState]      = useState(DEFAULT_FILTERS);
  const [panelMode,        setPanelMode]         = useState('default'); // 'default' | 'detail' | 'log'
  const [selectedDeposit,  setSelectedDeposit]  = useState(null);

  // ── Data fetch ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [deps, mats, bps, ops] = await Promise.all([
        base44.entities.ScoutDeposit.list('-reported_at', 100),
        base44.entities.Material.list('-logged_at', 50),
        base44.entities.Blueprint.filter({ is_priority: true }),
        base44.entities.Op.filter({ status: 'LIVE' }),
      ]);
      setDeposits(deps || []);
      setMaterials(mats || []);
      setBlueprints(bps || []);
      setLiveOp(Array.isArray(ops) && ops.length > 0 ? ops[0] : null);
    } catch {
      // load failed — empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filter state partial update ────────────────────────────────────────────

  const handleFilterChange = useCallback((partial) => {
    setFilterState(prev => ({ ...prev, ...partial }));
  }, []);

  // ── Panel callbacks ────────────────────────────────────────────────────────

  const handleSelectDeposit = useCallback((deposit) => {
    setSelectedDeposit(deposit);
    setPanelMode('detail');
  }, []);

  const handleDepositUpdated = useCallback(() => {
    load();
    setSelectedDeposit(null);
    setPanelMode('default');
  }, [load]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 24, height: 24,
          border: '2px solid var(--b3)', borderTopColor: 'var(--acc2)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: map + toolbar */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 12 }}>
        {/* Top action row — Log Deposit button sits top-right of map area */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={() => setPanelMode(panelMode === 'log' ? 'default' : 'log')}
            className="nexus-btn primary"
            style={{
              padding: '5px 12px', fontSize: 10, letterSpacing: '0.07em',
              background: panelMode === 'log' ? 'rgba(var(--live-rgb), 0.08)' : undefined,
              borderColor: panelMode === 'log' ? 'rgba(var(--live-rgb), 0.3)' : undefined,
              color: panelMode === 'log' ? 'var(--live)' : undefined,
            }}
          >
            <Plus size={11} />
            {panelMode === 'log' ? 'CANCEL LOG' : '+ LOG DEPOSIT'}
          </button>
        </div>

        {/* Map (includes toolbar) */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <SystemMap
            deposits={deposits}
            blueprints={blueprints}
            liveOp={liveOp}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onSelectDeposit={handleSelectDeposit}
            selectedDepositId={selectedDeposit?.id}
          />
        </div>
      </div>

      {/* Right: deposit panel */}
      <DepositPanel
        mode={panelMode}
        selectedDeposit={selectedDeposit}
        deposits={deposits}
        materials={materials}
        blueprints={blueprints}
        liveOp={liveOp}
        callsign={callsign}
        rank={rank}
        discordId={discordId}
        onModeChange={setPanelMode}
        onSelectDeposit={setSelectedDeposit}
        onDepositUpdated={handleDepositUpdated}
      />
    </div>
  );
}
