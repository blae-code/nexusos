import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { IS_DEV_MODE } from '@/core/data/dev';
import {
  FleetIcon,
  IndustryIcon,
  OpBoardIcon,
  ScoutIcon,
  SettingsIcon,
  PricesIcon,
} from './NexusIcons';
import { Archive, Coins, Truck } from 'lucide-react';

const NAV_GROUPS = [
  [
    { icon: OpBoardIcon, label: 'OPERATIONS', path: '/app/ops', badge: 'live' },
    { icon: ScoutIcon, label: 'INTEL', path: '/app/scout' },
    { icon: Archive, label: 'ARCHIVE', path: '/app/archive' },
  ],
  [
    { icon: IndustryIcon, label: 'INDUSTRY', path: '/app/industry', badge: 'craft' },
    { icon: FleetIcon, label: 'ARMORY', path: '/app/armory' },
    { icon: PricesIcon, label: 'PRICES', path: '/app/prices' },
    { icon: Coins, label: 'COMMERCE', path: '/app/commerce' },
    { icon: Truck, label: 'LOGISTICS', path: '/app/logistics' },
  ],
  [
    { icon: SettingsIcon, label: 'SETTINGS', path: '/app/profile' },
  ],
];

export default function NexusSidebar({ currentPath }) {
  const [badges, setBadges] = useState({
    craft: false,
    live: false,
  });

  useEffect(() => {
    let cancelled = false;

    const loadBadges = async () => {
      try {
        const [craftQueue, liveOps] = await Promise.all([
          base44.entities.CraftQueue.list('-created_date', 50),
          base44.entities.Op.filter({ status: 'LIVE' }),
        ]);

        if (cancelled) {
          return;
        }

        setBadges({
          craft: (craftQueue || []).some((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)),
          live: Array.isArray(liveOps) && liveOps.length > 0,
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

  const isActiveRoute = (path) => {
    if (path === '/app/profile') {
      return currentPath === '/app/profile' || currentPath === '/app/settings';
    }
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  return (
    <nav
      style={{
        width: 50,
        background: 'var(--bg0)',
        borderRight: '0.5px solid var(--b0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: 2,
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
        {NAV_GROUPS.map((group, groupIdx) => (
          <React.Fragment key={`group-${groupIdx}`}>
            {groupIdx > 0 ? (
              <div
                style={{
                  width: 22,
                  height: '0.5px',
                  background: 'var(--b0)',
                  margin: '3px 0',
                }}
              />
            ) : null}
            {group.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              const badgeActive = item.badge ? badges[item.badge] : false;
              const badgeColor = item.badge === 'live' ? 'var(--live)' : item.badge === 'craft' ? 'var(--warn)' : 'var(--t2)';

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="nexus-sidebar-link"
                  data-tip={item.label}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: `0.5px solid ${isActive ? 'var(--b2)' : 'transparent'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
                    position: 'relative',
                    background: isActive ? 'var(--bg3)' : 'transparent',
                    color: isActive ? 'var(--acc2)' : 'var(--t2)',
                  }}
                  onMouseEnter={(event) => {
                    if (!isActive) {
                      event.currentTarget.style.background = 'var(--bg2)';
                      event.currentTarget.style.borderColor = 'var(--b1)';
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
          </React.Fragment>
        ))}
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