import { useQuery } from '@tanstack/react-query';
import { getCommodityPrices as getStarHeadCommodityPrices } from '@/core/data/starhead';
import { getCommodityPrices as getUexCommodityPrices } from '@/core/data/uex';

const PRICE_CACHE_MS = 5 * 60 * 1000;

function resolveLastUpdated(prices) {
  const timestamps = (Array.isArray(prices) ? prices : [])
    .map((row) => row?.updatedAt || row?.updated_at || null)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

async function fetchCommodityPrices() {
  const starHeadPrices = await getStarHeadCommodityPrices();
  if (Array.isArray(starHeadPrices) && starHeadPrices.length > 0) {
    return {
      prices: starHeadPrices,
      lastUpdated: resolveLastUpdated(starHeadPrices),
    };
  }

  const uexPrices = await getUexCommodityPrices();
  if (Array.isArray(uexPrices) && uexPrices.length > 0) {
    return {
      prices: uexPrices,
      lastUpdated: resolveLastUpdated(uexPrices),
    };
  }

  return {
    prices: [],
    lastUpdated: null,
  };
}

export function useCommodityPrices() {
  const query = useQuery({
    queryKey: ['commodity-prices'],
    staleTime: PRICE_CACHE_MS,
    gcTime: PRICE_CACHE_MS * 2,
    queryFn: fetchCommodityPrices,
  });

  return {
    prices: query.data?.prices || [],
    lastUpdated: query.data?.lastUpdated || null,
    loading: query.isLoading,
    refresh: query.refetch,
  };
}
