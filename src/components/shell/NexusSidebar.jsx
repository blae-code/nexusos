import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  BlueprintIcon,
  CofferIcon,
  CompassMark,
  FleetIcon,
  IndustryIcon,
  OpBoardIcon,
  RescueIcon,
  RosterIcon,
  ScoutIcon,
  SettingsIcon,
} from './NexusIcons';

const NAV_ITEMS = [
  { icon: IndustryIcon, label: 'Industry Hub', path: '/app/industry', badge: 'craft' },
  { icon: OpBoardIcon, label: 'Op Board', path: '/app/ops', badge: 'live' },
  { icon: ScoutIcon, label: 'Scout Intel', path: '/app/scout' },
  { icon: FleetIcon, label: 'Fleet Forge', path: '/app/fleet' },
  { icon: BlueprintIcon, label: 'Blueprint Registry', path: '/app/industry?tab=blueprints', badge: 'blueprints' },
  null,
  { icon: CofferIcon, label: 'Coffer', path: '/app/coffer' },
  { icon: RescueIcon, label: 'Rescue', path: '/app/rescue' },
  { icon: RosterIcon, label: 'Roster', path: '/app/roster' },
  null,
  { icon: SettingsIcon, label: 'Profile Settings', path: '/app/profile' },
];

export default function NexusSidebar({ currentPath, currentSearch }) {
  const [badges, setBadges] = useState({
    craft: false,
    live: false,
    blueprints: false,
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

        if (cancelled) return;

        setBadges({
          craft: (craftQueue || []).some((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)),
          live: Array.isArray(liveOps) && liveOps.length > 0,
          blueprints: (priorityBlueprints || []).some((item) => !(item.owned_by || item.owned_by_callsign)),
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusSidebar] badge load failed:', error?.message || error);
        }
      }
    };

    loadBadges();
    const intervalId = window.setInterval(loadBadges, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

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
      style={{
        width: 52,
        background: 'var(--bg1)',
        borderRight: '0.5px solid var(--b1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: 2,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cyan)',
          marginBottom: 2,
          filter: 'drop-shadow(0 0 4px rgba(0,200,232,0.35))',
        }}
      >
        <CompassMark size={22} />
      </div>

      {NAV_ITEMS.map((item, index) => {
        if (item === null) {
          return (
            <div
              key={`divider-${index}`}
              style={{ width: 26, height: '0.5px', background: 'var(--b1)', margin: '4px 0' }}
            />
          );
        }

        const Icon = item.icon;
        const isActive = isActiveRoute(item.path);
        const badgeActive = item.badge ? badges[item.badge] : false;
        const badgeColor = item.badge === 'live' ? 'var(--live)' : item.badge === 'craft' ? 'var(--cyan)' : 'var(--warn)';

        return (
          <Link
            key={item.path}
            to={item.path}
            className="nexus-tooltip"
            data-tip={item.label}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 6,
              cursor: 'pointer',
              border: `0.5px solid ${isActive ? 'rgba(0,200,232,0.25)' : 'transparent'}`,
              background: isActive ? 'rgba(0,200,232,0.08)' : 'transparent',
              color: isActive ? 'var(--cyan)' : 'var(--t2)',
              boxShadow: isActive ? '0 0 10px rgba(0,200,232,0.12)' : 'none',
              transition: 'all 0.12s',
              textDecoration: 'none',
            }}
            onMouseEnter={(event) => {
              if (!isActive) {
                event.currentTarget.style.background = 'var(--bg3)';
                event.currentTarget.style.borderColor = 'var(--b2)';
                event.currentTarget.style.color = 'var(--t1)';
              }
            }}
            onMouseLeave={(event) => {
              if (!isActive) {
                event.currentTarget.style.background = 'transparent';
                event.currentTarget.style.borderColor = 'transparent';
                event.currentTarget.style.color = 'var(--t2)';
              }
            }}
          >
            <Icon size={16} />
            {badgeActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: badgeColor,
                  border: '1.5px solid var(--bg0)',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}