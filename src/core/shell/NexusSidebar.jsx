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
    { icon: Truck, label: 'ROUTES', path: '/app/routes' },
  ],
  [
    { icon: IndustryIcon, label: 'INDUSTRY', path: '/app/industry', badge: 'craft' },
    { icon: FleetIcon, label: 'ORG FLEET', path: '/app/org-fleet' },
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
        width: 52,
        background: 'linear-gradient(180deg, #0A0908 0%, #080709 100%)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes sidebar-live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #C0392B; }
          50% { opacity: 0.4; box-shadow: 0 0 2px #C0392B; }
        }
        @keyframes sidebar-craft-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .nexus-nav-link {
          text-decoration: none !important;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 38px;
          height: 36px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          background: transparent;
          border: 0.5px solid transparent;
          color: #8B8078;
        }
        .nexus-nav-link:hover:not(.active) {
          background: rgba(200,168,75,0.10) !important;
          border-color: rgba(200,168,75,0.25) !important;
          color: #E8E4DC !important;
          box-shadow: inset 0 1px 0 rgba(200,168,75,0.1) !important;
        }
        .nexus-nav-link.active {
          background: linear-gradient(135deg, rgba(192,57,43,0.18) 0%, rgba(192,57,43,0.10) 100%) !important;
          border-color: rgba(192,57,43,0.65) !important;
          color: #E8E4DC !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px rgba(192,57,43,0.20), inset -1px 0 2px rgba(192,57,43,0.3) !important;
        }
      `}</style>

      {/* Red accent stripe — glowing */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '2.5px',
        background: 'linear-gradient(180deg, transparent 0%, #C0392B 12%, #C0392B 88%, transparent 100%)',
        boxShadow: '0 0 12px rgba(192,57,43,0.4), inset 1px 0 2px rgba(192,57,43,0.6)',
        zIndex: 2,
      }} />

      {/* Top crown — compass pip */}
      <div style={{
        width: '100%',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '0.5px solid rgba(200,170,100,0.08)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Redscar compass mark */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="rgba(200,168,75,0.25)" strokeWidth="0.75"/>
          <circle cx="12" cy="12" r="5" stroke="#C0392B" strokeWidth="0.75" opacity="0.7"/>
          <circle cx="12" cy="12" r="2" fill="#C0392B" opacity="0.9"/>
          <line x1="12" y1="2" x2="12" y2="6" stroke="rgba(232,228,220,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          <polygon points="12,2 11,6 12,5 13,6" fill="#E8E4DC" opacity="0.8"/>
        </svg>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%', padding: '6px 0' }}>
        {NAV_GROUPS.map((group, groupIdx) => (
          <React.Fragment key={`group-${groupIdx}`}>
            {groupIdx > 0 ? (
              <div style={{
                width: 24,
                height: '0.5px',
                background: 'linear-gradient(90deg, transparent, rgba(200,170,100,0.2), transparent)',
                margin: '4px 0',
              }} />
            ) : null}
            {group.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              const badgeActive = item.badge ? badges[item.badge] : false;
              const isLiveBadge = item.badge === 'live';
              const canAccess = canAccessItem(item);

              if (!canAccess) return null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nexus-nav-link${isActive ? ' active' : ''}`}
                  data-tip={item.label}
                  style={{
                    border: `0.5px solid ${isActive ? 'rgba(192,57,43,0.55)' : 'transparent'}`,
                    color: isActive ? '#E8E4DC' : '#7A7470',
                  }}
                >
                  <Icon size={14} />
                  {badgeActive ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        border: '1.5px solid #0A0908',
                        background: isLiveBadge ? '#C0392B' : '#C8A84B',
                        boxShadow: isLiveBadge 
                          ? '0 0 6px rgba(192,57,43,0.8)' 
                          : '0 0 4px rgba(200,168,75,0.6)',
                        animation: isLiveBadge
                          ? 'sidebar-live-pulse 2s ease-in-out infinite'
                          : 'sidebar-craft-pulse 3s ease-in-out infinite',
                      }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>



      {/* Dev sim indicator */}
      {IS_DEV_MODE ? (
        <div style={{
          width: '100%',
          borderTop: '0.5px solid rgba(200,168,75,0.1)',
          paddingTop: 7,
          paddingBottom: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          flexShrink: 0,
        }}>
          <div style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#C8A84B',
            animation: 'pulse-dot 2.5s ease-in-out infinite',
            boxShadow: '0 0 4px rgba(200,168,75,0.5)',
          }} />
          <span style={{
            fontSize: 7,
            color: 'rgba(200,168,75,0.5)',
            letterSpacing: '0.2em',
            userSelect: 'none',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>SIM</span>
        </div>
      ) : null}
    </nav>
  );
}