import { useMemo } from 'react';
import { useGameCache } from '@/core/data/useGameCache';
import { resolveSCReferenceOptions } from '@/core/data/sc-reference-core';

export { resolveSCReferenceOptions } from '@/core/data/sc-reference-core';

export function useSCReferenceOptions(domain, context = {}) {
  const gameCache = useGameCache();

  return useMemo(
    () => resolveSCReferenceOptions({ domain, context, gameCache }),
    [domain, context, gameCache],
  );
}
