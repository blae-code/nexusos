import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from its previous value to the new target
 * over `duration` ms using ease-out.
 *
 * Usage:
 *   const displayed = useCountUp(rawValue);
 *   // Then render: {Math.round(displayed).toLocaleString()}
 */
export function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target ?? 0;

    if (from === to) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    startRef.current = null;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to;
        setValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
