import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, ClipboardList, Truck } from 'lucide-react';
import { RankGuard } from '@/core/shell/guards';

const MODULES = [
  {
    title: 'Cargo Board',
    detail: 'Post and claim hauling jobs with GREEN, AMBER, and RED risk tiers plus collateral requirements.',
    status: 'PLANNED',
    icon: ClipboardList,
  },
  {
    title: 'Manifest',
    detail: 'Track active hauls from pickup through delivery, including bilateral confirmation and failure handling.',
    status: 'PLANNED',
    icon: Truck,
  },
  {
    title: 'Consignment',
    detail: 'Member-to-org sale handling with commission logic and wallet settlement once Commerce is fully wired.',
    status: 'PLANNED',
    icon: Boxes,
  },
  {
    title: 'Dispatch',
    detail: 'Crew and ship assignment for live cargo work, drawing from Armory fleet data and org ops state.',
    status: 'PHASE 2',
    icon: AlertTriangle,
    href: '/app/armory',
  },
];

function modulePill(status) {
  if (status === 'PHASE 2') return 'nexus-pill nexus-pill-info';
  return 'nexus-pill nexus-pill-neu';
}

export default function Logistics() {
  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="nexus-section-header">LOGISTICS</div>
        <div style={{ color: 'var(--t0)', fontSize: 15, fontWeight: 600 }}>Cargo Movement And Hauling Coordination</div>
        <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7, maxWidth: 760 }}>
          Logistics will own hauling jobs, manifests, consignment flow, and dispatch planning. The page currently acts as the
          coordination surface between Commerce settlement rules, Armory fleet data, and live operational cargo support.
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
                {item.href ? 'OPEN DEPENDENCY ->' : 'WAITING ON DATA MODEL'}
              </div>
            </div>
          );

          if (item.title === 'Dispatch') {
            return (
              <RankGuard key={item.title} requiredRank="FOUNDER">
                <Link to={item.href} style={{ textDecoration: 'none' }}>
                  {body}
                </Link>
              </RankGuard>
            );
          }

          return item.href ? (
            <Link key={item.title} to={item.href} style={{ textDecoration: 'none' }}>
              {body}
            </Link>
          ) : (
            <div key={item.title}>{body}</div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
        <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="nexus-section-header">RISK ACCESS</div>
          <RankGuard requiredRank="VOYAGER">
            <div className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>RED Tier Cargo Jobs</div>
                <span className="nexus-pill nexus-pill-danger">VOYAGER+</span>
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
                High-risk logistics work in active PvP zones or carrying cargo above 5M aUEC is only surfaced to Voyager
                rank and above. These jobs require heavier collateral and tighter crew discipline.
              </div>
            </div>
          </RankGuard>
        </div>

        <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="nexus-section-header">DISPATCH</div>
          <RankGuard requiredRank="FOUNDER">
            <div className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Founder Dispatch View</div>
                <span className="nexus-pill nexus-pill-info">FOUNDER+</span>
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
                Dispatch planning assigns crews and fleet assets to active cargo jobs. Founder rank is required because it
                crosses Logistics job state with Armory fleet readiness and org command decisions.
              </div>
              <div style={{ color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.08em' }}>OPEN ARMORY DISPATCH TAB →</div>
            </div>
          </RankGuard>
        </div>
      </div>
    </div>
  );
}
