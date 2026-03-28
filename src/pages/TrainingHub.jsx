import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, BookOpen, Zap, Users, Compass, Package, Briefcase, Archive, X } from 'lucide-react';
import OperationalReferenceStrip from '@/core/design/OperationalReferenceStrip';

const TRAINING_MODULES = [
  {
    id: 'ops-101',
    title: 'Operations Board 101',
    icon: Briefcase,
    subtitle: 'Master fleet operations',
    description: 'Learn to create, RSVP, and manage fleet-wide operations from conception through wrap-up.',
    color: '#C0392B',
    duration: '8 min',
    lessons: 4,
    href: '/app/ops',
    whenToUse: 'Use this before an op is published, while roles are filling, and again once the operation goes live.',
    dependsOn: 'Shared Op records, RSVP commitments, readiness gates, and the live session log.',
    nextStep: 'Launch the board, review active ops, then create or join the one you need instead of tracking it externally.',
  },
  {
    id: 'industry-101',
    title: 'Industry Hub Essentials',
    icon: Zap,
    subtitle: 'Production & refinement workflows',
    description: 'Track materials, manage blueprints, and optimize crafting & refinery operations.',
    color: '#C8A84B',
    duration: '10 min',
    lessons: 5,
    href: '/app/industry',
    whenToUse: 'Use Industry when a job depends on material readiness, refinery throughput, blueprint ownership, or fabrication status.',
    dependsOn: 'Material logs, blueprints, craft queue items, fabrication jobs, and refinery orders.',
    nextStep: 'Launch Industry, then move into the Guide, Blueprints, or Production surface that matches the task at hand.',
  },
  {
    id: 'craft-guide',
    title: 'Crafting Guide',
    icon: BookOpen,
    subtitle: 'Blueprint reference & prototyping',
    description: 'Search blueprints, inspect recipe thresholds, and prototype material plans with custom SCU and quality assumptions.',
    color: '#C8A84B',
    duration: '6 min',
    lessons: 3,
    href: '/app/industry?tab=guide',
    whenToUse: 'Use the guide before committing stock, creating a fabrication job, or asking logistics to move missing materials.',
    dependsOn: 'Blueprint recipe quality thresholds and current org Material records.',
    nextStep: 'Prototype the batch, then jump into Blueprints or Production with the exact blueprint and quantity still in context.',
  },
  {
    id: 'scout-101',
    title: 'Scout Intel Mastery',
    icon: Compass,
    subtitle: 'Resource prospecting & deposits',
    description: 'Navigate the map, log deposits, and identify high-value mining opportunities.',
    color: '#4A8C5C',
    duration: '7 min',
    lessons: 3,
    href: '/app/scout',
    whenToUse: 'Use Scout while prospecting, validating a deposit, or checking whether a crafting shortfall has a known field source.',
    dependsOn: 'Fresh ScoutDeposit records, confirm/stale votes, quality measurements, and route-planning inputs.',
    nextStep: 'Log or validate the deposit, then hand the route or ping into Industry or Ops when it is worth acting on.',
  },
  {
    id: 'commerce-101',
    title: 'Commerce & Trading',
    icon: Package,
    subtitle: 'Economics & market analysis',
    description: 'Plan profitable trade routes, manage the coffer, and track financial flows.',
    color: '#5A7A90',
    duration: '9 min',
    lessons: 4,
    href: '/app/industry/commerce',
    whenToUse: 'Use Commerce for wallet entries, route profitability review, contract issuance, and treasury visibility.',
    dependsOn: 'Wallet, transaction, contract, cargo-log, and coffer entities being available in the deployment.',
    nextStep: 'Issue or review the work here, then hand the movement task into Logistics for dispatch and delivery.',
  },
  {
    id: 'crew-101',
    title: 'Crew Management',
    icon: Users,
    subtitle: 'Scheduling & assignments',
    description: 'Assign roles to crew, manage availability, and optimize roster planning.',
    color: '#C0392B',
    duration: '6 min',
    lessons: 3,
    href: '/app/armory/schedule',
    whenToUse: 'Use crew scheduling when an op, fleet assignment, or training need requires named people in defined roles.',
    dependsOn: 'Org roster data, ops scheduling context, and the fleet/crew surfaces inside Armory.',
    nextStep: 'Launch the scheduling surface, confirm who is available, then return to the live op or fleet view with assignments set.',
  },
  {
    id: 'armory-101',
    title: 'Armory & Inventory',
    icon: Archive,
    subtitle: 'Equipment & asset tracking',
    description: 'Manage fleet components, weapons, and consumables across all vessels.',
    color: '#9A9488',
    duration: '6 min',
    lessons: 3,
    href: '/app/armory',
    whenToUse: 'Use Armory to understand what ships, components, weapons, and consumables the org can actually field right now.',
    dependsOn: 'Shared org fleet records, inventory, component data, and readiness state.',
    nextStep: 'Open the fleet or inventory views, then return to Ops or Logistics once the equipment plan is ready.',
  },
];

function ModuleCard({ module, onSelect }) {
  const Icon = module.icon;
  return (
    <button
      onClick={() => onSelect(module)}
      style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--b1)',
        borderRadius: 3,
        padding: '20px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = module.color;
        e.currentTarget.style.background = `${module.color}08`;
        e.currentTarget.style.boxShadow = `0 0 16px ${module.color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--b1)';
        e.currentTarget.style.background = 'var(--bg2)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Accent stripe */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: module.color,
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 4 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 3,
            background: `${module.color}20`,
            border: `0.5px solid ${module.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} style={{ color: module.color }} />
        </div>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>
            {module.title}
          </div>
          <div style={{ color: module.color, fontSize: 10, marginTop: 2, letterSpacing: '0.05em' }}>
            {module.subtitle}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6, paddingLeft: 4 }}>
        {module.description}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4, paddingTop: 4 }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 9, color: 'var(--t2)' }}>
          <span>{module.duration}</span>
          <span>•</span>
          <span>{module.lessons} lessons</span>
        </div>
        <ChevronRight size={14} style={{ color: module.color }} />
      </div>
    </button>
  );
}

function TrainingModal({ module, onClose, onLaunch }) {
  if (!module) return null;

  const Icon = module.icon;
  const guidance = [
    { label: 'When To Use', value: 'Operational Trigger', detail: module.whenToUse },
    { label: 'Data Depends On', value: 'Shared Inputs', detail: module.dependsOn },
    { label: 'Next Step', value: 'Launch Live Tool', detail: module.nextStep },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg1)',
          border: '0.5px solid var(--b1)',
          borderLeft: `3px solid ${module.color}`,
          borderRadius: 3,
          maxWidth: 800,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg2)', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 16,
              top: 16,
              background: 'none',
              border: 'none',
              color: 'var(--t2)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: `${module.color}20`,
                border: `0.5px solid ${module.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={24} style={{ color: module.color }} />
            </div>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700 }}>
                {module.title}
              </div>
              <div style={{ color: module.color, fontSize: 11, marginTop: 2, letterSpacing: '0.05em' }}>
                {module.subtitle}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: 'var(--t1)', fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
              {module.description}
            </div>
          </div>

          {/* Operational guidance */}
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 12, fontWeight: 600 }}>
              LIVE WORKFLOW GUIDE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {guidance.map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg2)',
                    border: '0.5px solid var(--b1)',
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ color: module.color, fontSize: 11, fontWeight: 600 }}>{item.value}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => onLaunch(module.href)}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '12px 16px',
              background: module.color,
              border: 'none',
              borderRadius: 3,
              color: 'var(--bg0)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
            }}
          >
            Launch Live Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrainingHub() {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState(null);

  const handleLaunch = (href) => {
    if (!href) {
      return;
    }

    setSelectedModule(null);
    navigate(href);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#08080A',
        overflow: 'hidden',
        fontFamily: "'Barlow Condensed', 'Barlow', sans-serif",
      }}
    >
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.1,
        }}
        src="/video/nexus-boot-loop02.mp4"
      />

      {/* Red bloom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 40% 30% at 65% 15%, rgba(192,57,43,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          overflow: 'auto',
          padding: '40px 32px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  background: 'rgba(192,57,43,0.12)',
                  border: '0.5px solid rgba(192,57,43,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={28} style={{ color: '#C0392B' }} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Earth Orbiter', 'EarthOrbiter', 'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: '11px',
                    color: '#C8A84B',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  NEXUSOS ACADEMY
                </div>
                <div
                  style={{
                    fontFamily: "'Beyond Mars', 'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '48px',
                    color: '#E8E4DC',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                  }}
                >
                  Training Suite
                </div>
              </div>
            </div>

            <div
              style={{
                fontFamily: "'Barlow', sans-serif",
                fontWeight: 400,
                fontSize: '14px',
                color: '#9A9488',
                lineHeight: 1.7,
                maxWidth: 600,
                marginTop: 12,
              }}
            >
              Master every module of NexusOS with interactive, comprehensive training. Each course is designed to get you
              operational fast with hands-on walkthroughs and pro tips from org veterans.
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <OperationalReferenceStrip
              sectionLabel="TRAINING REFERENCE"
              title="Learn The Workflow, Then Enter The Live Tool"
              description="Training is the guided front door for the same live surfaces members use day to day. Each module points into the real workspace rather than a separate sandbox."
              notes={[
                { label: 'When To Use', value: 'Learn Or Reorient', detail: 'Use Training when a member needs fast orientation, a refresher on a workflow, or a safe path into an existing live module.' },
                { label: 'Data Depends On', value: 'Same Live Routes', detail: 'Training launches the real app routes and assumes the same shared entities, permissions, and runtime availability as the production workspace.' },
                { label: 'Next Step', value: 'Launch A Module', detail: 'Choose the module that matches the task, review the operational guidance, then launch the live workspace directly from the modal.' },
              ]}
              actions={[
                { label: 'Open Crafting Guide', onClick: () => handleLaunch('/app/industry?tab=guide'), tone: 'warn' },
                { label: 'Open Ops Board', onClick: () => handleLaunch('/app/ops'), tone: 'info' },
                { label: 'Open Scout Intel', onClick: () => handleLaunch('/app/scout'), tone: 'live' },
              ]}
            />
          </div>

          {/* Modules Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {TRAINING_MODULES.map((module) => (
              <ModuleCard key={module.id} module={module} onSelect={setSelectedModule} />
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 60,
              padding: '20px 24px',
              background: 'rgba(192,57,43,0.08)',
              border: '0.5px solid rgba(192,57,43,0.12)',
              borderRadius: 3,
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>
              Training is a live reference layer, not a separate simulation. Launch a module from here whenever you need
              a fast refresher before using the real shared workspace.
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <TrainingModal module={selectedModule} onClose={() => setSelectedModule(null)} onLaunch={handleLaunch} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@400;500;600;700&display=swap');
        @import url('https://fonts.cdnfonts.com/css/beyond-mars');
        @import url('https://fonts.cdnfonts.com/css/earth-orbiter');
      `}</style>
    </div>
  );
}
