import React from 'react';
import { Boxes } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ComingSoon() {
  const location = useLocation();
  const isArmory = location.pathname.includes('/armory');
  const title = isArmory ? 'ARMORY' : 'ARCHIVE';

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
        <Boxes size={32} style={{ color: 'var(--t2)', opacity: 0.4 }} />
        <div style={{ fontSize: 12, color: 'var(--t1)', fontFamily: 'var(--font)' }}>
          Coming Soon
        </div>
        <div style={{ fontSize: 10, color: 'var(--t2)', textAlign: 'center', maxWidth: 280, fontFamily: 'var(--font)' }}>
          This module is under active development.
        </div>
      </div>
    </div>
  );
}