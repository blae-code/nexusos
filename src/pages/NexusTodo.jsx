import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSession } from '@/core/data/SessionContext';
import ReadinessAuditPanel from '@/components/admin/ReadinessAuditPanel';

export default function NexusTodo() {
  const { isAdmin } = useSession();

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: '#08080A' }}>
        <div style={{ color: '#C8A84B', fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
          Pioneer Clearance Required
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '24px 32px', maxWidth: 980, margin: '0 auto', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ShieldCheck size={18} style={{ color: '#C0392B' }} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Production Readiness
          </div>
        </div>
        <div style={{ color: '#9A9488', fontSize: 11, lineHeight: 1.7, maxWidth: 760 }}>
          This dashboard replaces the retired static roadmap. Use it to verify live entity coverage, full-scope integration health,
          auth diagnostics, and sample-data cleanliness before running or signing off on a production proof pass.
        </div>
      </div>

      <ReadinessAuditPanel autoRun compact={false} title="Live Readiness Dashboard" />
    </div>
  );
}
