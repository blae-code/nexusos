/**
 * OpPlanningStep — Type-specific planning panel for all op types.
 * Step 1 in the wizard for every operation type.
 * Provides pre-generated SC game data: minerals, factions, routes, threats, blueprints.
 */
import React, { useState, useMemo } from 'react';
import {
  SC_FACTIONS, SC_BLUEPRINTS, BLUEPRINT_CATEGORIES, ACQUISITION_METHODS, REP_TIERS,
  OP_TYPE_PLANS,
  getFactionById, getBlueprintsByCategory, getBlueprintLocations, getBlueprintFactions,
  getSystemForLocation, estimateMissions,
} from './scGameData';

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const DIFF_COLORS = {
  EASY: '#4A8C5C', MEDIUM: '#C8A84B', HARD: '#C0392B', VERY_HARD: '#9B59B6',
  HIGH_RISK: '#E04848', VARIABLE: '#9A9488', EXTREME: '#C0392B',
};
const RISK_COLORS = {
  LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#E04848', VERY_HIGH: '#C0392B', EXTREME: '#C0392B',
};
const RARITY_COLORS = {
  COMMON: '#5A5850', UNCOMMON: '#7AAECC', RARE: '#C8A84B', VERY_RARE: '#9B59B6',
};

function Tag({ label, color = '#5A5850' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 2,
      border: `0.5px solid ${color}44`, background: `${color}12`,
      color, fontSize: 9, letterSpacing: '0.1em',
      fontFamily: 'inherit', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{
        color: 'var(--t3)', fontSize: 9, letterSpacing: '0.16em',
        textTransform: 'uppercase', fontFamily: 'inherit', whiteSpace: 'nowrap',
      }}>{children}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0', borderBottom: '0.5px solid var(--b0)' }}>
      <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 100, fontFamily: 'inherit' }}>{label}</span>
      <span style={{ fontSize: 11, color: color || 'var(--t1)', fontFamily: 'inherit' }}>{value}</span>
    </div>
  );
}

function SelectableRow({ label, sublabel, tags = [], isSelected, onToggle, accentColor = '#C8A84B' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', cursor: 'pointer', borderRadius: 2, width: '100%', textAlign: 'left',
        background: isSelected ? `${accentColor}0a` : 'transparent',
        border: `0.5px solid ${isSelected ? accentColor + '44' : 'rgba(200,170,100,0.05)'}`,
        transition: 'all 140ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: isSelected ? accentColor : '#2A2A28',
          boxShadow: isSelected ? `0 0 5px ${accentColor}` : 'none',
          transition: 'all 140ms',
        }} />
        <div>
          <div style={{ fontSize: 11, color: isSelected ? '#E8E4DC' : '#7A7870', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em' }}>{label}</div>
          {sublabel && <div style={{ fontSize: 9, color: '#4A4840', fontFamily: 'inherit', marginTop: 1 }}>{sublabel}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{tags}</div>
    </button>
  );
}

// ─── MINING ───────────────────────────────────────────────────────────────────

function MiningPlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.MINING;
  const toggle = (field, id) => {
    const cur = data[field] || [];
    onChange({ ...data, [field]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };

  const impliedLocations = useMemo(() => {
    const selected = plan.minerals.filter(m => (data.minerals || []).includes(m.id));
    return [...new Set(selected.flatMap(m => m.locations))];
  }, [data.minerals]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Target Minerals</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.minerals.map(m => (
            <SelectableRow
              key={m.id} label={m.name}
              sublabel={`${m.aUEC_per_SCU.toLocaleString()} aUEC/SCU · ${m.notes}`}
              tags={[<Tag key="r" label={m.rarity} color={RARITY_COLORS[m.rarity]} />]}
              isSelected={(data.minerals || []).includes(m.id)}
              onToggle={() => toggle('minerals', m.id)}
              accentColor={m.color}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Ship Configuration</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
          {plan.ships.map(s => {
            const isOn = data.ship === s.id;
            return (
              <button key={s.id} type="button" onClick={() => onChange({ ...data, ship: s.id })} style={{
                padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                background: isOn ? 'rgba(122,174,204,0.08)' : '#0C0C0A',
                border: `0.5px solid ${isOn ? '#7AAECC55' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isOn ? '2px solid #7AAECC' : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 140ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isOn ? '#7AAECC' : '#C8C4BC' }}>{s.name}</span>
                  <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{s.manufacturer}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
                  <Tag label={`${s.crew} crew`} color="#9A9488" />
                  <Tag label={`${s.cargoSCU} SCU`} color="#7AAECC" />
                  {s.recommended && <Tag label="Recommended" color="#4A8C5C" />}
                </div>
                <div style={{ fontSize: 9, color: '#4A4840', fontFamily: 'inherit', lineHeight: 1.4 }}>{s.pros}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Mining Lasers</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {plan.lasers.map(l => (
            <div key={l.name} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <Tag label={l.size} color="#5A5850" />
              <span style={{ fontSize: 11, color: '#C8C4BC', fontFamily: "'Barlow Condensed', sans-serif", minWidth: 120 }}>{l.name}</span>
              <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{l.use}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Refinery Target</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {plan.refineries.map(r => (
            <button key={r.name} type="button" onClick={() => { onChange({ ...data, refinery: r.name }); }}
              style={{
                padding: '5px 12px', cursor: 'pointer', borderRadius: 2,
                background: data.refinery === r.name ? 'rgba(200,170,100,0.10)' : '#0F0F0D',
                border: `0.5px solid ${data.refinery === r.name ? 'rgba(200,170,100,0.3)' : 'rgba(200,170,100,0.07)'}`,
                color: data.refinery === r.name ? '#C8C4BC' : '#5A5850',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                letterSpacing: '0.06em', transition: 'all 140ms',
              }}>{r.name} <span style={{ color: '#3A3830' }}>·</span> {r.system}</button>
          ))}
        </div>
      </div>

      {impliedLocations.length > 0 && (
        <div style={{ padding: '10px 12px', background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2 }}>
          <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 6, fontFamily: 'inherit' }}>SUGGESTED LOCATIONS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {impliedLocations.map(loc => (
              <button key={loc} type="button"
                onClick={() => onChange({ ...data, primaryLocation: loc })}
                style={{
                  padding: '3px 9px', cursor: 'pointer', borderRadius: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  background: data.primaryLocation === loc ? 'rgba(200,170,100,0.1)' : '#0F0F0D',
                  border: `0.5px solid ${data.primaryLocation === loc ? 'rgba(200,170,100,0.3)' : 'rgba(200,170,100,0.07)'}`,
                  color: data.primaryLocation === loc ? '#C8C4BC' : '#7A7870',
                  transition: 'all 140ms',
                }}>{loc}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROCKBREAKER ──────────────────────────────────────────────────────────────

function RockbreakerPlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.ROCKBREAKER;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Target Deposit</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.deposits.map(d => (
            <SelectableRow
              key={d.id} label={d.name}
              sublabel={`${d.yieldSCU} · ${d.notes}`}
              tags={[<Tag key="r" label={d.risk.replace('_', ' ')} color={RISK_COLORS[d.risk] || '#9A9488'} />, <Tag key="s" label={d.system} color="#5A5850" />]}
              isSelected={data.deposit === d.id}
              onToggle={() => onChange({ ...data, deposit: d.id, primaryLocation: d.locations?.[0] || data.primaryLocation })}
              accentColor={RISK_COLORS[d.risk] || '#7AAECC'}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Lens Crafting Requirements</SectionLabel>
        <div style={{ padding: '10px 12px', background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2 }}>
          <div style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit', marginBottom: 8 }}>{plan.notes}</div>
          {plan.lensRecipe.map(r => (
            <div key={r.material} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#C8A84B', minWidth: 90 }}>{r.material}</span>
              <span style={{ fontSize: 10, color: '#9A9488', fontFamily: 'inherit' }}>{r.quantityPerLens}</span>
              <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>Source: {r.source}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Crew Roles</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {plan.crewRoles.map(r => (
            <div key={r.role} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, color: '#C8C4BC', minWidth: 130 }}>{r.role}</span>
              <Tag label={r.ship} color="#7AAECC" />
              <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{r.duty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SALVAGE ─────────────────────────────────────────────────────────────────

function SalvagePlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.SALVAGE;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Wreck Type</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.wreckTypes.map(w => (
            <SelectableRow
              key={w.id} label={w.name}
              sublabel={`${w.yieldSCU} · ${w.notes}`}
              tags={[
                <Tag key="v" label={w.value.replace('_', ' ')} color={RISK_COLORS[w.value] || '#9A9488'} />,
                <Tag key="r" label={`Risk: ${w.risk}`} color={RISK_COLORS[w.risk] || '#9A9488'} />,
              ]}
              isSelected={data.wreckType === w.id}
              onToggle={() => onChange({ ...data, wreckType: w.id })}
              accentColor="#C8A84B"
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Process Type</SectionLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {plan.processTypes.map(p => (
            <button key={p.id} type="button" onClick={() => onChange({ ...data, processType: p.id })} style={{
              flex: 1, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
              background: data.processType === p.id ? 'rgba(200,168,75,0.10)' : '#0C0C0A',
              border: `0.5px solid ${data.processType === p.id ? 'rgba(200,168,75,0.35)' : 'rgba(200,170,100,0.06)'}`,
              borderLeft: data.processType === p.id ? '2px solid #C8A84B' : '0.5px solid rgba(200,170,100,0.06)',
              borderRadius: 2, transition: 'all 140ms',
            }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, color: data.processType === p.id ? '#C8A84B' : '#9A9488', marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit', lineHeight: 1.4 }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Ship</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
          {plan.ships.map(s => {
            const isOn = data.ship === s.id;
            return (
              <button key={s.id} type="button" onClick={() => onChange({ ...data, ship: s.id })} style={{
                padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                background: isOn ? 'rgba(200,168,75,0.08)' : '#0C0C0A',
                border: `0.5px solid ${isOn ? '#C8A84B55' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isOn ? '2px solid #C8A84B' : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 140ms',
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isOn ? '#C8A84B' : '#C8C4BC' }}>{s.name}</span>
                  <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{s.manufacturer}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <Tag label={`${s.crew} crew`} color="#9A9488" />
                  <Tag label={`${s.maxSCU} SCU`} color="#C8A84B" />
                  {s.recommended && <Tag label="Rec." color="#4A8C5C" />}
                </div>
                <div style={{ fontSize: 9, color: '#4A4840', fontFamily: 'inherit' }}>{s.pros}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CARGO ────────────────────────────────────────────────────────────────────

function CargoPlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.CARGO;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Trade Route</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.routes.map(r => (
            <SelectableRow
              key={r.id} label={r.name}
              sublabel={r.notes}
              tags={[
                <Tag key="m" label={r.margin} color="#4A8C5C" />,
                <Tag key="ri" label={`Risk: ${r.risk.replace('_', ' ')}`} color={plan.riskColors[r.risk] || '#9A9488'} />,
                <Tag key="s" label={`${r.minSCU}+ SCU`} color="#5A5850" />,
              ]}
              isSelected={data.route === r.id}
              onToggle={() => {
                const sys = r.systems?.[0] || 'STANTON';
                onChange({ ...data, route: r.id });
              }}
              accentColor={plan.riskColors[r.risk] || '#9A9488'}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Haul Ship</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 5 }}>
          {plan.ships.map(s => {
            const isOn = data.ship === s.id;
            return (
              <button key={s.id} type="button" onClick={() => onChange({ ...data, ship: s.id })} style={{
                padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
                background: isOn ? 'rgba(216,188,112,0.08)' : '#0C0C0A',
                border: `0.5px solid ${isOn ? '#D8BC7055' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isOn ? '2px solid #D8BC70' : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 140ms',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isOn ? '#D8BC70' : '#C8C4BC', marginBottom: 4 }}>{s.name}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Tag label={`${s.maxSCU} SCU`} color="#D8BC70" />
                  <Tag label={`${s.crew} crew`} color="#9A9488" />
                  {s.warning && <Tag label="High Risk" color="#C0392B" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PATROL ───────────────────────────────────────────────────────────────────

function PatrolPlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.PATROL;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Area of Operations</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.zones.map(z => (
            <SelectableRow
              key={z.id} label={z.name}
              sublabel={`${z.factions.join(' · ')} · ${z.notes}`}
              tags={[
                <Tag key="t" label={`Threat: ${z.threat.replace('_', ' ')}`} color={RISK_COLORS[z.threat] || '#9A9488'} />,
                <Tag key="s" label={z.system} color="#5A5850" />,
              ]}
              isSelected={data.zone === z.id}
              onToggle={() => onChange({ ...data, zone: z.id, primaryLocation: z.name })}
              accentColor={RISK_COLORS[z.threat] || '#7AAECC'}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Rules of Engagement</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
          {plan.engagementRules.map(roe => {
            const isOn = data.roe === roe.id;
            return (
              <button key={roe.id} type="button" onClick={() => onChange({ ...data, roe: roe.id })} style={{
                padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
                background: isOn ? 'rgba(122,174,204,0.08)' : '#0C0C0A',
                border: `0.5px solid ${isOn ? '#7AAECC44' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isOn ? '2px solid #7AAECC' : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 140ms',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, color: isOn ? '#7AAECC' : '#9A9488', marginBottom: 3 }}>{roe.label}</div>
                <div style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{roe.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Recommended Ships</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {plan.ships.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C8C4BC', minWidth: 160 }}>{s.name}</span>
              <Tag label={s.class} color="#5A5850" />
              <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{s.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COMBAT ───────────────────────────────────────────────────────────────────

function CombatPlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.COMBAT;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Mission Type</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.missionTypes.map(m => (
            <SelectableRow
              key={m.id} label={m.label}
              sublabel={`${m.locations.join(' · ')} · ${m.notes}`}
              tags={[
                m.avgAuec > 0 && <Tag key="a" label={`${(m.avgAuec / 1000).toFixed(0)}K aUEC`} color="#4A8C5C" />,
                <Tag key="d" label={m.difficulty.replace('_', ' ')} color={DIFF_COLORS[m.difficulty]} />,
                <Tag key="c" label={`${m.crew}+ crew`} color="#5A5850" />,
              ].filter(Boolean)}
              isSelected={data.missionType === m.id}
              onToggle={() => onChange({ ...data, missionType: m.id })}
              accentColor={DIFF_COLORS[m.difficulty] || '#C0392B'}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Loadout Roles</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {plan.loadouts.map(l => (
            <div key={l.role} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, color: '#C8C4BC', minWidth: 120, flexShrink: 0 }}>{l.role}</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {l.ships.map(s => <Tag key={s} label={s} color="#9A9488" />)}
              </div>
              <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit', marginLeft: 4 }}>{l.primary}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ESCORT ───────────────────────────────────────────────────────────────────

function EscortPlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.ESCORT;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Convoy Type</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.convoyTypes.map(c => (
            <SelectableRow
              key={c.id} label={c.label}
              sublabel={`${c.desc} · ${c.notes}`}
              tags={[
                <Tag key="r" label={`Risk: ${c.risk.replace('_', ' ')}`} color={RISK_COLORS[c.risk] || '#9A9488'} />,
                <Tag key="e" label={`${c.minEscort}+ fighters`} color="#5B8FB9" />,
              ]}
              isSelected={data.convoyType === c.id}
              onToggle={() => onChange({ ...data, convoyType: c.id })}
              accentColor="#5B8FB9"
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Escort Ratios</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {plan.ratios.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <Tag label={r.label} color="#9A9488" />
              <Tag label={`${r.fighters} fighters`} color="#5B8FB9" />
              <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{r.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>High-Risk Zones</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {plan.piracyZones.map(z => (
            <div key={z.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.06)', borderRadius: 2 }}>
              <span style={{ fontSize: 10, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif" }}>{z.name}</span>
              <Tag label={z.risk.replace('_', ' ')} color={RISK_COLORS[z.risk] || '#9A9488'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RECON ────────────────────────────────────────────────────────────────────

function ReconPlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.RECON;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Scout Target Type</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.targetTypes.map(t => (
            <SelectableRow
              key={t.id} label={t.label}
              sublabel={t.desc}
              tags={t.outputs.map(o => <Tag key={o} label={o} color="#7AAECC" />)}
              isSelected={(data.targetTypes || []).includes(t.id)}
              onToggle={() => {
                const cur = data.targetTypes || [];
                onChange({ ...data, targetTypes: cur.includes(t.id) ? cur.filter(x => x !== t.id) : [...cur, t.id] });
              }}
              accentColor="#7AAECC"
            />
          ))}
        </div>
      </div>

      {(data.targetTypes || []).length > 0 && (
        <div>
          <SectionLabel>Recommended Ships</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[...new Set((data.targetTypes || []).flatMap(id => {
              const t = plan.targetTypes.find(x => x.id === id);
              return t ? t.ships : [];
            }))].map(s => <Tag key={s} label={s} color="#9A9488" />)}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Scanner Tips</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {plan.scannerTips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ color: '#3A3830', fontFamily: 'inherit', fontSize: 9, flexShrink: 0, marginTop: 1 }}>◉</span>
              <span style={{ fontSize: 10, color: '#7A7870', fontFamily: 'inherit', lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RESCUE ───────────────────────────────────────────────────────────────────

function RescuePlanning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.RESCUE;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Beacon Type</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.beaconTypes.map(b => (
            <SelectableRow
              key={b.id} label={b.label}
              sublabel={`${b.desc} · ${b.notes}`}
              tags={[
                <Tag key="p" label={b.priority} color={b.priority === 'CRITICAL' ? '#C0392B' : b.priority === 'HIGH' ? '#E04848' : '#C8A84B'} />,
              ]}
              isSelected={data.beaconType === b.id}
              onToggle={() => onChange({ ...data, beaconType: b.id })}
              accentColor="#4A8C5C"
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Medical Ships</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 5 }}>
          {plan.medShips.map(s => {
            const isOn = data.medShip === s.name;
            return (
              <button key={s.name} type="button" onClick={() => onChange({ ...data, medShip: s.name })} style={{
                padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
                background: isOn ? 'rgba(74,140,92,0.08)' : '#0C0C0A',
                border: `0.5px solid ${isOn ? '#4A8C5C55' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isOn ? '2px solid #4A8C5C' : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 140ms',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isOn ? '#4A8C5C' : '#C8C4BC', marginBottom: 4 }}>{s.name}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <Tag label={`${s.crew} crew`} color="#9A9488" />
                  <Tag label={`${s.beds} beds`} color="#4A8C5C" />
                </div>
                <div style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{s.role}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Response Protocol</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {plan.responseProtocol.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, color: '#4A8C5C', flexShrink: 0, minWidth: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 10, color: '#9A9488', fontFamily: 'inherit', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── S17 ──────────────────────────────────────────────────────────────────────

function S17Planning({ data, onChange }) {
  const plan = OP_TYPE_PLANS.S17;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{
        padding: '12px 16px', background: 'rgba(155,89,182,0.06)',
        border: '0.5px solid rgba(155,89,182,0.2)', borderRadius: 2,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, color: '#9B59B6', letterSpacing: '0.14em', marginBottom: 6 }}>
          SECTION 17 — CLASSIFIED ACCESS
        </div>
        <div style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit', lineHeight: 1.6 }}>{plan.note}</div>
      </div>

      <div>
        <SectionLabel>Clearance Level</SectionLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {plan.clearanceLevels.map(c => {
            const isOn = data.clearance === c.id;
            return (
              <button key={c.id} type="button" onClick={() => onChange({ ...data, clearance: c.id })} style={{
                flex: 1, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                background: isOn ? 'rgba(155,89,182,0.10)' : '#0C0C0A',
                border: `0.5px solid ${isOn ? '#9B59B666' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isOn ? '2px solid #9B59B6' : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 140ms',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isOn ? '#9B59B6' : '#5A5850', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {c.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, color: '#4A4840', fontFamily: 'inherit', lineHeight: 1.4 }}>{c.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Objective Classification</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
          {plan.objectiveTypes.map(o => {
            const isOn = data.objective === o.id;
            return (
              <button key={o.id} type="button" onClick={() => onChange({ ...data, objective: o.id })} style={{
                padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
                background: isOn ? 'rgba(155,89,182,0.08)' : '#0C0C0A',
                border: `0.5px solid ${isOn ? '#9B59B644' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isOn ? '2px solid #9B59B6' : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 140ms',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, color: isOn ? '#9B59B6' : '#7A7870', marginBottom: 3 }}>{o.label}</div>
                <div style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{o.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Crew Requirements</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {plan.crewRequirements.map((req, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ color: '#9B59B6', fontSize: 9, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span style={{ fontSize: 10, color: '#7A7870', fontFamily: 'inherit', lineHeight: 1.5 }}>{req}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── REP GRIND (existing logic, preserved) ───────────────────────────────────

function RepGrindPlanning({ data, onChange }) {
  const [activeFaction, setActiveFaction] = useState(data.selectedFactions[0] || null);
  const faction = getFactionById(activeFaction);
  const avgRep = faction && data.missionTypes.length > 0
    ? (() => {
        const sel = faction.missionTypes.filter(m => data.missionTypes.includes(m.id));
        return sel.length ? Math.round(sel.reduce((s, m) => s + m.avgRep, 0) / sel.length) : 300;
      })()
    : 300;
  const tier = REP_TIERS.find(t => t.id === data.targetTier);
  const estimate = faction && data.targetTier ? estimateMissions(data.currentRep || 0, data.targetTier, avgRep) : null;

  const toggleFaction = (id) => {
    const next = data.selectedFactions.includes(id) ? data.selectedFactions.filter(f => f !== id) : [...data.selectedFactions, id];
    onChange({ ...data, selectedFactions: next, missionTypes: [] });
    if (!data.selectedFactions.includes(id)) setActiveFaction(id);
  };
  const toggleMission = (id) => {
    const next = data.missionTypes.includes(id) ? data.missionTypes.filter(m => m !== id) : [...data.missionTypes, id];
    onChange({ ...data, missionTypes: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Select Target Factions</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 5 }}>
          {SC_FACTIONS.map(f => {
            const isSel = data.selectedFactions.includes(f.id);
            return (
              <button key={f.id} type="button" onClick={() => { toggleFaction(f.id); setActiveFaction(f.id); }} style={{
                display: 'flex', flexDirection: 'column', gap: 3, padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
                background: isSel ? `${f.color}10` : activeFaction === f.id ? '#111110' : '#0C0C0A',
                border: `0.5px solid ${isSel ? f.color + '55' : activeFaction === f.id ? f.color + '1A' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isSel ? `2px solid ${f.color}` : '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2, transition: 'all 160ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isSel ? f.color : '#C8C4BC', letterSpacing: '0.06em' }}>{f.shortName}</span>
                  {f.eventOnly && <Tag label="Event" color="#9B59B6" />}
                  {f.warning && <Tag label="Outlaw" color="#C0392B" />}
                </div>
                <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>{f.systems.join(' · ')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {faction && (
        <div style={{ background: '#0C0C0A', border: `0.5px solid ${faction.color}20`, borderLeft: `2px solid ${faction.color}`, borderRadius: 2, padding: 14 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: faction.color, marginBottom: 4 }}>{faction.name}</div>
          {faction.warning && <div style={{ fontSize: 9, color: '#C0392B', marginBottom: 10, fontFamily: 'inherit' }}>⚠ {faction.warning}</div>}
          <div style={{ fontSize: 9, color: '#5A5850', marginBottom: 14, fontFamily: 'inherit', lineHeight: 1.5 }}>{faction.notes}</div>

          <SectionLabel>Mission Types</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
            {faction.missionTypes.map(m => {
              const isOn = data.missionTypes.includes(m.id);
              return (
                <SelectableRow key={m.id} label={m.label} sublabel={null}
                  tags={[
                    <Tag key="r" label={`+${m.avgRep} rep`} color="#7AAECC" />,
                    <Tag key="a" label={`${(m.avgAuec / 1000).toFixed(0)}K`} color="#4A8C5C" />,
                    <Tag key="d" label={m.difficulty.replace('_', ' ')} color={DIFF_COLORS[m.difficulty]} />,
                    <Tag key="c" label={`${m.crew}+`} color="#5A5850" />,
                  ]}
                  isSelected={isOn} onToggle={() => toggleMission(m.id)} accentColor={faction.color}
                />
              );
            })}
          </div>

          <SectionLabel>Rep Tier Unlocks</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 14 }}>
            {faction.repUnlocks.map(u => {
              const t = REP_TIERS.find(r => r.id === u.tier);
              return (
                <div key={u.tier} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Tag label={u.tier} color={t?.color || '#9A9488'} />
                  <span style={{ fontSize: 10, color: '#7A7870', fontFamily: 'inherit' }}>{u.unlock}</span>
                </div>
              );
            })}
          </div>

          {faction.primaryLocations.length > 0 && (
            <>
              <SectionLabel>Primary Locations</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {faction.primaryLocations.map(loc => (
                  <button key={loc} type="button"
                    onClick={() => onChange({ ...data, primaryLocation: loc })}
                    style={{
                      padding: '3px 9px', cursor: 'pointer', borderRadius: 2,
                      background: data.primaryLocation === loc ? `${faction.color}18` : '#0F0F0D',
                      border: `0.5px solid ${data.primaryLocation === loc ? faction.color + '55' : 'rgba(200,170,100,0.07)'}`,
                      color: data.primaryLocation === loc ? faction.color : '#7A7870',
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, transition: 'all 140ms',
                    }}>{loc}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <SectionLabel>Session Planning</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Current Rep', key: 'currentRep', type: 'number', placeholder: '0' },
            { label: 'Session Mission Target', key: 'sessionMissionTarget', type: 'number', placeholder: '15' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'inherit' }}>{f.label}</label>
              <input className="nexus-input" type={f.type} style={{ height: 32, fontSize: 11 }} placeholder={f.placeholder}
                value={data[f.key] || ''} onChange={e => onChange({ ...data, [f.key]: parseInt(e.target.value) || 0 })} />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'inherit' }}>Target Tier</label>
            <select className="nexus-input" style={{ height: 32, fontSize: 11 }}
              value={data.targetTier || ''} onChange={e => onChange({ ...data, targetTier: e.target.value })}>
              <option value="">Select tier</option>
              {REP_TIERS.filter(t => t.threshold !== null).map(t => (
                <option key={t.id} value={t.id}>{t.label} ({t.threshold.toLocaleString()})</option>
              ))}
            </select>
          </div>
        </div>
        {estimate !== null && estimate > 0 && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2, display: 'flex', gap: 16 }}>
            <div>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: tier?.color || '#C8A84B', fontVariantNumeric: 'tabular-nums' }}>~{estimate}</span>
              <span style={{ fontSize: 9, color: '#5A5850', marginLeft: 6, fontFamily: 'inherit', letterSpacing: '0.1em' }}>MISSIONS TO TARGET</span>
            </div>
            {(data.sessionMissionTarget || 0) > 0 && (
              <div style={{ borderLeft: '0.5px solid var(--b1)', paddingLeft: 16 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#7AAECC', fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(estimate / data.sessionMissionTarget)}</span>
                <span style={{ fontSize: 9, color: '#5A5850', marginLeft: 6, fontFamily: 'inherit', letterSpacing: '0.1em' }}>SESSIONS EST.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BLUEPRINT GRIND (existing logic, preserved) ─────────────────────────────

function BlueprintGrindPlanning({ data, onChange }) {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    let list = getBlueprintsByCategory(categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.subcategory.toLowerCase().includes(q) || b.locations.some(l => l.toLowerCase().includes(q)) || (b.faction && b.faction.toLowerCase().includes(q)));
    }
    return list;
  }, [categoryFilter, search]);

  const toggleBp = (id) => {
    const next = data.selectedBlueprints.includes(id) ? data.selectedBlueprints.filter(b => b !== id) : [...data.selectedBlueprints, id];
    onChange({ ...data, selectedBlueprints: next });
  };
  const selectedDetails = SC_BLUEPRINTS.filter(b => data.selectedBlueprints.includes(b.id));
  const impliedLocs = getBlueprintLocations(data.selectedBlueprints);
  const impliedFactions = getBlueprintFactions(data.selectedBlueprints);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {[{ id: 'ALL', label: 'All' }, ...BLUEPRINT_CATEGORIES].map(c => (
          <button key={c.id} type="button" onClick={() => setCategoryFilter(c.id)} style={{
            padding: '4px 11px', cursor: 'pointer', borderRadius: 2,
            background: categoryFilter === c.id ? 'rgba(200,170,100,0.10)' : '#0F0F0D',
            border: `0.5px solid ${categoryFilter === c.id ? 'rgba(200,170,100,0.3)' : 'rgba(200,170,100,0.06)'}`,
            color: categoryFilter === c.id ? '#C8C4BC' : '#5A5850',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em', transition: 'all 140ms',
          }}>{c.label}</button>
        ))}
      </div>

      <input className="nexus-input" style={{ height: 32, fontSize: 11 }}
        placeholder="Search blueprints, locations, factions..." value={search} onChange={e => setSearch(e.target.value)} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map(bp => {
          const isSel = data.selectedBlueprints.includes(bp.id);
          const acq = ACQUISITION_METHODS.find(a => a.id === bp.acquisition);
          const reqFaction = bp.faction ? getFactionById(bp.faction) : null;
          const reqTier = bp.minTier ? REP_TIERS.find(t => t.id === bp.minTier) : null;
          return (
            <button key={bp.id} type="button" onClick={() => toggleBp(bp.id)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
              background: isSel ? 'rgba(200,170,100,0.06)' : '#0C0C0A',
              border: `0.5px solid ${isSel ? 'rgba(200,170,100,0.2)' : 'rgba(200,170,100,0.04)'}`,
              borderLeft: isSel ? '2px solid rgba(200,170,100,0.5)' : '0.5px solid rgba(200,170,100,0.04)',
              borderRadius: 2, transition: 'all 140ms',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: isSel ? RARITY_COLORS[bp.rarity] : '#2A2A28', transition: 'all 140ms' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: isSel ? '#E8E4DC' : '#9A9488' }}>{bp.name}</span>
                  <span style={{ fontSize: 9, color: '#4A4840', fontFamily: 'inherit' }}>{bp.subcategory}</span>
                  {bp.size && <Tag label={`S${bp.size}`} color="#5A5850" />}
                  <Tag label={bp.rarity.replace('_', ' ')} color={RARITY_COLORS[bp.rarity]} />
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {acq && <Tag label={acq.label} color={acq.color} />}
                  {reqFaction && <Tag label={reqFaction.shortName} color={reqFaction.color} />}
                  {reqTier && <Tag label={`${reqTier.label}+`} color={reqTier.color} />}
                </div>
                {bp.notes && <div style={{ fontSize: 9, color: '#5A5850', marginTop: 4, fontFamily: 'inherit', lineHeight: 1.4 }}>{bp.notes}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDetails.length > 0 && (
        <div style={{ background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: '#E8E4DC' }}>{selectedDetails.length} Blueprint{selectedDetails.length !== 1 ? 's' : ''} Targeted</div>
          {impliedLocs.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 5, fontFamily: 'inherit' }}>HUNT LOCATIONS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {impliedLocs.map(loc => (
                  <button key={loc} type="button" onClick={() => onChange({ ...data, primaryLocation: loc })}
                    style={{ padding: '3px 9px', cursor: 'pointer', borderRadius: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                      background: data.primaryLocation === loc ? 'rgba(200,170,100,0.10)' : '#0F0F0D',
                      border: `0.5px solid ${data.primaryLocation === loc ? 'rgba(200,170,100,0.3)' : 'rgba(200,170,100,0.07)'}`,
                      color: data.primaryLocation === loc ? '#C8C4BC' : '#7A7870', transition: 'all 140ms',
                    }}>{loc}</button>
                ))}
              </div>
            </div>
          )}
          {impliedFactions.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 5, fontFamily: 'inherit' }}>REQUIRED STANDINGS</div>
              {impliedFactions.map(f => {
                const bpsForF = selectedDetails.filter(b => b.faction === f.id);
                const highestIdx = bpsForF.reduce((max, b) => {
                  const idx = REP_TIERS.findIndex(t => t.id === b.minTier);
                  return idx > max ? idx : max;
                }, 0);
                const tierObj = REP_TIERS[highestIdx];
                return (
                  <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: f.color, fontWeight: 600 }}>{f.name}</span>
                    <span style={{ fontSize: 9, color: '#5A5850', fontFamily: 'inherit' }}>min. {tierObj?.label} required</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

const PANELS = {
  MINING:           MiningPlanning,
  ROCKBREAKER:      RockbreakerPlanning,
  SALVAGE:          SalvagePlanning,
  CARGO:            CargoPlanning,
  PATROL:           PatrolPlanning,
  COMBAT:           CombatPlanning,
  ESCORT:           EscortPlanning,
  RECON:            ReconPlanning,
  RESCUE:           RescuePlanning,
  S17:              S17Planning,
  REP_GRIND:        RepGrindPlanning,
  BLUEPRINT_GRIND:  BlueprintGrindPlanning,
};

export default function OpPlanningStep({ opType, planningData, onChange, onSystemChange, onLocationChange }) {
  const Panel = PANELS[opType] || null;
  if (!Panel) return (
    <div style={{ color: 'var(--t3)', fontSize: 11, padding: 20, textAlign: 'center', fontFamily: 'inherit' }}>
      No planning data available for this op type.
    </div>
  );

  const handleChange = (next) => {
    onChange(next);
    if (next.primaryLocation) {
      onLocationChange(next.primaryLocation);
      onSystemChange(getSystemForLocation(next.primaryLocation));
    }
  };

  return <Panel data={planningData} onChange={handleChange} />;
}
