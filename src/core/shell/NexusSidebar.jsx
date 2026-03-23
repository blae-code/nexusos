import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
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
    { icon: SettingsIcon, label: 'KEY MGMT', path: '/app/keys', badge: null, adminOnly: true },
    { icon: SettingsIcon, label: 'ADMIN SETTINGS', path: '/app/admin/settings', badge: null, adminOnly: true },
  ],
];

export default function NexusSidebar({ currentPath }) {
  const { isAdmin } = useSession();
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

        const craftQueueItems = Array.isArray(craftQueue) ? craftQueue : [];
        const liveOpItems = Array.isArray(liveOps) ? liveOps : [];

        setBadges({
          craft: craftQueueItems.some((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)),
          live: liveOpItems.length > 0,
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
    if (!item.adminOnly) return true;
    return isAdmin;
  };

  return (
    <nav
      style={{
        width: 52,
        background: '#08080A',
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
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes sidebar-craft-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .nexus-nav-link {
          text-decoration: none !important;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 38px;
          height: 36px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 150ms ease;
          flex-shrink: 0;
          background: transparent;
          border: none;
          color: #9A9488;
          -webkit-font-smoothing: antialiased;
        }
        .nexus-nav-link:hover:not(.active) {
          background: rgba(200,170,100,0.06) !important;
          color: #E8E4DC !important;
        }
        .nexus-nav-link.active {
          background: rgba(192,57,43,0.12) !important;
          border-left: 2px solid #C0392B !important;
          color: #E8E4DC !important;
        }
        .nexus-nav-link img {
          image-rendering: crisp-edges;
        }
      `}</style>

      {/* Red accent stripe */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 2,
        background: '#C0392B',
        zIndex: 10,
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
      }}>
        <img 
          src="https://www.redscar.org/images/2223.png" 
          alt="Redscar Nomads" 
          style={{ 
            height: 28, 
            width: 'auto',
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
                background: 'rgba(200,170,100,0.15)',
                margin: '6px 0',
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
                  color: isActive ? '#E8E4DC' : '#9A9488',
                }}
                >
                  {item.isImage ? (
                    <img 
                      src={item.icon} 
                      alt={item.label}
                      style={{ 
                        width: 14, 
                        height: 14,
                        filter: isActive ? 'brightness(1)' : 'brightness(0.7)',
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
                        width: 6,
                        height: 6,
                        borderRadius: 2,
                        border: '1.5px solid #08080A',
                        background: '#C0392B',
                        color: '#E8E4DC',
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
    </nav>
  );
}
