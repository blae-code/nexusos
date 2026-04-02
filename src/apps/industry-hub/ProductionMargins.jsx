/**
 * ProductionMargins — Dashboard showing aUEC profit margins for production jobs.
 * Uses cached commodity averages from GameCacheCommodity instead of live UEX calls.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';

function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

function norm(s) { return (s || '').toLowerCase().trim(); }

function MarginBar({ pct }) {
  const clamped = Math.max(-100, Math.min(300, pct));
  const positive = clamped >= 0;
  const width = Math.min(Math.abs(clamped), 200);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
      <div style={{ width: 60, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: positive ? '50%' : `${50 - width / 4}%`,
          width: `${width / 4}%`,
          height: '100%',
          background: positive ? '#4AE830' : '#C0392B',
          borderRadius: 2,
        }} />
      </div>
      <span style={{
        fontSize: 10,
        fontFamily: 'monospace',
        fontWeight: 600,
        color: positive ? '#4AE830' : '#C0392B',
      }}>
        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    </div>
  );
}

function JobMarginRow({ row }) {
  const profitable = row.profit > 0;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.5fr 0.5fr 1fr 1fr 1fr 1fr',
      gap: 8,
      padding: '8px 12px',
      alignItems: 'center',
      borderBottom: '0.5px solid var(--b0)',
      fontSize: 11,
    }}>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ color: 'var(--t0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.blueprint_name}
        </div>
        <div style={{ color: 'var(--t3)', fontSize: 9 }}>
          {row.tier} · ×{row.totalOutput}
          {row.status === 'COMPLETE' && <span style={{ color: 'var(--live)', marginLeft: 4 }}>DONE</span>}
        </div>
      </div>

      <div style={{ color: row.hasUexData ? 'var(--t1)' : 'var(--t3)', fontSize: 10, textAlign: 'center' }}>
        {row.hasUexData ? '✓ CACHE' : '~ EST'}
      </div>

      <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#C0392B', fontSize: 10 }}>
        {fmt(row.inputCost)}
      </div>

      <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#C8A84B', fontSize: 10 }}>
        {fmt(row.outputValue)}
      </div>

      <div style={{
        textAlign: 'right',
        fontFamily: 'monospace',
        fontWeight: 600,
        fontSize: 10,
        color: profitable ? '#4AE830' : '#C0392B',
      }}>
        {profitable ? '+' : ''}{fmt(row.profit)}
      </div>

      <MarginBar pct={row.marginPct} />
    </div>
  );
}

export default function ProductionMargins({ jobs, blueprints }) {
  const [cachedPrices, setCachedPrices] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchPrices() {
      setLoading(true);
      try {
        const rows = await base44.entities.GameCacheCommodity.list('name', 1000).catch(() => []);
        const map = {};
        for (const row of (rows || [])) {
          map[norm(row.name)] = {
            buy_avg: row.npc_avg_buy || row.buy_price_uex || 0,
            sell_avg: row.npc_avg_sell || row.sell_price_uex || 0,
          };
        }
        if (active) setCachedPrices(map);
      } catch {
        if (active) setCachedPrices({});
      }
      if (active) setLoading(false);
    }
    fetchPrices();
    return () => { active = false; };
  }, []);

  const bpMap = useMemo(() => {
    const map = {};
    for (const blueprint of blueprints) map[blueprint.id] = blueprint;
    return map;
  }, [blueprints]);

  const margins = useMemo(() => {
    if (!cachedPrices) return [];

    return jobs
      .filter((job) => job.status === 'ACTIVE' || job.status === 'COMPLETE')
      .map((job) => {
        const blueprint = bpMap[job.blueprint_id];
        const consumed = job.materials_consumed || [];
        const totalOutput = (job.quantity || 1) * (job.output_per_craft || 1);
        let inputCost = 0;
        let hasUexData = false;

        for (const material of consumed) {
          const price = cachedPrices[norm(material.material)];
          if (price && price.buy_avg > 0) {
            inputCost += (material.quantity_scu || 0) * price.buy_avg;
            hasUexData = true;
          }
        }

        const outputValue = (blueprint?.aUEC_value_est || 0) * totalOutput;
        const profit = outputValue - inputCost;
        const marginPct = inputCost > 0 ? (profit / inputCost) * 100 : (outputValue > 0 ? 100 : 0);

        return {
          id: job.id,
          blueprint_name: job.blueprint_name,
          tier: job.tier,
          category: job.category,
          status: job.status,
          totalOutput,
          inputCost,
          outputValue,
          profit,
          marginPct,
          hasUexData,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [jobs, cachedPrices, bpMap]);

  const totals = useMemo(() => {
    const activeJobs = margins.filter((margin) => margin.status === 'ACTIVE');
    const allJobs = margins;
    return {
      totalInputCost: allJobs.reduce((sum, margin) => sum + margin.inputCost, 0),
      totalOutputValue: allJobs.reduce((sum, margin) => sum + margin.outputValue, 0),
      totalProfit: allJobs.reduce((sum, margin) => sum + margin.profit, 0),
      activeProfit: activeJobs.reduce((sum, margin) => sum + margin.profit, 0),
      avgMargin: allJobs.length > 0
        ? allJobs.reduce((sum, margin) => sum + margin.marginPct, 0) / allJobs.length
        : 0,
      jobCount: allJobs.length,
      profitableCount: allJobs.filter((margin) => margin.profit > 0).length,
    };
  }, [margins]);

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
      </div>
    );
  }

  if (margins.length === 0) {
    return (
      <div style={{ padding: '20px 16px', color: 'var(--t3)', fontSize: 11, textAlign: 'center' }}>
        No active or completed jobs to analyse. Start a fabrication job to see profit margins.
      </div>
    );
  }

  const totalProfitable = totals.totalProfit >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <div style={{ padding: '10px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>MATERIAL COST</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#C0392B', fontFamily: 'monospace' }}>{fmt(totals.totalInputCost)}</div>
          <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>aUEC in materials</div>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>OUTPUT VALUE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#C8A84B', fontFamily: 'monospace' }}>{fmt(totals.totalOutputValue)}</div>
          <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>aUEC market est.</div>
        </div>

        <div style={{ padding: '10px 14px', background: totalProfitable ? 'rgba(74,232,48,0.06)' : 'rgba(192,57,43,0.06)', border: `0.5px solid ${totalProfitable ? 'rgba(74,232,48,0.15)' : 'rgba(192,57,43,0.15)'}`, borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>TOTAL PROFIT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: totalProfitable ? '#4AE830' : '#C0392B', fontFamily: 'monospace' }}>
            {totals.totalProfit >= 0 ? '+' : ''}{fmt(totals.totalProfit)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>all tracked jobs</div>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>AVG MARGIN</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: totals.avgMargin >= 0 ? '#4AE830' : '#C0392B', fontFamily: 'monospace' }}>
            {totals.avgMargin >= 0 ? '+' : ''}{totals.avgMargin.toFixed(1)}%
          </div>
          <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{totals.profitableCount}/{totals.jobCount} profitable</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 0.5fr 1fr 1fr 1fr 1fr',
          gap: 8,
          padding: '9px 12px',
          borderBottom: '0.5px solid var(--b1)',
          color: 'var(--t3)',
          fontSize: 8,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <div>Blueprint</div>
          <div style={{ textAlign: 'center' }}>Price</div>
          <div style={{ textAlign: 'right' }}>Input Cost</div>
          <div style={{ textAlign: 'right' }}>Output Value</div>
          <div style={{ textAlign: 'right' }}>Profit</div>
          <div>Margin</div>
        </div>

        {margins.map((row) => (
          <JobMarginRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}
