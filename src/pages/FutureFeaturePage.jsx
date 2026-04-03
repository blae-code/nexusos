import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, Factory, TrendingUp } from 'lucide-react';
import { getFutureFeatureDescriptor } from '@/core/shell/futureFeatures';

const ACTIVE_RELEASE_POINTS = [
  'Mining and salvage haul logging',
  'Material custody, inventory, and refinery flow',
  'Blueprint, craft queue, and production management',
  'Cached commodity prices, routes, and market signals',
];

export default function FutureFeaturePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const feature = getFutureFeatureDescriptor(location.pathname) || {
    title: 'Future Feature',
    accent: '#9A9488',
    description: 'This surface is intentionally hidden while the current release focuses on Industry Hub and Market Hub.',
  };

  return (
    <div style={{ minHeight: '100%', padding: '28px 32px' }}>
      <div style={{
        maxWidth: 920,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 18,
      }}>
        <div style={{
          background: '#0F0F0D',
          borderLeft: `2px solid ${feature.accent}`,
          borderTop: '0.5px solid rgba(200,170,100,0.10)',
          borderRight: '0.5px solid rgba(200,170,100,0.10)',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2,
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Compass size={15} style={{ color: feature.accent }} />
            <span style={{
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 10,
              color: feature.accent,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}>
              Future Feature
            </span>
          </div>

          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: '#E8E4DC',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {feature.title}
            </div>
            <div style={{
              marginTop: 10,
              maxWidth: 620,
              color: '#9A9488',
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              {feature.description}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/app/industry')}
              className="nexus-btn"
              style={{ padding: '8px 14px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Factory size={11} />
              OPEN INDUSTRY HUB
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/market')}
              className="nexus-btn"
              style={{ padding: '8px 14px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <TrendingUp size={11} />
              OPEN MARKET HUB
            </button>
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'rgba(200,170,100,0.04)',
            border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2,
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              color: '#C8A84B',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Current Release Focus
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {ACTIVE_RELEASE_POINTS.map((point) => (
                <div key={point} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: feature.accent,
                    marginTop: 6,
                    flexShrink: 0,
                  }} />
                  <span style={{ color: '#D0CBC2', fontSize: 12, lineHeight: 1.45 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          background: '#0F0F0D',
          borderLeft: '2px solid rgba(200,170,100,0.20)',
          borderTop: '0.5px solid rgba(200,170,100,0.10)',
          borderRight: '0.5px solid rgba(200,170,100,0.10)',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2,
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 10,
            color: '#C8A84B',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}>
            Product State
          </div>
          <div style={{ color: '#E8E4DC', fontSize: 16, fontWeight: 600 }}>
            Industry-first release mode
          </div>
          <div style={{ color: '#9A9488', fontSize: 12, lineHeight: 1.6 }}>
            The live product surface is intentionally narrowed to Industry Hub and Market Hub so mining, salvaging, crafting, inventory, and cached price intelligence can be production-ready before the rest of NexusOS returns.
          </div>
          <div style={{
            marginTop: 8,
            paddingTop: 10,
            borderTop: '0.5px solid rgba(200,170,100,0.08)',
            color: '#5A5850',
            fontSize: 10,
            lineHeight: 1.6,
          }}>
            Route: {location.pathname}
          </div>
        </div>
      </div>
    </div>
  );
}
