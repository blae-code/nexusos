import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/core/data/base44Client';
import { useCurrentUser } from '@/core/data/hooks/useCurrentUser';

async function fetchWalletData(currentUser) {
  if (!currentUser?.id || !base44.entities?.Wallet?.filter) {
    return {
      wallet: null,
      balance: 0,
      transactions: [],
    };
  }

  try {
    const wallets = await base44.entities.Wallet.filter({ member_id: currentUser.id });
    const wallet = Array.isArray(wallets) ? wallets[0] || null : null;

    if (!wallet) {
      return {
        wallet: null,
        balance: 0,
        transactions: [],
      };
    }

    let transactions = [];
    if (base44.entities?.Transaction?.filter) {
      transactions = await base44.entities.Transaction.filter({ wallet_id: wallet.id });
    } else if (base44.entities?.Transaction?.list) {
      const listedTransactions = await base44.entities.Transaction.list('-created_at', 100);
      transactions = Array.isArray(listedTransactions)
        ? listedTransactions.filter((item) => item.wallet_id === wallet.id)
        : [];
    }

    const sortedTransactions = (Array.isArray(transactions) ? transactions : [])
      .slice()
      .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
      .slice(0, 20);

    return {
      wallet,
      balance: Number(wallet.balance_aUEC || 0),
      transactions: sortedTransactions,
    };
  } catch {
    return {
      wallet: null,
      balance: 0,
      transactions: [],
    };
  }
}

export function useWallet() {
  const { currentUser, loading: currentUserLoading } = useCurrentUser();

  const query = useQuery({
    queryKey: ['wallet', currentUser?.id || null],
    enabled: !currentUserLoading && Boolean(currentUser?.id),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: () => fetchWalletData(currentUser),
  });

  return {
    wallet: query.data?.wallet || null,
    balance: query.data?.balance || 0,
    transactions: query.data?.transactions || [],
    loading: currentUserLoading || query.isLoading,
    refresh: query.refetch,
  };
}
