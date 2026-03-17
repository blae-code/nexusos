import { useEffect, useMemo, useRef, useState } from 'react';

function normalizeItems(items, getKey) {
  return items.map((item, index) => ({
    key: getKey(item, index),
    item,
  }));
}

export function useAnimatedList(items, getKey = (item) => item?.id, removeDelayMs = 150) {
  const normalized = useMemo(() => normalizeItems(items, getKey), [getKey, items]);
  const [animatedItems, setAnimatedItems] = useState(() =>
    normalized.map(({ key, item }) => ({ key, item, state: 'entered' })),
  );
  const timeoutsRef = useRef(new Map());

  useEffect(() => {
    const nextKeys = new Set(normalized.map(({ key }) => key));

    setAnimatedItems((current) => {
      const currentMap = new Map(current.map((entry) => [entry.key, entry]));
      const nextEntries = normalized.map(({ key, item }) => {
        const existing = currentMap.get(key);
        if (existing) {
          return { ...existing, item, state: existing.state === 'removing' ? 'entered' : existing.state };
        }
        return { key, item, state: 'entering' };
      });

      current.forEach((entry) => {
        if (!nextKeys.has(entry.key) && !timeoutsRef.current.has(entry.key)) {
          nextEntries.push({ ...entry, state: 'removing' });
          const timeoutId = window.setTimeout(() => {
            setAnimatedItems((prev) => prev.filter((candidate) => candidate.key !== entry.key));
            timeoutsRef.current.delete(entry.key);
          }, removeDelayMs);
          timeoutsRef.current.set(entry.key, timeoutId);
        }
      });

      return nextEntries;
    });
  }, [normalized, removeDelayMs]);

  useEffect(() => {
    const promoteTimer = window.setTimeout(() => {
      setAnimatedItems((current) => current.map((entry) => (
        entry.state === 'entering'
          ? { ...entry, state: 'entered' }
          : entry
      )));
    }, 0);

    return () => window.clearTimeout(promoteTimer);
  }, [normalized]);

  useEffect(() => () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current.clear();
  }, []);

  return animatedItems;
}

export default useAnimatedList;
