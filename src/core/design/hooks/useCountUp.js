import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — animates a numeric value from its previous value to the next
 * over 600ms ease-out whenever the target changes.
 *
 * @param {number} target  The value to count toward.
 * @param {object} [opts]
 * @param {number}  [opts.duration=600]  Animation duration in ms.
 * @param {number}  [opts.decimals=0]    Decimal places to display.
 * @returns {number} The current animated display value.
 */
export function useCountUp(target, { duration = 600, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const targetRef = useRef(target);

  useEffect(() => {
    const prev = fromRef.current;
    if (prev === target) return;

    targetRef.current = target;
    startTimeRef.current = null;

    const factor = 10 ** decimals;

    const tick = (now) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      const next = prev + (targetRef.current - prev) * eased;
      setDisplay(Math.round(next * factor) / factor);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = targetRef.current;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return display;
}
