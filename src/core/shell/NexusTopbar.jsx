import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
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

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function getBreadcrumb(pathname, search) {
  const p = new URLSearchParams(search || '');
  const tab = p.get('tab');

  if (pathname.startsWith('/app/industry')) {
    const seg = pathname.split('/')[3];
    const labels = {
      overview: 'Overview',
      guide: 'Guide',
      materials: 'Materials',
      blueprints: 'Blueprints',
      craft: 'Craft Queue',
      production: 'Production',
      refinery: 'Refinery',
      logistics: 'Logistics',
      commerce: 'Commerce',
      cargo: 'Cargo',
      prices: 'Prices',
      analytics: 'Analytics',
      components: 'Components',
      coffer: 'Coffer',
      lifecycle: 'Lifecycle',
      ownership: 'Ownership',
      treasury: 'Treasury',
      requisitions: 'Requisitions',
      forecast: 'Forecast',
      pipeline: 'Pipeline',
      craftable: 'Craftable',
      missions: 'Missions',
      dismantle: 'Dismantle',
      wishlist: 'Wishlist',
      costcalc: 'Cost Calc',
      cargoplanner: 'SCU Plan',
    };
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
    if (p.get('view') === 'analytics') return { module: 'Operations', page: 'Analytics' };
    const status = p.get('status');
    if (status === 'complete') return { module: 'Operations', page: 'Complete Ops' };
    if (status === 'all') return { module: 'Operations', page: 'All Ops' };
    return { module: 'Operations', page: 'Board' };
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
  if (pathname === '/app/keys' || pathname === '/app/admin/keys') return { module: 'Admin', page: 'Keys' };
  if (pathname === '/app/admin/data') return { module: 'Admin', page: 'Data Console' };
  if (pathname === '/app/admin/settings') return { module: 'Admin', page: 'Settings' };
  if (pathname === '/app/admin/readiness' || pathname === '/app/admin/todo') return { module: 'Admin', page: 'Readiness' };
  return { module: 'NexusOS', page: null };
}

function routeForNotification(notification) {
  const moduleName = String(notification?.source_module || '').toUpperCase();
  if (moduleName === 'OPS') return '/app/ops';
  if (moduleName === 'SCOUT') return '/app/scout';
  if (moduleName === 'INDUSTRY') return '/app/industry';
  if (moduleName === 'ARMORY') return '/app/armory';
  if (moduleName === 'ORG') return '/app/roster';
  return null;
}

function notificationSeverityColor(severity) {
  if (severity === 'CRITICAL') return '#E04848';
  if (severity === 'WARN') return '#E8A020';
  return '#27C96A';
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
  const { user, patchUser } = useSession();
  const notificationRef = useRef(null);

  const breadcrumb = useMemo(
    () => getBreadcrumb(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const [cofferBalance, setCofferBalance] = useState(null);
  const [personalBalance, setPersonalBalance] = useState(null);
  const [refineryCount, setRefineryCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [liveOpsCount, setLiveOpsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    try {
      const records = await base44.entities.NexusNotification.list('-created_at', 50).catch(() => []);
      const rows = Array.isArray(records) ? records : [];
      setNotifications(rows.filter((item) =>
        !item?.target_user_id || String(item.target_user_id) === String(user.id),
      ));
    } catch {
      setNotifications([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    loadNotifications();
    const unsubscribe = base44.entities.NexusNotification.subscribe(() => {
      loadNotifications();
    });

    return () => unsubscribe?.();
  }, [loadNotifications, user?.id]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!notificationRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [notificationsOpen]);

  const markNotificationsSeen = useCallback(async () => {
    if (!user?.id) return;
    const seenAt = new Date().toISOString();
    patchUser({ notifications_seen_at: seenAt });
    try {
      await base44.entities.NexusUser.update(user.id, { notifications_seen_at: seenAt });
    } catch (error) {
      console.warn('[NexusTopbar] notifications_seen_at update failed:', error?.message || error);
    }
  }, [patchUser, user?.id]);

  const handleNotificationToggle = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      await markNotificationsSeen();
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification?.target_user_id && String(notification.target_user_id) === String(user?.id) && !notification.is_read) {
      try {
        await base44.entities.NexusNotification.update(notification.id, { is_read: true });
        setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
      } catch (error) {
        console.warn('[NexusTopbar] notification mark-read failed:', error?.message || error);
      }
    }

    const route = routeForNotification(notification);
    setNotificationsOpen(false);
    if (route) {
      navigate(route);
    }
  };

  const recentNotifications = useMemo(() => {
    return [...notifications]
      .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
      .slice(0, 10);
  }, [notifications]);

  const unreadNotifications = useMemo(() => {
    const seenAt = new Date(user?.notifications_seen_at || 0).getTime();
    return recentNotifications.reduce((count, notification) => {
      const targeted = notification?.target_user_id && String(notification.target_user_id) === String(user?.id);
      if (targeted) {
        return notification.is_read ? count : count + 1;
      }

      const createdAt = new Date(notification?.created_at || 0).getTime();
      return Number.isFinite(createdAt) && createdAt > seenAt ? count + 1 : count;
    }, 0);
  }, [recentNotifications, user?.id, user?.notifications_seen_at]);

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
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={handleNotificationToggle}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.15)',
              borderRadius: 2,
              color: unreadNotifications > 0 ? '#C8A84B' : '#9A9488',
              cursor: 'pointer',
              position: 'relative',
            }}
            title="Notifications"
          >
            <Bell size={14} />
            {unreadNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 14,
                height: 14,
                padding: '0 3px',
                borderRadius: 7,
                background: '#C0392B',
                color: '#F0EDE5',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                lineHeight: '14px',
              }}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div style={{
              position: 'absolute',
              top: 38,
              right: 0,
              width: 320,
              background: '#0F0F0D',
              border: '0.5px solid rgba(200,170,100,0.15)',
              borderRadius: 2,
              overflow: 'hidden',
              zIndex: 80,
            }}>
              <div style={{
                padding: '10px 12px',
                borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#C8A84B',
              }}>
                Notifications
              </div>

              {recentNotifications.length === 0 ? (
                <div style={{ padding: '14px 12px', color: '#9A9488', fontSize: 11 }}>
                  No notifications.
                </div>
              ) : (
                recentNotifications.map((notification) => {
                  const severityColor = notificationSeverityColor(notification.severity);
                  const targeted = notification?.target_user_id && String(notification.target_user_id) === String(user?.id);
                  const isUnread = targeted
                    ? !notification.is_read
                    : new Date(notification.created_at || 0).getTime() > new Date(user?.notifications_seen_at || 0).getTime();

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        background: isUnread ? 'rgba(200,170,100,0.04)' : 'transparent',
                        border: 'none',
                        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 10,
                      }}
                    >
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: severityColor,
                        marginTop: 5,
                        flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 3,
                        }}>
                          <span style={{
                            color: '#E8E4DC',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 11,
                            fontWeight: isUnread ? 700 : 500,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}>
                            {notification.title}
                          </span>
                          <span style={{ color: '#5A5850', fontSize: 9, whiteSpace: 'nowrap' }}>
                            {relativeTime(notification.created_at)}
                          </span>
                        </span>
                        <span style={{
                          color: '#9A9488',
                          fontSize: 11,
                          lineHeight: 1.4,
                          display: 'block',
                        }}>
                          {notification.body}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

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
