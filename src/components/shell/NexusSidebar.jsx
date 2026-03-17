import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getActiveRescueCount, loadRescueCalls, refreshRescueCalls, subscribeToRescueCalls } from '@/lib/rescue-board-store';
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
import { BookOpen } from 'lucide-react';

const BASE_NAV_ITEMS = [
  { icon: IndustryIcon, label: 'Industry Hub', path: '/app/industry', badge: 'craft' },
  { icon: OpBoardIcon, label: 'Op Board', path: '/app/ops', badge: 'live' },
  { icon: ScoutIcon, label: 'Scout Intel', path: '/app/scout' },
  { icon: FleetIcon, label: 'Fleet Forge', path: '/app/fleet' },
  { icon: BlueprintIcon, label: 'Blueprint Registry', path: '/app/industry?tab=blueprints', badge: 'blueprints' },
  null,
  { icon: CofferIcon, label: 'Coffer', path: '/app/coffer' },
  { icon: RescueIcon, label: 'Rescue', path: '/app/rescue', badge: 'rescue' },
  { icon: RosterIcon, label: 'Roster', path: '/app/roster' },
  { icon: RosterIcon, label: 'Armory', path: '/app/armory' },
  null,
  { icon: BookOpen, label: 'Org Handbook', path: '/app/handbook' },
  { icon: SettingsIcon, label: 'Profile Settings', path: '/app/profile' },
];

const ADMIN_NAV_ITEMS = [
  { icon: KeyIcon, label: 'Key Management', path: '/app/admin/keys' },
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
            : 'var(--warn)';

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
              background: isActive ? 'rgba(var(--acc-rgb, 90,96,208), 0.08)' : 'transparent',
              color: isActive ? 'var(--acc)' : 'var(--t3)',
            }}
            onMouseEnter={(event) => {
              if (!isActive) {
                event.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                event.currentTarget.style.color = 'var(--t1)';
              }
            }}
            onMouseLeave={(event) => {
              if (!isActive) {
                event.currentTarget.style.background = 'transparent';
                event.currentTarget.style.color = 'var(--t3)';
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
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  border: '1.5px solid var(--bg0)',
                  background: badgeColor,
                }}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}