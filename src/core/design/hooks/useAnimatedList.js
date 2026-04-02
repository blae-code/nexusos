import { useEffect, useRef, useState } from 'react';

/**
 * useAnimatedList — tracks additions and removals in a list, exposing
 * animation state so new rows materialise in and removed rows collapse out
 * before being purged from the DOM.
 *
 * Each item in the returned array has:
 *   - all fields from the original item
 *   - `_state`: 'entering' | 'visible' | 'exiting'
 *   - `_key`: stable key for React (use instead of item.id directly)
 *
 * Usage:
 *   const rows = useAnimatedList(items, { key: 'id' });
 *   rows.map(row => (
 *     <div key={row._key} className={`nexus-list-row nexus-list-row--${row._state}`}>
 *       ...
 *     </div>
 *   ))
 *
 * Required CSS (add to tokens.css or a component stylesheet):
 *   .nexus-list-row--entering  { animation: listEnter 200ms ease-out forwards; }
 *   .nexus-list-row--exiting   { animation: listExit  150ms ease-in  forwards; overflow: hidden; }
 *   @keyframes listEnter { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
 *   @keyframes listExit  { from { opacity:1; max-height:200px; } to { opacity:0; max-height:0; padding:0; margin:0; } }
 *
 * @param {Array}  items          The live data array.
 * @param {object} [opts]
 * @param {string}  [opts.key='id']          Field to use as the stable identity key.
 * @param {number}  [opts.enterDuration=200] ms before 'entering' → 'visible'.
 * @param {number}  [opts.exitDuration=150]  ms before exiting items are removed.
 */
export function useAnimatedList(items, { key = 'id', enterDuration = 200, exitDuration = 150 } = {}) {
  const [rows, setRows] = useState(() =>
    (items || []).map((item) => ({ ...item, _key: String(item[key]), _state: 'visible' })),
  );
  const prevKeysRef = useRef(new Set((items || []).map((item) => String(item[key]))));
  const exitTimersRef = useRef({});

  useEffect(() => {
    const nextItems = items || [];
    const nextKeys = new Set(nextItems.map((item) => String(item[key])));
    const prevKeys = prevKeysRef.current;

    setRows((current) => {
      const currentByKey = Object.fromEntries(current.map((r) => [r._key, r]));
      const merged = [];

      // Keep existing rows, marking removals as 'exiting'
      for (const row of current) {
        if (!nextKeys.has(row._key)) {
          if (row._state !== 'exiting') {
            merged.push({ ...row, _state: 'exiting' });

            // Schedule removal after exit animation
            clearTimeout(exitTimersRef.current[row._key]);
            exitTimersRef.current[row._key] = setTimeout(() => {
              setRows((r) => r.filter((x) => x._key !== row._key));
              delete exitTimersRef.current[row._key];
            }, exitDuration);
          } else {
            merged.push(row);
          }
        } else {
          // Update data in place, preserve state
          const updated = nextItems.find((i) => String(i[key]) === row._key);
          merged.push({ ...updated, _key: row._key, _state: row._state === 'exiting' ? 'visible' : row._state });
        }
      }

      // Prepend new arrivals as 'entering'
      for (const item of nextItems) {
        const k = String(item[key]);
        if (!prevKeys.has(k) && !currentByKey[k]) {
          merged.unshift({ ...item, _key: k, _state: 'entering' });

          // Transition to 'visible' after enter animation
          setTimeout(() => {
            setRows((r) => r.map((x) => x._key === k && x._state === 'entering' ? { ...x, _state: 'visible' } : x));
          }, enterDuration);
        }
      }

      return merged;
    });

    prevKeysRef.current = nextKeys;
  }, [items, key, enterDuration, exitDuration]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(exitTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  return rows;
}
