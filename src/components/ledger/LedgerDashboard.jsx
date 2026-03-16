import React, { useMemo } from 'react';

const TYPE_ORDER = ['RAW', 'REFINED', 'SALVAGE', 'CRAFTED', 'OTHER'];

const TYPE_COLOR = {
  RAW:     'var(--warn)',
  REFINED: 'var(--live)',
  SALVAGE: 'var(--info)',
  CRAFTED: 'var(--acc2)',
  OTHER:   'var(--t2)',
};

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 8,
      padding: '12px 14px', flex: 1, minWidth: 0,
    }}>
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ color: accent || 'var(--t0)', fontSize: 22, fontWeight: 500, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function TypeBar({ label, count, scu, maxScu, color }) {
  const pct = maxScu > 0 ? Math.min((scu / maxScu) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ color, fontSize: 10, letterSpacing: '0.08em', minWidth: 64, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ color: 'var(--t1)', fontSize: 11, minWidth: 52, textAlign: 'right' }}>{scu.toFixed(1)} SCU</span>
      <span style={{ color: 'var(--t2)', fontSize: 10, minWidth: 28, textAlign: 'right' }}>×{count}</span>
    </div>
  );
}

function QualityBand({ label, range, mats, color }) {
  const total = mats.reduce((s, m) => s + (m.quantity_scu || 0), 0);
  return (
    <div style={{ display: 'flex', items: 'center', gap: 8, padding: '5px 8px', borderRadius: 5, background: 'var(--bg1)', border: '0.5px solid var(--b0)', marginBottom: 4 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3 }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--t1)', fontSize: 11 }}>{label}</div>
        <div style={{ color: 'var(--t2)', fontSize: 10 }}>{range}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: color, fontSize: 12, fontWeight: 500 }}>{mats.length}</div>
        <div style={{ color: 'var(--t2)', fontSize: 10 }}>{total.toFixed(1)} SCU</div>
      </div>
    </div>
  );
}

function PipelineFlow({ raw, refining, refined, armory }) {
  const stages = [
    { label: 'ACQUIRED', value: raw, color: 'var(--warn)', desc: 'RAW / SALVAGE' },
    { label: 'REFINING', value: refining, color: 'var(--info)', desc: 'IN REFINERY' },
    { label: 'REFINED',  value: refined, color: 'var(--live)', desc: 'READY' },
    { label: 'ARMORY',   value: armory,  color: 'var(--acc2)', desc: 'CRAFTED / STORED' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8, overflow: 'hidden' }}>
      {stages.map((s, i) => (
        <React.Fragment key={s.label}>
          <div style={{ flex: 1, padding: '12px 14px', textAlign: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 4 }}>{s.desc}</div>
          </div>
          {i < stages.length - 1 && (
            <div style={{ width: '0.5px', background: 'var(--b1)', alignSelf: 'stretch', margin: '8px 0' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function LedgerDashboard({ materials, refineryOrders, commodities = [], loading }) {
  const stats = useMemo(() => {
    const active = materials.filter(m => !m.is_archived);

    // Build commodity price lookup by name (case-insensitive)
    const priceByName = {};
    commodities.forEach(c => {
      if (c.sell_price_uex > 0) priceByName[(c.name || '').toLowerCase()] = c.sell_price_uex;
    });

    // Stockpile value = sum(quantity_scu * sell_price per SCU)
    // sell_price_uex is typically per unit; 1 SCU ≈ 100 units in SC economy
    const UNITS_PER_SCU = 100;
    let totalValue = 0;
    active.forEach(m => {
      const price = priceByName[(m.material_name || '').toLowerCase()];
      if (price && m.quantity_scu) totalValue += m.quantity_scu * UNITS_PER_SCU * price;
    });
    const valuedCount = active.filter(m => priceByName[(m.material_name || '').toLowerCase()]).length;

    const totalScu  = active.reduce((s, m) => s + (m.quantity_scu || 0), 0);
    const avgQuality = active.length ? active.reduce((s, m) => s + (m.quality_pct || 0), 0) / active.length : 0;
    const t2Ready   = active.filter(m => (m.quality_pct || 0) >= 80);
    const t2Scu     = t2Ready.reduce((s, m) => s + (m.quantity_scu || 0), 0);

    const byType = TYPE_ORDER.reduce((acc, t) => {
      const group = active.filter(m => m.material_type === t);
      acc[t] = {
        count: group.length,
        scu: group.reduce((s, m) => s + (m.quantity_scu || 0), 0),
      };
      return acc;
    }, {});

    const maxScu = Math.max(...Object.values(byType).map(g => g.scu), 1);

    // Pipeline counts
    const rawScu      = byType.RAW.scu + byType.SALVAGE.scu;
    const refiningScu = refineryOrders.filter(r => r.status === 'ACTIVE').reduce((s, r) => s + (r.quantity_scu || 0), 0);
    const refinedScu  = byType.REFINED.scu;
    const armScu      = byType.CRAFTED.scu;

    // Quality bands
    const t2    = active.filter(m => (m.quality_pct || 0) >= 80);
    const good  = active.filter(m => (m.quality_pct || 0) >= 60 && (m.quality_pct || 0) < 80);
    const low   = active.filter(m => (m.quality_pct || 0) >= 40 && (m.quality_pct || 0) < 60);
    const poor  = active.filter(m => (m.quality_pct || 0) < 40);

    // Top materials by SCU
    const top5 = [...active].sort((a, b) => (b.quantity_scu || 0) - (a.quantity_scu || 0)).slice(0, 8);

    // Recently logged
    const recent = [...active].sort((a, b) => new Date(b.logged_at || b.created_date) - new Date(a.logged_at || a.created_date)).slice(0, 6);

    return { totalScu, avgQuality, t2Ready: t2Ready.length, t2Scu, byType, maxScu, rawScu, refiningScu, refinedScu, armScu, t2, good, low, poor, top5, recent, totalValue, valuedCount };
  }, [materials, refineryOrders, commodities]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--t2)', fontSize: 12, letterSpacing: '0.1em' }}>
        LOADING LEDGER...
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatCard label="TOTAL STOCKPILE" value={`${stats.totalScu.toFixed(1)} SCU`} sub={`${materials.filter(m => !m.is_archived).length} entries`} />
        <StatCard label="AVG QUALITY" value={`${stats.avgQuality.toFixed(0)}%`} sub="across all materials" accent={stats.avgQuality >= 80 ? 'var(--live)' : stats.avgQuality >= 60 ? 'var(--warn)' : 'var(--danger)'} />
        <StatCard label="T2-ELIGIBLE" value={stats.t2Ready} sub={`${stats.t2Scu.toFixed(1)} SCU @ 80%+`} accent="var(--live)" />
        <StatCard label="REFINING NOW" value={`${stats.refiningScu.toFixed(1)} SCU`} sub={`${refineryOrders.filter(r => r.status === 'ACTIVE').length} active orders`} accent="var(--info)" />
        <StatCard
          label="EST. MARKET VALUE"
          value={stats.totalValue > 0 ? `${Math.round(stats.totalValue / 1000)}k` : '—'}
          sub={stats.totalValue > 0 ? `aUEC · ${stats.valuedCount} priced` : 'no price data'}
          accent={stats.totalValue > 0 ? 'var(--live)' : 'var(--t2)'}
        />
      </div>

      {/* Pipeline flow */}
      <div>
        <SectionHeader label="PIPELINE FLOW" />
        <PipelineFlow
          raw={`${stats.rawScu.toFixed(1)}`}
          refining={`${stats.refiningScu.toFixed(1)}`}
          refined={`${stats.refinedScu.toFixed(1)}`}
          armory={`${stats.armScu.toFixed(1)}`}
        />
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {/* By type */}
        <div style={{ flex: 1 }}>
          <SectionHeader label="STOCKPILE BY TYPE" />
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '10px 14px' }}>
            {TYPE_ORDER.map(t => (
              <TypeBar key={t} label={t} color={TYPE_COLOR[t]} count={stats.byType[t].count} scu={stats.byType[t].scu} maxScu={stats.maxScu} />
            ))}
          </div>
        </div>

        {/* Quality bands */}
        <div style={{ flex: 1 }}>
          <SectionHeader label="QUALITY DISTRIBUTION" />
          <QualityBand label="T2 CRAFT-READY"  range="80 – 100%"  mats={stats.t2}   color="var(--live)" />
          <QualityBand label="REFINABLE"        range="60 – 79%"   mats={stats.good} color="var(--info)" />
          <QualityBand label="BELOW THRESHOLD"  range="40 – 59%"   mats={stats.low}  color="var(--warn)" />
          <QualityBand label="POOR"             range="0 – 39%"    mats={stats.poor} color="var(--danger)" />
        </div>

        {/* Top materials */}
        <div style={{ flex: 1 }}>
          <SectionHeader label="TOP BY VOLUME" />
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8, overflow: 'hidden' }}>
            {stats.top5.map((m, i) => {
              const q = m.quality_pct || 0;
              const qColor = q >= 80 ? 'var(--live)' : q >= 60 ? 'var(--info)' : q >= 40 ? 'var(--warn)' : 'var(--danger)';
              const UNITS_PER_SCU = 100;
              const priceByName = {};
              commodities.forEach(c => { if (c.sell_price_uex > 0) priceByName[(c.name || '').toLowerCase()] = c.sell_price_uex; });
              const price = priceByName[(m.material_name || '').toLowerCase()];
              const val = price ? Math.round((m.quantity_scu || 0) * UNITS_PER_SCU * price) : null;
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '0.5px solid var(--b0)' }}>
                  <span style={{ color: 'var(--t3)', fontSize: 10, minWidth: 16 }}>{i + 1}</span>
                  <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_name}</span>
                  <span style={{ color: 'var(--t1)', fontSize: 11 }}>{(m.quantity_scu || 0).toFixed(1)}</span>
                  <span style={{ color: qColor, fontSize: 10, minWidth: 32, textAlign: 'right' }}>{q.toFixed(0)}%</span>
                  {val !== null && <span style={{ color: 'var(--t2)', fontSize: 9, minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{val > 999 ? `${Math.round(val/1000)}k` : val}</span>}
                </div>
              );
            })}
            {stats.top5.length === 0 && (
              <div style={{ padding: 16, color: 'var(--t2)', fontSize: 11, textAlign: 'center' }}>No materials logged</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <SectionHeader label="RECENTLY LOGGED" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {stats.recent.map(m => {
            const q = m.quality_pct || 0;
            const qColor = q >= 80 ? 'var(--live)' : q >= 60 ? 'var(--info)' : 'var(--warn)';
            const ago = (() => {
              const diff = Date.now() - new Date(m.logged_at || m.created_date).getTime();
              const h = Math.floor(diff / 3600000);
              if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
              if (h < 24) return `${h}h ago`;
              return `${Math.floor(h / 24)}d ago`;
            })();
            return (
              <div key={m.id} style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_name}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10 }}>{m.material_type} · {ago}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--t1)', fontSize: 11 }}>{(m.quantity_scu || 0).toFixed(1)} SCU</div>
                  <div style={{ color: qColor, fontSize: 10 }}>{q.toFixed(0)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}