import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { IS_DEV_MODE } from '@/core/data/dev';
import { RankBadge } from '@/core/design';
import {
  FleetIcon,
  IndustryIcon,
  OpBoardIcon,
  ScoutIcon,
  SettingsIcon,
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
    { icon: Coins, label: 'COMMERCE', path: '/app/commerce' },
    { icon: Truck, label: 'LOGISTICS', path: '/app/logistics' },
  ],
  [
    { icon: SettingsIcon, label: 'SETTINGS', path: '/app/profile' },
    { icon: SettingsIcon, label: 'ADMIN SETTINGS', path: '/app/admin/settings', badge: null, rank: ['PIONEER', 'FOUNDER'] },
  ],
];

export default function NexusSidebar({ currentPath, rank = 'AFFILIATE' }) {
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

  const canAccessItem = (item) => {
    if (!item.rank) return true;
    return item.rank.includes(rank);
  };

  return (
    <nav
      style={{
        width: 50,
        background: '#08080A',
        borderRight: '0.5px solid rgba(200,170,100,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: 2,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Left red accent stripe */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '2px',
        background: '#C0392B',
      }} />
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
              const canAccess = canAccessItem(item);

              if (!canAccess) return null;

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
                     border: `0.5px solid ${isActive ? '#C0392B' : 'transparent'}`,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
                     position: 'relative',
                     background: isActive ? 'rgba(192,57,43,0.12)' : 'transparent',
                     color: isActive ? '#E8E4DC' : '#9A9488',
                   }}
                   onMouseEnter={(event) => {
                     if (!isActive) {
                       event.currentTarget.style.background = 'rgba(200,170,100,0.06)';
                       event.currentTarget.style.borderColor = 'rgba(200,170,100,0.12)';
                       event.currentTarget.style.color = '#E8E4DC';
                     }
                   }}
                   onMouseLeave={(event) => {
                     if (!isActive) {
                       event.currentTarget.style.background = 'transparent';
                       event.currentTarget.style.borderColor = 'transparent';
                       event.currentTarget.style.color = '#9A9488';
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
                        border: '1.5px solid #08080A',
                        background: '#C0392B',
                      }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {rank && rank !== 'AFFILIATE' && (
        <div style={{
          width: '100%',
          borderTop: '0.5px solid var(--b1)',
          padding: '8px 0 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          flexShrink: 0,
        }}>
          <RankBadge rank={rank} size={14} />
          <span style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em' }}>{rank}</span>
        </div>
      )}

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