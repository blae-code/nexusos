import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';

/* ═══ Helpers ═══════════════════════════════════════════════════════════════ */

function fmtAuec(val) {
  if (val == null) return '—';
  const n = Number(val);
  if (Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M aUEC`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K aUEC`;
  return `${sign}${abs} aUEC`;
}

function getBreadcrumb(pathname, search) {
  const p = new URLSearchParams(search || '');
  const tab = p.get('tab');

  if (pathname.startsWith('/app/industry')) {
    const seg = pathname.split('/')[3];
    const labels = { overview:'Overview', materials:'Materials', blueprints:'Blueprints', craft:'Craft Queue', refinery:'Refinery', coffer:'Coffer', commerce:'Commerce', logistics:'Logistics', cargo:'Cargo', production:'Production', prices:'Prices', analytics:'Analytics', components:'Components' };
    return { module: 'Industry', page: labels[seg] || labels[tab] || 'Overview' };
  }
  if (pathname.startsWith('/app/scout')) return { module: 'Intel', page: tab === 'routes' ? 'Routes' : 'Deposits' };
  if (pathname.startsWith('/app/ops')) {
    const seg = pathname.split('/')[3];
    if (seg === 'new') return { module: 'Operations', page: 'New Op' };
    if (seg === 'rescue') return { module: 'Operations', page: 'Rescue Board' };
    if (seg === 'timeline') return { module: 'Operations', page: 'Timeline' };
    if (seg === 'archive') return { module: 'Operations', page: 'Archive' };
    if (seg) return { module: 'Operations', page: 'Live Op' };
    return { module: 'Operations', page: p.get('view') === 'analytics' ? 'Analytics' : null };
  }
  if (pathname.startsWith('/app/armory')) {
    const seg = pathname.split('/')[3];
    const labels = { fleet:'Fleet', inventory:'Inventory' };
    return { module: 'Armory', page: labels[seg] || null };
  }
  if (pathname === '/app/roster') return { module: 'Roster', page: null };
  if (pathname === '/app/settings' || pathname === '/app/profile') return { module: 'Settings', page: null };
  if (pathname === '/app/handbook') return { module: 'Handbook', page: null };
  if (pathname === '/app/training') return { module: 'Training', page: null };
  if (pathname === '/app/keys') return { module: 'Admin', page: 'Keys' };
  if (pathname === '/app/admin/settings') return { module: 'Admin', page: 'Settings' };
  if (pathname === '/app/admin/todo') return { module: 'Admin', page: 'Tasks' };
  return { module: 'NexusOS', page: null };
}

/* ═══ Chip ══════════════════════════════════════════════════════════════════ */

function Chip({ dot, dotPulse, label, value, valueColor, bg, borderColor, onClick, title }) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 2, cursor: onClick ? 'pointer' : 'default',
        background: bg || 'rgba(200,170,100,0.06)',
        border: `0.5px solid ${borderColor || 'rgba(200,170,100,0.14)'}`,
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
        transition: 'border-color 150ms',
        flexShrink: 0, whiteSpace: 'nowrap',
      }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.28)'; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.borderColor = borderColor || 'rgba(200,170,100,0.14)'; } : undefined}
    >
      {dot && (
        <span style={{
          width: 4, height: 4, borderRadius: '50%', background: dot, flexShrink: 0,
          animation: dotPulse ? 'pulse 2s ease-in-out infinite' : 'none',
        }} aria-hidden="true" />
      )}
      {label && <span style={{ color: '#5A5850' }}>{label}</span>}
      <span style={{ color: valueColor || '#9A9488' }}>{value}</span>
    </div>
  );
}

/* ═══ Topbar ════════════════════════════════════════════════════════════════ */

export default function NexusTopbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();

  const breadcrumb = useMemo(
    () => getBreadcrumb(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const [cofferBalance, setCofferBalance] = useState(null);
  const [personalBalance, setPersonalBalance] = useState(null);
  const [refineryCount, setRefineryCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [liveOpsCount, setLiveOpsCount] = useState(0);

  const loadMetrics = useCallback(async () => {
    try {
      const [cofferLogs, refineryOrders, members, liveOps, me] = await Promise.all([
        base44.entities.CofferLog.list('-logged_at', 500).catch(() => []),
        base44.entities.RefineryOrder.list('-started_at', 200).catch(() => []),
        base44.entities.NexusUser.list('-last_seen_at', 500).catch(() => []),
        base44.entities.Op.filter({ status: 'LIVE' }).catch(() => []),
        base44.entities.NexusUser.filter({ id: user?.id }).catch(() => []),
      ]);

      // Coffer balance
      const positive = ['SALE', 'CRAFT_SALE', 'OP_SPLIT', 'DEPOSIT'];
      const balance = (cofferLogs || []).reduce((sum, e) => {
        return positive.includes(e.entry_type) ? sum + (e.amount_aUEC || 0) : sum - (e.amount_aUEC || 0);
      }, 0);
      setCofferBalance(balance);

      // Personal wallet
      const myRecord = Array.isArray(me) && me.length > 0 ? me[0] : null;
      setPersonalBalance(myRecord?.aUEC_balance ?? 0);

      // Refinery
      const active = (refineryOrders || []).filter(r => r.status === 'ACTIVE' || r.status === 'READY');
      setRefineryCount(active.length);

      // Online (last 15 min)
      const cutoff = Date.now() - 15 * 60 * 1000;
      const online = (members || []).filter(m => m.last_seen_at && new Date(m.last_seen_at).getTime() > cutoff);
      setOnlineCount(online.length);

      // Live ops
      setLiveOpsCount(Array.isArray(liveOps) ? liveOps.length : 0);
    } catch {
      // individual catches above prevent full failure
    }
  }, [user?.id]);

  useEffect(() => {
    loadMetrics();
    const id = setInterval(loadMetrics, 60000);
    return () => clearInterval(id);
  }, [loadMetrics]);

  const callsignShort = (user?.callsign || 'UNKN').slice(0, 4).toUpperCase();

  return (
    <header style={{
      height: 48, background: '#0A0908',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 16,
      flexShrink: 0, zIndex: 50, boxSizing: 'border-box',
    }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }`}</style>

      {/* ── Wordmark ── */}
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
        <span style={{ color: '#E8E4DC' }}>NEXUS</span>
        <span style={{ color: '#C0392B' }}>OS</span>
      </span>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, marginLeft: 8 }}>
        <div style={{ width: 1, height: 18, background: 'rgba(200,170,100,0.15)', marginRight: 16, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#C8A84B', textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
          {breadcrumb.module}
        </span>
        {breadcrumb.page && (
          <>
            <span style={{ color: '#5A5850', margin: '0 6px', fontSize: 10 }}>/</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 12, color: '#E8E4DC', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {breadcrumb.page}
            </span>
          </>
        )}
      </div>

      {/* ── Live status chips ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, overflow: 'hidden', maskImage: 'linear-gradient(to right, black 90%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}>
        {/* Org coffer */}
        <Chip
          dot="#4A8C5C"
          label="ORG"
          value={fmtAuec(cofferBalance)}
          valueColor={cofferBalance != null && cofferBalance < 0 ? '#C0392B' : '#4A8C5C'}
          onClick={() => navigate('/app/industry?tab=coffer')}
          title="Organization Coffer"
        />

        {/* Personal wallet */}
        <Chip
          dot="#C8A84B"
          label={callsignShort}
          value={fmtAuec(personalBalance)}
          valueColor="#C8A84B"
          onClick={() => navigate('/app/settings')}
          title="Personal Wallet"
        />

        {/* Refinery */}
        {refineryCount > 0 && (
          <Chip
            dot="#C8A84B"
            dotPulse
            value={`${refineryCount} REFINING`}
            valueColor="#C8A84B"
            onClick={() => navigate('/app/industry?tab=refinery')}
            title="Active Refinery Orders"
          />
        )}

        {/* Live ops */}
        {liveOpsCount > 0 && (
          <Chip
            dot="#C0392B"
            dotPulse
            value={`${liveOpsCount} LIVE`}
            valueColor="#C0392B"
            bg="rgba(192,57,43,0.1)"
            borderColor="rgba(192,57,43,0.3)"
            onClick={() => navigate('/app/ops')}
            title="Live Operations"
          />
        )}

        {/* Online */}
        <Chip
          dot="#4A8C5C"
          value={`${onlineCount} ONLINE`}
          valueColor="#9A9488"
          title="Members Online (last 15 min)"
        />
      </div>

      {/* ── Right section ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
        {/* Verse pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 2,
          background: 'rgba(192,57,43,0.15)',
          border: '0.5px solid #C0392B',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          fontSize: 10, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0392B', animation: 'pulse 2.5s ease-in-out infinite', flexShrink: 0 }} aria-hidden="true" />
          LIVE 4.7.0
        </div>

        {/* User chip */}
        <div
          onClick={() => navigate('/app/settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
            background: '#141410',
            border: '0.5px solid rgba(200,170,100,0.15)',
            transition: 'border-color 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.28)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.15)'; }}
          title="Settings"
        >
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#E8E4DC' }}>
            {user?.callsign || 'UNKNOWN'}
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 9,
            color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.08em',
            background: 'rgba(90,88,80,0.15)', border: '0.5px solid rgba(90,88,80,0.25)',
            borderRadius: 2, padding: '1px 5px',
          }}>
            {user?.rank || 'AFFILIATE'}
          </span>
          {user?.op_role && (
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 10, color: '#C8A84B' }}>
              {user.op_role}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}