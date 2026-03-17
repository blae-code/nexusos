import React from 'react';
import { Link } from 'react-router-dom';
import { Coins, FileText, Package, TrendingUp } from 'lucide-react';
import { RankGuard } from '@/core/shell/guards';

const MODULES = [
  {
    title: 'Wallet',
    detail: 'Personal aUEC balance, transaction history, and pending op payouts from split calculations.',
    status: 'PLANNED',
    icon: Coins,
  },
  {
    title: 'Coffer',
    detail: 'Org treasury, contribution history, and approved expenditure records backed by CofferLog.',
    status: 'LIVE',
    icon: TrendingUp,
    href: '/app/coffer',
  },
  {
    title: 'Trade',
    detail: 'StarHead and UEX-driven pricing, route analysis, and arbitrage surfaces for commerce planning.',
    status: 'IN DESIGN',
    icon: Package,
    href: '/app/profit',
  },
  {
    title: 'Contracts',
    detail: 'Exchange, auction, and courier contract workflows tied into Wallet, Logistics, and appraisal data.',
    status: 'PLANNED',
    icon: FileText,
  },
];

function modulePill(status) {
  if (status === 'LIVE') return 'nexus-pill nexus-pill-live';
  if (status === 'IN DESIGN') return 'nexus-pill nexus-pill-warn';
  return 'nexus-pill nexus-pill-neu';
}

export default function Commerce() {
  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="nexus-section-header">COMMERCE</div>
        <div style={{ color: 'var(--t0)', fontSize: 15, fontWeight: 600 }}>Financial Operations Surface</div>
        <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7, maxWidth: 720 }}>
          Commerce consolidates personal wallet state, the org coffer, trade planning, and future contract-backed financial flows.
          It is the umbrella app for treasury visibility and aUEC movement across operations, logistics, and industry.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        {MODULES.map((item) => {
          const Icon = item.icon;
          const body = (
            <div className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 188 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="nexus-avatar">
                    <Icon size={14} />
                  </div>
                  <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{item.title}</div>
                </div>
                <span className={modulePill(item.status)}>{item.status}</span>
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>{item.detail}</div>
              <div style={{ marginTop: 'auto', color: item.href ? 'var(--acc2)' : 'var(--t3)', fontSize: 10, letterSpacing: '0.08em' }}>
                {item.href ? 'OPEN MODULE ->' : 'DATA MODEL READYING'}
              </div>
            </div>
          );

          return item.href ? (
            <Link key={item.title} to={item.href} style={{ textDecoration: 'none' }}>
              {body}
            </Link>
          ) : (
            <div key={item.title}>{body}</div>
          );
        })}
      </div>

      <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="nexus-section-header">COFFER CONTROLS</div>
        <RankGuard requiredRank="PIONEER">
          <div className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Expenditure Approval Queue</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
              Approval controls for treasury spend, vendor payouts, and exceptional coffer disbursements are restricted to
              Pioneer leadership. The live approval workflow continues in the Coffer module.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="nexus-pill nexus-pill-info">PIONEER ONLY</span>
              <Link to="/app/coffer" style={{ color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none' }}>
                OPEN COFFER →
              </Link>
            </div>
          </div>
        </RankGuard>
      </div>
    </div>
  );
}
