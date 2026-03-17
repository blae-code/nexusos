import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { IS_DEV_MODE } from '@/core/data/dev';
import { getActiveRescueCount, loadRescueCalls, refreshRescueCalls, subscribeToRescueCalls } from '@/core/data/rescue-board-store';
import {
  BlueprintIcon,
  CofferIcon,
  FleetIcon,
  IndustryIcon,
  KeyIcon,
  OpBoardIcon,
  RescueIcon,
  RosterIcon,
  ScoutIcon,
  SettingsIcon,
} from './NexusIcons';
import { Archive, BarChart2, BookOpen, TrendingUp } from 'lucide-react';

const NAV_STRUCTURE = [
  {
    group: 'OPERATIONS',
    items: [
      { icon: OpBoardIcon, label: 'OPERATIONS', path: '/app/ops', badge: 'live' },
    ],
  },
  {
    group: 'INTELLIGENCE',
    items: [
      { icon: ScoutIcon, label: 'INTEL', path: '/app/scout' },
      { icon: Archive, label: 'ARCHIVE', path: '/app/archive' },
    ],
  },
  {
    group: 'INDUSTRY',
    items: [
      { icon: IndustryIcon, label: 'INDUSTRY', path: '/app/industry', badge: 'craft' },
      { icon: RosterIcon, label: 'ARMORY', path: '/app/armory' },
    ],
  },
  {
    group: 'COMMAND',
    items: [
      { icon: SettingsIcon, label: 'Settings', path: '/app/profile' },
    ],
  },
];

export default function NexusSidebar({ currentPath, currentSearch, rank }) {
  const [badges, setBadges] = useState({
    craft: false,
    live: false,
    blueprints: false,
    rescue: false,
  });

  useEffect(() => {
    let cancelled = false;

    const loadBadges = async () => {
      try {
        const [craftQueue, liveOps, priorityBlueprints] = await Promise.all([
          base44.entities.CraftQueue.list('-created_date', 50),
          base44.entities.Op.filter({ status: 'LIVE' }),
          base44.entities.Blueprint.filter({ is_priority: true }),
        ]);

        if (cancelled) {
          return;
        }

        const rescueCalls = await refreshRescueCalls();
        setBadges({
          craft: (craftQueue || []).some((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)),
          live: Array.isArray(liveOps) && liveOps.length > 0,
          blueprints: (priorityBlueprints || []).some((item) => !(item.owned_by || item.owned_by_callsign)),
          rescue: getActiveRescueCount(rescueCalls || loadRescueCalls()) > 0,
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusSidebar] badge load failed:', error?.message || error);
        }
      }
    };

    loadBadges();
    const intervalId = window.setInterval(loadBadges, 45000);
    const unsubscribeRescue = subscribeToRescueCalls((calls) => {
      if (cancelled) {
        return;
      }

      setBadges((current) => ({
        ...current,
        rescue: getActiveRescueCount(calls) > 0,
      }));
    });

    return () => {
      cancelled = true;
      unsubscribeRescue();
      window.clearInterval(intervalId);
    };
  }, []);

  const isElevated = ['PIONEER', 'FOUNDER', 'SYSTEM_ADMIN'].includes(rank || '');
  const navItems = useMemo(
    () => isElevated ? [...BASE_NAV_ITEMS, null, ...ADMIN_NAV_ITEMS] : BASE_NAV_ITEMS,
    [isElevated],
  );

  const searchParams = useMemo(() => new URLSearchParams(currentSearch || ''), [currentSearch]);

  const isActiveRoute = (path) => {
    if (path.startsWith('/app/industry?tab=')) {
      return currentPath === '/app/industry' && searchParams.get('tab') === path.split('=')[1];
    }

    if (path === '/app/profile') {
      return currentPath === '/app/profile' || currentPath === '/app/settings';
    }

    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  return (
    <nav
      className="nexus-sidebar"
      style={{
        width: 'var(--sidebar-w)',
        background: 'var(--bg0)',
        borderRight: '0.5px solid var(--b1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: 2,
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
      {navItems.map((item, index) => {
        if (item === null) {
          return (
            <div
              key={`divider-${index}`}
              style={{
                width: 22,
                height: '0.5px',
                background: 'var(--b0)',
                margin: '3px 0',
              }}
            />
          );
        }

        const Icon = item.icon;
        const isActive = isActiveRoute(item.path);
        const badgeActive = item.badge ? badges[item.badge] : false;
        const badgeColor = item.badge === 'live'
          ? 'var(--live)'
          : item.badge === 'rescue'
            ? 'var(--danger)'
            : item.badge === 'blueprints' || item.badge === 'craft'
              ? 'var(--warn)'
              : 'var(--t2)';

        return (
          <Link
            key={item.path}
            to={item.path}
            className="nexus-tooltip"
            data-tip={item.label}
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              cursor: 'pointer',
              borderLeft: isActive ? '3px solid var(--acc)' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms ease, border-left-color 150ms ease, color 150ms ease',
              position: 'relative',
              background: isActive ? 'rgba(var(--acc-rgb), 0.12)' : 'transparent',
              color: isActive ? 'var(--acc)' : 'var(--t2)',
            }}
            onMouseEnter={(event) => {
              if (!isActive) {
                event.currentTarget.style.background = 'rgba(var(--acc-rgb), 0.07)';
              }
            }}
            onMouseLeave={(event) => {
              if (!isActive) {
                event.currentTarget.style.background = 'transparent';
                event.currentTarget.style.color = 'var(--t2)';
              }
            }}
          >
            <Icon size={16} />
            {badgeActive ? (
              <div
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  border: '1.5px solid var(--bg0)',
                  background: badgeColor,
                }}
              />
            ) : null}
          </Link>
        );
      })}
      </div>

      {IS_DEV_MODE ? (
        <div
          style={{
            width: '100%',
            borderTop: '0.5px solid rgba(var(--warn-rgb), 0.18)',
            paddingTop: 8,
            paddingBottom: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 8, color: 'rgba(var(--warn-rgb), 0.6)', letterSpacing: '0.18em', userSelect: 'none' }}>SIM</span>
        </div>
      ) : null}
    </nav>
  );
}