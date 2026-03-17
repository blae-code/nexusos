import React from 'react';
import { Construction } from 'lucide-react';

export default function ComingSoon() {
  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <Construction size={40} style={{ color: 'var(--warn)', opacity: 0.6 }} />
      <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em' }}>
        Coming Soon
      </div>
      <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', maxWidth: 280 }}>
        This feature is under development. Check back soon.
      </div>
    </div>
  );
}