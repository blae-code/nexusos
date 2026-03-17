import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, BookOpen, Zap, Users, Compass, Package, Briefcase, Archive, X } from 'lucide-react';

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
        borderRadius: 8,
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
            borderRadius: 6,
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

function TrainingModal({ module, onClose }) {
  if (!module) return null;

  const Icon = module.icon;
  const lessons = [
    { title: 'Getting Started', duration: '2 min' },
    { title: 'Core Concepts', duration: '2 min' },
    { title: 'Hands-On Practice', duration: '3 min' },
    { title: 'Pro Tips', duration: '1 min' },
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
          borderRadius: 8,
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
                borderRadius: 6,
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

          {/* Lessons List */}
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 12, fontWeight: 600 }}>
              CURRICULUM
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lessons.map((lesson, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg2)',
                    border: '0.5px solid var(--b1)',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: `${module.color}20`,
                        border: `0.5px solid ${module.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: module.color,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500 }}>
                        {lesson.title}
                      </div>
                      <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                        {lesson.duration}
                      </div>
                    </div>
                  </div>
                  <button
                    style={{
                      padding: '6px 12px',
                      background: `${module.color}20`,
                      border: `0.5px solid ${module.color}40`,
                      borderRadius: 4,
                      color: module.color,
                      fontSize: 9,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}
                  >
                    START
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            style={{
              marginTop: 24,
              width: '100%',
              padding: '12px 16px',
              background: module.color,
              border: 'none',
              borderRadius: 6,
              color: 'var(--bg0)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
            }}
          >
            Launch Training Module
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrainingHub() {
  const [selectedModule, setSelectedModule] = useState(null);

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
        src="/video/nexus-boot-loop.mp4"
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
                  borderRadius: 8,
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
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>
              Complete all training modules to unlock advanced operational insights and org-wide analytics. Progress is
              saved automatically.
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <TrainingModal module={selectedModule} onClose={() => setSelectedModule(null)} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@400;500;600;700&display=swap');
        @import url('https://fonts.cdnfonts.com/css/beyond-mars');
        @import url('https://fonts.cdnfonts.com/css/earth-orbiter');
      `}</style>
    </div>
  );
}