/**
 * useOpsAnalytics — fetches and aggregates completed op data for the analytics dashboard.
 */
import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';

function durationMinutes(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return ms > 0 ? Math.round(ms / 60000) : null;
}

export default function useOpsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [allOps, allRsvps, allEvents, allCoffer] = await Promise.all([
      base44.entities.Op.list('-scheduled_at', 500).catch(() => []),
      base44.entities.OpRsvp.filter({ status: 'CONFIRMED' }).catch(() => []),
      base44.entities.OpEvent.list('-logged_at', 2000).catch(() => []),
      base44.entities.CofferLog.list('-logged_at', 500).catch(() => []),
    ]);

    const ops = (allOps || []).filter(o => o.status === 'COMPLETE' || o.status === 'ARCHIVED');
    const rsvps = allRsvps || [];
    const events = allEvents || [];
    const cofferLogs = allCoffer || [];

    // Group RSVPs by op
    const rsvpByOp = {};
    rsvps.forEach(r => {
      if (!rsvpByOp[r.op_id]) rsvpByOp[r.op_id] = [];
      rsvpByOp[r.op_id].push(r);
    });

    // Group events by op
    const eventsByOp = {};
    events.forEach(e => {
      if (!eventsByOp[e.op_id]) eventsByOp[e.op_id] = [];
      eventsByOp[e.op_id].push(e);
    });

    // Group coffer logs by op
    const cofferByOp = {};
    cofferLogs.forEach(c => {
      if (c.op_id) {
        if (!cofferByOp[c.op_id]) cofferByOp[c.op_id] = [];
        cofferByOp[c.op_id].push(c);
      }
    });

    // Build per-op analytics
    const opAnalytics = ops.map(op => {
      const opRsvps = rsvpByOp[op.id] || [];
      const opEvents = eventsByOp[op.id] || [];
      const opCoffer = cofferByOp[op.id] || [];

      const lootEvents = opEvents.filter(e => e.event_type === 'LOOT');
      const totalLootSCU = lootEvents.reduce((s, e) => s + (e.quantity_scu || 0), 0);
      const threatEvents = opEvents.filter(e => e.event_type === 'THREAT');

      const revenue = opCoffer
        .filter(c => ['SALE', 'CRAFT_SALE', 'OP_SPLIT'].includes(c.entry_type))
        .reduce((s, c) => s + (c.amount_aUEC || 0), 0);
      const expenses = opCoffer
        .filter(c => c.entry_type === 'EXPENSE')
        .reduce((s, c) => s + (c.amount_aUEC || 0), 0);

      const dur = durationMinutes(op.started_at, op.ended_at);
      const crewCount = opRsvps.length;

      return {
        id: op.id,
        name: op.name || 'Unnamed',
        type: op.type || 'UNKNOWN',
        system: op.system || op.system_name || '—',
        status: op.status,
        scheduledAt: op.scheduled_at,
        startedAt: op.started_at,
        endedAt: op.ended_at,
        durationMin: dur,
        crewCount,
        totalLootSCU,
        lootEvents: lootEvents.length,
        threatCount: threatEvents.length,
        eventCount: opEvents.length,
        revenue,
        expenses,
        netProfit: revenue - expenses,
        phases: Array.isArray(op.phases) ? op.phases.length : 0,
      };
    }).sort((a, b) => (
      new Date(b.scheduledAt || b.endedAt || 0).getTime() -
      new Date(a.scheduledAt || a.endedAt || 0).getTime()
    ));

    // Aggregate KPIs
    const totalOps = opAnalytics.length;
    const totalRevenue = opAnalytics.reduce((s, o) => s + o.revenue, 0);
    const totalExpenses = opAnalytics.reduce((s, o) => s + o.expenses, 0);
    const totalLoot = opAnalytics.reduce((s, o) => s + o.totalLootSCU, 0);
    const opsWithDuration = opAnalytics.filter(o => o.durationMin !== null);
    const avgDuration = opsWithDuration.length > 0
      ? Math.round(opsWithDuration.reduce((s, o) => s + o.durationMin, 0) / opsWithDuration.length)
      : 0;
    const opsWithCrew = opAnalytics.filter(o => o.crewCount > 0);
    const avgCrew = opsWithCrew.length > 0
      ? (opsWithCrew.reduce((s, o) => s + o.crewCount, 0) / opsWithCrew.length).toFixed(1)
      : 0;
    const totalThreats = opAnalytics.reduce((s, o) => s + o.threatCount, 0);

    // Type breakdown
    const typeMap = {};
    opAnalytics.forEach(o => {
      if (!typeMap[o.type]) typeMap[o.type] = { count: 0, revenue: 0, loot: 0 };
      typeMap[o.type].count++;
      typeMap[o.type].revenue += o.revenue;
      typeMap[o.type].loot += o.totalLootSCU;
    });
    const typeBreakdown = Object.entries(typeMap)
      .map(([type, d]) => ({ type, ...d }))
      .sort((a, b) => b.count - a.count);

    setData({
      ops: opAnalytics,
      kpis: { totalOps, totalRevenue, totalExpenses, totalLoot, avgDuration, avgCrew, totalThreats },
      typeBreakdown,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { loading, data, refresh: load };
}
