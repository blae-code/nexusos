import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 70;
const SIZE_CLASSES = [1, 1.5, 2];
const OPACITY_MIN = 0.03;
const OPACITY_MAX = 0.08;
const PERIOD_MIN = 80000;  // ms
const PERIOD_MAX = 140000; // ms
const CONTENT_MARGIN = 120; // px — avoid this margin around content area

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function initParticles(w, h) {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = rand(0, Math.PI * 2);
    const period = rand(PERIOD_MIN, PERIOD_MAX);
    // distance travelled per ms in px (1–3px per second)
    const speed = rand(0.5, 2.5) / 1000;
    return {
      x: rand(CONTENT_MARGIN, w - CONTENT_MARGIN),
      y: rand(CONTENT_MARGIN, h - CONTENT_MARGIN),
      size: SIZE_CLASSES[Math.floor(Math.random() * SIZE_CLASSES.length)],
      opacity: rand(OPACITY_MIN, OPACITY_MAX),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      period,
      startTime: rand(0, period),
    };
  });
}

export default function AmbientBackground() {
  const canvasRef = useRef(null);
  const stateRef = useRef({ particles: [], animId: null, opacity: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    stateRef.current.particles = initParticles(w, h);

    // ── Accent colour from CSS variable ──────────────────────
    const accRgb = getComputedStyle(document.documentElement)
      .getPropertyValue('--acc-rgb').trim() || '200, 168, 75';

    // ── Resize handler ───────────────────────────────────────
    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      stateRef.current.particles = initParticles(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Modal detection (Radix sets data-scroll-locked) ──────
    let modalOpacity = 1;
    const bodyObserver = new MutationObserver(() => {
      const locked = document.body.hasAttribute('data-scroll-locked');
      modalOpacity = locked ? 0 : 1;
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] });

    // ── Render loop ──────────────────────────────────────────
    let prevTime = performance.now();
    const draw = (now) => {
      const dt = now - prevTime;
      prevTime = now;

      ctx.clearRect(0, 0, w, h);

      // Smoothly transition canvas opacity toward target
      stateRef.current.opacity += (modalOpacity - stateRef.current.opacity) * Math.min(dt / 300, 1);
      canvas.style.opacity = stateRef.current.opacity;

      // Radial gradient — distant light source
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, `rgba(${accRgb}, 0.04)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Particles
      const particles = stateRef.current.particles;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Seamless wrap with margin
        if (p.x < -CONTENT_MARGIN) p.x = w + CONTENT_MARGIN;
        else if (p.x > w + CONTENT_MARGIN) p.x = -CONTENT_MARGIN;
        if (p.y < -CONTENT_MARGIN) p.y = h + CONTENT_MARGIN;
        else if (p.y > h + CONTENT_MARGIN) p.y = -CONTENT_MARGIN;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(221, 225, 240, ${p.opacity})`;
        ctx.fill();
      }

      stateRef.current.animId = requestAnimationFrame(draw);
    };

    stateRef.current.animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', onResize);
      bodyObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
