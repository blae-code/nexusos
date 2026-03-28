/**
 * ShipMissionReadiness — computes and visualizes how well a ship's equipment
 * loadout matches specific mission types. Scores 0-100 per mission category.
 */
import React, { useMemo } from 'react';
import { Crosshair, Pickaxe, Package, Wrench, Compass, HeartPulse } from 'lucide-react';

const MISSION_TYPES = [
  { id: 'combat',      label: 'COMBAT',      icon: Crosshair,  color: '#C0392B' },
  { id: 'mining',      label: 'MINING',      icon: Pickaxe,    color: '#C8A84B' },
  { id: 'hauling',     label: 'HAULING',     icon: Package,    color: '#5D9CEC' },
  { id: 'salvage',     label: 'SALVAGE',     icon: Wrench,     color: '#4A8C5C' },
  { id: 'exploration', label: 'EXPLORATION', icon: Compass,    color: '#9DA1CD' },
  { id: 'medical',     label: 'MEDICAL',     icon: HeartPulse, color: '#FF6B35' },
];

const CLASS_MISSION_BASE = {
  FIGHTER:        { combat: 70, mining: 0,  hauling: 5,  salvage: 0,  exploration: 15, medical: 0 },
  HEAVY_FIGHTER:  { combat: 80, mining: 0,  hauling: 10, salvage: 0,  exploration: 10, medical: 0 },
  MINER:          { combat: 5,  mining: 70, hauling: 20, salvage: 10, exploration: 10, medical: 0 },
  HAULER:         { combat: 5,  mining: 5,  hauling: 70, salvage: 10, exploration: 15, medical: 5 },
  SALVAGER:       { combat: 5,  mining: 10, hauling: 20, salvage: 70, exploration: 10, medical: 0 },
  MEDICAL:        { combat: 5,  mining: 0,  hauling: 5,  salvage: 0,  exploration: 10, medical: 70 },
  EXPLORER:       { combat: 15, mining: 10, hauling: 15, salvage: 10, exploration: 70, medical: 5 },
  GROUND_VEHICLE: { combat: 20, mining: 20, hauling: 10, salvage: 10, exploration: 20, medical: 5 },
  OTHER:          { combat: 10, mining: 10, hauling: 10, salvage: 10, exploration: 10, medical: 5 },
};

function computeScores(ship) {
  const loadout = ship.equipment_loadout || [];
  const base = CLASS_MISSION_BASE[ship.class] || CLASS_MISSION_BASE.OTHER;
  const scores = { ...base };

  // Equipment boosts
  loadout.forEach(slot => {
    const cat = (slot.category || slot.slot_name || '').toLowerCase();
    const hasItem = Boolean(slot.equipped_name);
    const sizeBonus = Math.min((slot.slot_size || 1) * 2, 10);

    if (cat.includes('weapon') || cat.includes('turret') || cat.includes('gun') || cat.includes('missile')) {
      if (hasItem) { scores.combat += sizeBonus; }
    } else if (cat.includes('mining') || cat.includes('drill') || cat.includes('laser')) {
      if (hasItem) { scores.mining += sizeBonus + 5; }
    } else if (cat.includes('salvage') || cat.includes('tractor')) {
      if (hasItem) { scores.salvage += sizeBonus + 5; }
    } else if (cat.includes('quantum') || cat.includes('jump')) {
      if (hasItem) { scores.exploration += Math.ceil(sizeBonus / 2); scores.hauling += 2; }
    } else if (cat.includes('shield')) {
      if (hasItem) { scores.combat += Math.ceil(sizeBonus / 2); scores.hauling += 2; }
    } else if (cat.includes('power')) {
      if (hasItem) { scores.combat += 1; scores.mining += 1; scores.hauling += 1; }
    } else if (cat.includes('cool')) {
      if (hasItem) { scores.combat += 1; scores.mining += 1; }
    } else if (cat.includes('medical') || cat.includes('med')) {
      if (hasItem) { scores.medical += sizeBonus + 10; }
    } else if (cat.includes('util')) {
      if (hasItem) { scores.exploration += 3; }
    }

    // Penalty for empty slots
    if (!hasItem && slot.status !== 'stock') {
      const penalty = Math.ceil(sizeBonus / 2);
      Object.keys(scores).forEach(k => { scores[k] = Math.max(0, scores[k] - penalty); });
    }
  });

  // Cargo SCU boosts hauling
  if (ship.cargo_scu > 0) {
    scores.hauling += Math.min(Math.floor(ship.cargo_scu / 20), 15);
  }

  // Cap at 100
  Object.keys(scores).forEach(k => { scores[k] = Math.min(100, Math.round(scores[k])); });

  return scores;
}

function ScoreBar({ mission, score }) {
  const Icon = mission.icon;
  const barColor = score >= 70 ? 'var(--live)' : score >= 40 ? mission.color : 'var(--t3)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 20, display: 'flex', justifyContent: 'center' }}>
        <Icon size={11} style={{ color: mission.color }} />
      </div>
      <span style={{ width: 80, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.06em' }}>{mission.label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${score}%`, height: '100%', borderRadius: 3,
          background: barColor, transition: 'width 300ms ease',
        }} />
      </div>
      <span style={{ width: 28, textAlign: 'right', color: barColor, fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {score}
      </span>
    </div>
  );
}

export default function ShipMissionReadiness({ ship }) {
  const scores = useMemo(() => {
    // Use persisted if available, otherwise compute
    if (ship.mission_readiness && Object.keys(ship.mission_readiness).length > 0) {
      return ship.mission_readiness;
    }
    return computeScores(ship);
  }, [ship]);

  const bestMission = useMemo(() => {
    let best = { id: 'combat', score: 0 };
    Object.entries(scores).forEach(([k, v]) => { if (v > best.score) best = { id: k, score: v }; });
    return best;
  }, [scores]);

  const bestCfg = MISSION_TYPES.find(m => m.id === bestMission.id) || MISSION_TYPES[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Best fit banner */}
      <div style={{
        padding: '8px 12px', borderRadius: 'var(--r-sm)',
        background: `${bestCfg.color}0A`, borderLeft: `3px solid ${bestCfg.color}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <bestCfg.icon size={14} style={{ color: bestCfg.color }} />
        <div>
          <div style={{ color: bestCfg.color, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}>
            BEST FIT: {bestCfg.label}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 1 }}>
            Score {bestMission.score}/100 based on class + equipped loadout
          </div>
        </div>
      </div>

      {/* All bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '0 4px' }}>
        {MISSION_TYPES.map(m => (
          <ScoreBar key={m.id} mission={m} score={scores[m.id] || 0} />
        ))}
      </div>
    </div>
  );
}

export { computeScores };