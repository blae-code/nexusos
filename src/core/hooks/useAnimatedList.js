import { useEffect, useRef, useState } from 'react';

/**
 * Tracks entry/exit animation state for list items.
 * New items enter from opacity 0 / translateY(-4px).
 * Removed items collapse height to 0 before unmounting.
 *
 * Usage:
 *   const animated = useAnimatedList(items, item => item.id);
 *   animated.map(({ item, state }) => (
 *     <Row key={item.id} data-anim={state} ... />
 *   ))
 *
 * Add to your CSS:
 *   [data-anim="entering"]  { animation: listEnter 200ms ease-out forwards; }
 *   [data-anim="leaving"]   { animation: listLeave 150ms ease-in forwards; }
 */
export function useAnimatedList(items, keyFn) {
  const [tracked, setTracked] = useState(() =>
    (items || []).map(item => ({ item, key: keyFn(item), state: 'stable' }))
  );

  const prevKeysRef = useRef(new Set((items || []).map(keyFn)));

  useEffect(() => {
    const nextItems = items || [];
    const nextKeys = new Set(nextItems.map(keyFn));
    const prevKeys = prevKeysRef.current;

    // New items: mark entering
    const entering = nextItems
      .filter(item => !prevKeys.has(keyFn(item)))
      .map(item => ({ item, key: keyFn(item), state: 'entering' }));

    setTracked(prev => {
      // Mark removed items as leaving
      const updated = prev.map(entry =>
        nextKeys.has(entry.key)
          ? { ...entry, state: 'stable' }
          : { ...entry, state: 'leaving' }
      );
      return [...updated, ...entering];
    });

    // Remove leaving items after animation completes
    const leaveTimer = setTimeout(() => {
      setTracked(prev => prev.filter(entry => entry.state !== 'leaving'));
    }, 150);

    // Transition entering → stable
    const enterTimer = setTimeout(() => {
      setTracked(prev =>
        prev.map(entry =>
          entry.state === 'entering' ? { ...entry, state: 'stable' } : entry
        )
      );
    }, 200);

    prevKeysRef.current = nextKeys;

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(enterTimer);
    };
  }, [items, keyFn]);

  return tracked;
}
