import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { IS_DEV_MODE, IS_SHARED_SANDBOX_MODE } from '@/core/data/dev';
import { RankBadge } from '@/core/design';
import {
  OpBoardIcon,
  SettingsIcon,
} from './NexusIcons';

const NAV_GROUPS = [
  [
    { icon: OpBoardIcon, label: 'OPERATIONS', path: '/app/ops', badge: 'live' },
    { icon: 'https://www.redscar.org/images/Redscar-Rangers_Logo.png', label: 'INTEL', path: '/app/scout', isImage: true },
    { icon: 'https://www.redscar.org/images/Redscar-Industry-Icon_White.png', label: 'INDUSTRY', path: '/app/industry', badge: 'craft', isImage: true },
    { icon: 'https://www.redscar.org/images/Redscar-Rescue_Icon.png', label: 'ARMORY', path: '/app/armory', isImage: true },
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
        boxShadow: 'inset -1px 0 2px rgba(200,170,100,0.08)',
      }}
    >
      <style>{`
        @keyframes sidebar-live-pulse {
          0% { 
            opacity: 1; 
            box-shadow: 0 0 6px rgba(192,57,43,0.8), inset 0 0 4px rgba(192,57,43,0.2);
          }
          50% { 
            opacity: 0.5; 
            box-shadow: 0 0 3px rgba(192,57,43,0.4), inset 0 0 2px rgba(192,57,43,0.1);
          }
          100% {
            opacity: 1;
            box-shadow: 0 0 6px rgba(192,57,43,0.8), inset 0 0 4px rgba(192,57,43,0.2);
          }
        }
        @keyframes sidebar-craft-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(200,168,75,0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 2px rgba(200,168,75,0.2); }
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
          transition: all 140ms cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
          background: transparent;
          border: 0.5px solid transparent;
          color: #8B8078;
          font-smoothing: antialiased;
          -webkit-font-smoothing: antialiased;
        }
        .nexus-nav-link:hover:not(.active) {
          background: rgba(200,168,75,0.12) !important;
          border-color: rgba(200,168,75,0.3) !important;
          color: #E8E4DC !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(200,168,75,0.1) !important;
          transform: translateY(-1px);
        }
        .nexus-nav-link.active {
          background: linear-gradient(135deg, rgba(192,57,43,0.2) 0%, rgba(192,57,43,0.08) 100%) !important;
          border-color: rgba(192,57,43,0.7) !important;
          color: #E8E4DC !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(192,57,43,0.25), inset -2px 0 3px rgba(192,57,43,0.4) !important;
        }
        .nexus-nav-link img {
          image-rendering: crisp-edges;
          filter: drop-shadow(0 0 0.5px rgba(0,0,0,0.3));
        }
      `}</style>

      {/* Red accent stripe — premium glow */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '2.5px',
        background: 'linear-gradient(180deg, rgba(192,57,43,0.2) 0%, #C0392B 10%, #C0392B 90%, rgba(192,57,43,0.2) 100%)',
        boxShadow: '0 0 16px rgba(192,57,43,0.5), inset 1px 0 3px rgba(192,57,43,0.8), -2px 0 8px rgba(192,57,43,0.3)',
        zIndex: 2,
      }} />

      {/* Top crown — Redscar logo */}
      <div style={{
        width: '100%',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        flexShrink: 0,
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(192,57,43,0.05) 0%, transparent 100%)',
      }}>
        <img 
          src="https://www.redscar.org/images/2223.png" 
          alt="Redscar Nomads" 
          style={{ 
            height: 28, 
            width: 'auto',
            filter: 'brightness(0.95) drop-shadow(0 0 4px rgba(192,57,43,0.3))',
          }} 
        />
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%', padding: '6px 0' }}>
        {NAV_GROUPS.map((group, groupIdx) => (
          <React.Fragment key={`group-${groupIdx}`}>
            {groupIdx > 0 ? (
              <div style={{
                width: 24,
                height: '0.5px',
                background: 'linear-gradient(90deg, transparent, rgba(200,170,100,0.25) 50%, transparent)',
                margin: '6px 0',
                boxShadow: '0 0 4px rgba(200,170,100,0.08)',
              }} />
            ) : null}
            {group.map((item) => {
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
                  {item.isImage ? (
                    <img 
                      src={item.icon} 
                      alt={item.label}
                      style={{ 
                        width: 14, 
                        height: 14,
                        filter: isActive ? 'brightness(1.1)' : 'brightness(0.8)',
                      }} 
                    />
                  ) : (
                    <>
                      {(() => {
                        const Icon = item.icon;
                        return <Icon size={14} />;
                      })()}
                    </>
                  )}
                  {badgeActive ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        border: '1.5px solid #0A0908',
                        background: isLiveBadge ? '#C0392B' : '#C8A84B',
                        boxShadow: isLiveBadge 
                          ? '0 0 8px rgba(192,57,43,0.9), inset 0 0 2px rgba(255,255,255,0.2)' 
                          : '0 0 6px rgba(200,168,75,0.7), inset 0 0 1px rgba(255,255,255,0.15)',
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
          borderTop: '0.5px solid rgba(200,168,75,0.15)',
          paddingTop: 8,
          paddingBottom: 7,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3.5,
          flexShrink: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(200,168,75,0.04) 100%)',
        }}>
          <div style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#C8A84B',
            animation: 'pulse-dot 2.5s ease-in-out infinite',
            boxShadow: '0 0 6px rgba(200,168,75,0.6), inset 0 0 1px rgba(255,255,255,0.2)',
          }} />
          <span style={{
            fontSize: 7,
            color: 'rgba(200,168,75,0.65)',
            letterSpacing: '0.25em',
            userSelect: 'none',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
          }}>{IS_SHARED_SANDBOX_MODE ? 'CLB' : 'SIM'}</span>
        </div>
      ) : null}
    </nav>
  );
}
