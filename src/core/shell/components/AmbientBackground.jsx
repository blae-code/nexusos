import React, { useEffect, useState } from 'react';

const PARTICLE_COUNT = 72;
const VIEWPORT_MARGIN = 120;
const SIZE_BUCKETS = [1, 1, 1, 1, 1.5, 1.5, 2];

function randomBetween(min, max) {
  return min + (Math.random() * (max - min));
}

function createParticle(index) {
  return {
    id: `ambient-${index}`,
    size: SIZE_BUCKETS[Math.floor(Math.random() * SIZE_BUCKETS.length)],
    left: `${randomBetween(VIEWPORT_MARGIN, 100 - VIEWPORT_MARGIN / 16)}%`,
    top: `${randomBetween(VIEWPORT_MARGIN / 10, 100 - VIEWPORT_MARGIN / 10)}%`,
    opacity: randomBetween(0.03, 0.08).toFixed(3),
    duration: `${Math.round(randomBetween(80, 140))}s`,
    delay: `-${Math.round(randomBetween(0, 140))}s`,
    driftX: `${randomBetween(-18, 18).toFixed(2)}px`,
    driftY: `${randomBetween(-12, 12).toFixed(2)}px`,
  };
}

export default function AmbientBackground({ dimmed = false }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: PARTICLE_COUNT }, (_, index) => createParticle(index)));
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        opacity: dimmed ? 0 : 1,
        transition: 'opacity 200ms ease',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(var(--acc-rgb), 0.04) 0%, rgba(var(--acc-rgb), 0) 60%)',
        }}
      />
      {particles.map((particle) => (
        <span
          key={particle.id}
          style={{
            position: 'absolute',
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: 'var(--t0)',
            opacity: particle.opacity,
            transform: 'translate3d(0, 0, 0)',
            animation: `ambient-drift ${particle.duration} linear infinite`,
            animationDelay: particle.delay,
            ['--ambient-drift-x']: particle.driftX,
            ['--ambient-drift-y']: particle.driftY,
          }}
        />
      ))}
    </div>
  );
}
