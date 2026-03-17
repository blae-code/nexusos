import { useEffect, useRef, useState } from 'react';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useCountUp(value, durationMs = 600) {
  const [displayValue, setDisplayValue] = useState(() => toNumber(value));
  const previousValueRef = useRef(toNumber(value));

  useEffect(() => {
    const nextValue = toNumber(value);
    const startValue = previousValueRef.current;

    if (startValue === nextValue) {
      setDisplayValue(nextValue);
      return;
    }

    let frameId = 0;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + ((nextValue - startValue) * eased);
      setDisplayValue(currentValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = nextValue;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, value]);

  return displayValue;
}

export default useCountUp;
