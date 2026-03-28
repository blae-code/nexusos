import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import EmptyState from '@/core/design/EmptyState';
import TradeRouteMap from '@/apps/commerce/components/TradeRouteMap';
import {
  calculateManifestValue,
  formatAuec,
  formatCompactAuec,
  parseManifestText,
  summarizeManifest,
  toArray,
} from '@/core/data/commerce-logistics';
import {
  ArrowRightLeft,
  Coins,
  FileText,
  Package,
  Plus,
  Route,
  ScrollText,
  TrendingUp,
} from 'lucide-react';

const TABS = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'trade', label: 'Trade Desk' },
  { id: 'contracts', label: 'Contracts' },
];

const STATUS_STYLES = {
  OPEN: { color: 'var(--acc)', bg: 'rgba(200,168,75,0.14)' },
  ACTIVE: { color: 'var(--info)', bg: 'rgba(93,156,236,0.16)' },
  IN_TRANSIT: { color: 'var(--warn)', bg: 'rgba(243,156,18,0.16)' },
  COMPLETE: { color: 'var(--live)', bg: 'rgba(74,232,48,0.14)' },
  CREDIT: { color: 'var(--live)', bg: 'rgba(74,232,48,0.14)' },
  DEBIT: { color: 'var(--danger)', bg: 'rgba(192,57,43,0.14)' },
  PENDING: { color: 'var(--warn)', bg: 'rgba(243,156,18,0.16)' },
  EXPIRED: { color: 'var(--t2)', bg: 'rgba(157,161,205,0.12)' },
};

const SURFACE_MODE_STYLES = {
  live: { color: 'var(--live)', bg: 'rgba(74,232,48,0.14)' },
  degraded: { color: 'var(--warn)', bg: 'rgba(243,156,18,0.16)' },
  blocked: { color: 'var(--danger)', bg: 'rgba(192,57,43,0.14)' },
};

function MetricCard({ label, value, detail, color = 'var(--t0)' }) {
  return (
    <div className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 104 }}>
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || { color: 'var(--t2)', bg: 'rgba(157,161,205,0.12)' };
  return (
    <span style={{ padding: '3px 8px', borderRadius: 999, background: style.bg, color: style.color, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function SurfaceModePill({ label, tone = 'live' }) {
  const style = SURFACE_MODE_STYLES[tone] || SURFACE_MODE_STYLES.degraded;
  return (
    <span style={{ padding: '3px 8px', borderRadius: 999, background: style.bg, color: style.color, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {label}
    </span>
  );
}

export default function Commerce() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState('wallet');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [entityAvailability, setEntityAvailability] = useState({
    Wallet: true,
    Transaction: true,
    Contract: true,
    CofferLog: true,
    CargoLog: true,
  });
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [cofferEntries, setCofferEntries] = useState([]);
  const [cargoLogs, setCargoLogs] = useState([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [transactionForm, setTransactionForm] = useState({ type: 'CREDIT', amount_aUEC: '', description: '' });
  const [contractForm, setContractForm] = useState({
    contract_type: 'COURIER',
    title: '',
    description: '',
    reward_aUEC: '',
    collateral_aUEC: '',
    pickup_location: '',
    delivery_location: '',
    expires_at: '',
    cargo_manifest_text: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [walletsResult, transactionsResult, contractsResult, cofferResult, cargoLogsResult] = await Promise.allSettled([
      base44.entities.Wallet.list('-last_updated', 100),
      base44.entities.Transaction.list('-created_at', 200),
      base44.entities.Contract.list('-created_at', 200),
      base44.entities.CofferLog.list('-logged_at', 100),
      base44.entities.CargoLog.list('-logged_at', 200),
    ]);

    const nextAvailability = {
      Wallet: walletsResult.status === 'fulfilled',
      Transaction: transactionsResult.status === 'fulfilled',
      Contract: contractsResult.status === 'fulfilled',
      CofferLog: cofferResult.status === 'fulfilled',
      CargoLog: cargoLogsResult.status === 'fulfilled',
    };
    const unavailable = [];
    if (walletsResult.status === 'fulfilled') setWallets(toArray(walletsResult.value)); else { setWallets([]); unavailable.push('Wallet'); }
    if (transactionsResult.status === 'fulfilled') setTransactions(toArray(transactionsResult.value)); else { setTransactions([]); unavailable.push('Transaction'); }
    if (contractsResult.status === 'fulfilled') setContracts(toArray(contractsResult.value)); else { setContracts([]); unavailable.push('Contract'); }
    if (cofferResult.status === 'fulfilled') setCofferEntries(toArray(cofferResult.value)); else { setCofferEntries([]); unavailable.push('CofferLog'); }
    if (cargoLogsResult.status === 'fulfilled') setCargoLogs(toArray(cargoLogsResult.value)); else { setCargoLogs([]); unavailable.push('CargoLog'); }
    setEntityAvailability(nextAvailability);
    setWarning(unavailable.length ? `This deployment is missing ${unavailable.join(', ')} data surfaces. Commerce will degrade to read-only until those entities are available.` : '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsubscribers = [
      base44.entities.Transaction.subscribe(() => load()),
      base44.entities.Contract.subscribe(() => load()),
      base44.entities.CofferLog.subscribe(() => load()),
      base44.entities.CargoLog.subscribe(() => load()),
    ];
    return () => unsubscribers.forEach((unsubscribe) => typeof unsubscribe === 'function' && unsubscribe());
  }, [load]);

  const viewerId = user?.id || '';
  const viewerCallsign = user?.callsign || 'UNKNOWN';
  const capabilities = useMemo(() => ({
    walletWrite: Boolean(entityAvailability.Wallet && entityAvailability.Transaction),
    contractsWrite: Boolean(entityAvailability.Contract),
    tradeLive: Boolean(entityAvailability.CargoLog),
    cofferLive: Boolean(entityAvailability.CofferLog),
    logisticsBridgeLive: Boolean(entityAvailability.Contract && entityAvailability.CargoLog),
  }), [entityAvailability]);
  const surfaceSummary = useMemo(() => ([
    capabilities.walletWrite ? 'Wallet writes enabled.' : 'Wallet is read-only because Wallet or Transaction is unavailable.',
    capabilities.contractsWrite ? 'Contracts can issue and transition normally.' : 'Contracts are read-only because the Contract entity is unavailable.',
    capabilities.tradeLive ? 'Trade profitability is using live cargo records.' : 'Trade profitability is informational only because CargoLog is unavailable.',
  ]), [capabilities]);
  const currentWallet = wallets.find((wallet) => wallet.member_id === viewerId) || null;
  const walletBalance = Number(currentWallet?.balance_aUEC ?? user?.wallet_balance ?? 0) || 0;
  const walletTransactions = transactions
    .filter((entry) => entry.wallet_id === currentWallet?.id || entry.member_id === viewerId)
    .sort((left, right) => new Date(right.created_at || right.created_date || 0).getTime() - new Date(left.created_at || left.created_date || 0).getTime());
  const pendingTotal = walletTransactions.filter((entry) => entry.type === 'PENDING').reduce((sum, entry) => sum + (Number(entry.amount_aUEC) || 0), 0);
  const clearedIn = walletTransactions.filter((entry) => entry.type === 'CREDIT').reduce((sum, entry) => sum + (Number(entry.amount_aUEC) || 0), 0);
  const clearedOut = walletTransactions.filter((entry) => entry.type === 'DEBIT').reduce((sum, entry) => sum + (Number(entry.amount_aUEC) || 0), 0);
  const cofferBalance = cofferEntries.reduce((sum, entry) => ['SALE', 'CRAFT_SALE', 'OP_SPLIT', 'DEPOSIT'].includes(entry.entry_type) ? sum + (Number(entry.amount_aUEC) || 0) : sum - (Number(entry.amount_aUEC) || 0), 0);
  const tradeProfit = cargoLogs.reduce((sum, entry) => sum + (Number(entry.profit_loss) || 0), 0);
  const topTradeCommodity = useMemo(() => {
    const totals = cargoLogs.reduce((acc, entry) => {
      const key = entry.commodity || entry.commodity_name || 'Unknown';
      acc[key] = (acc[key] || 0) + (Number(entry.profit_loss) || 0);
      return acc;
    }, {});
    return Object.entries(totals).sort((left, right) => right[1] - left[1])[0] || null;
  }, [cargoLogs]);
  const openContracts = contracts.filter((contract) => contract.status === 'OPEN');
  const activeContracts = contracts.filter((contract) => ['ACTIVE', 'IN_TRANSIT'].includes(contract.status));
  const contractExposure = contracts.filter((contract) => ['OPEN', 'ACTIVE', 'IN_TRANSIT'].includes(contract.status)).reduce((sum, contract) => sum + (Number(contract.collateral_aUEC) || 0), 0);

  useEffect(() => {
    if (!capabilities.walletWrite) {
      setShowTransactionForm(false);
    }
    if (!capabilities.contractsWrite) {
      setShowContractForm(false);
    }
  }, [capabilities.contractsWrite, capabilities.walletWrite]);

  const handleLogTransaction = async (event) => {
    event.preventDefault();
    if (!capabilities.walletWrite) {
      setError('Wallet writes are disabled because Wallet or Transaction is unavailable in this deployment.');
      return;
    }
    const amount = Math.round(Number(transactionForm.amount_aUEC) || 0);
    if (!viewerId || amount <= 0) {
      setError('Enter a valid transaction amount before logging wallet activity.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const now = new Date().toISOString();
      let wallet = currentWallet;
      if (!wallet) {
        wallet = await base44.entities.Wallet.create({ member_id: viewerId, balance_aUEC: walletBalance, last_updated: now });
      }
      await base44.entities.Transaction.create({
        wallet_id: wallet.id,
        member_id: viewerId,
        type: transactionForm.type,
        amount_aUEC: amount,
        description: transactionForm.description || 'Manual entry',
        reference_type: 'MANUAL',
        created_at: now,
      });

      if (transactionForm.type !== 'PENDING') {
        const delta = transactionForm.type === 'CREDIT' ? amount : -amount;
        const nextBalance = Math.max(0, walletBalance + delta);
        await base44.entities.Wallet.update(wallet.id, { balance_aUEC: nextBalance, last_updated: now });
        try {
          await base44.entities.NexusUser.update(viewerId, { wallet_balance: nextBalance });
        } catch {
          // Ignore read-only NexusUser deployments.
        }
      }

      setTransactionForm({ type: 'CREDIT', amount_aUEC: '', description: '' });
      setShowTransactionForm(false);
      await load();
    } catch (nextError) {
      setError(nextError?.message || 'Unable to log wallet activity in this deployment.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateContract = async (event) => {
    event.preventDefault();
    if (!capabilities.contractsWrite) {
      setError('Contract issuance is disabled because the Contract entity is unavailable in this deployment.');
      return;
    }
    if (!viewerId || !contractForm.title.trim()) {
      setError('Enter a contract title before issuing a contract.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await base44.entities.Contract.create({
        contract_type: contractForm.contract_type,
        status: 'OPEN',
        issuer_id: viewerId,
        issuer_callsign: viewerCallsign,
        title: contractForm.title.trim(),
        description: contractForm.description.trim(),
        reward_aUEC: Number(contractForm.reward_aUEC) || 0,
        collateral_aUEC: Number(contractForm.collateral_aUEC) || 0,
        cargo_manifest: parseManifestText(contractForm.cargo_manifest_text),
        pickup_location: contractForm.pickup_location.trim(),
        delivery_location: contractForm.delivery_location.trim(),
        expires_at: contractForm.expires_at ? new Date(contractForm.expires_at).toISOString() : null,
        created_at: new Date().toISOString(),
      });
      setContractForm({ contract_type: 'COURIER', title: '', description: '', reward_aUEC: '', collateral_aUEC: '', pickup_location: '', delivery_location: '', expires_at: '', cargo_manifest_text: '' });
      setShowContractForm(false);
      await load();
    } catch (nextError) {
      setError(nextError?.message || 'Unable to create a contract in this deployment.');
    } finally {
      setBusy(false);
    }
  };

  const handleContractUpdate = async (contract, patch) => {
    if (!capabilities.contractsWrite) {
      setError('Contract updates are disabled because the Contract entity is unavailable in this deployment.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await base44.entities.Contract.update(contract.id, patch);
      await load();
    } catch (nextError) {
      setError(nextError?.message || 'Unable to update contract state.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="nexus-section-header">COMMERCE</div>
        <div style={{ color: 'var(--t0)', fontSize: 15, fontWeight: 600 }}>Financial Operations Surface</div>
        <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7, maxWidth: 820 }}>
          Commerce now runs directly against the live entity layer. Wallet activity stays tied to the active member profile, trade planning
          surfaces logged profitability plus the route map, and contract issuance feeds directly into logistics execution.
        </div>
      </div>

      {warning ? <div className="nexus-card-2" style={{ color: 'var(--warn)', fontSize: 11, lineHeight: 1.6 }}>{warning}</div> : null}
      {error ? <div className="nexus-card-2" style={{ color: 'var(--danger)', fontSize: 11, lineHeight: 1.6 }}>{error}</div> : null}
      <div className="nexus-card-2" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SurfaceModePill label={capabilities.walletWrite ? 'wallet live' : 'wallet read-only'} tone={capabilities.walletWrite ? 'live' : 'blocked'} />
        <SurfaceModePill label={capabilities.contractsWrite ? 'contracts live' : 'contracts blocked'} tone={capabilities.contractsWrite ? 'live' : 'blocked'} />
        <SurfaceModePill label={capabilities.tradeLive ? 'trade live' : 'trade limited'} tone={capabilities.tradeLive ? 'live' : 'degraded'} />
        <SurfaceModePill label={capabilities.cofferLive ? 'coffer live' : 'coffer limited'} tone={capabilities.cofferLive ? 'live' : 'degraded'} />
      </div>
      <div className="nexus-card-2" style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
        {surfaceSummary.join(' ')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <button type="button" onClick={() => setActiveTab('wallet')} className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="nexus-avatar"><Coins size={14} /></div><div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Wallet</div></div>
            <SurfaceModePill label={capabilities.walletWrite ? 'LIVE' : 'READ-ONLY'} tone={capabilities.walletWrite ? 'live' : 'blocked'} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
            {capabilities.walletWrite
              ? 'Personal aUEC balance, manual adjustments, pending ledger entries, and a readable activity timeline.'
              : 'Wallet history remains visible, but manual balance changes are disabled until Wallet and Transaction are restored.'}
          </div>
          <div style={{ marginTop: 'auto', color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.08em' }}>OPEN WALLET -&gt;</div>
        </button>

        <button type="button" onClick={() => navigate('/app/industry/coffer')} className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="nexus-avatar"><TrendingUp size={14} /></div><div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Coffer</div></div>
            <SurfaceModePill label={capabilities.cofferLive ? 'LIVE' : 'LIMITED'} tone={capabilities.cofferLive ? 'live' : 'degraded'} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
            {capabilities.cofferLive
              ? 'Org treasury, contribution history, and shared expenditure records handled in the dedicated coffer ledger.'
              : 'Coffer navigation remains available, but shared treasury history is incomplete until CofferLog is restored.'}
          </div>
          <div style={{ marginTop: 'auto', color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.08em' }}>OPEN COFFER -&gt;</div>
        </button>

        <button type="button" onClick={() => setActiveTab('trade')} className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="nexus-avatar"><Route size={14} /></div><div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Trade Desk</div></div>
            <SurfaceModePill label={capabilities.tradeLive ? 'LIVE' : 'READ-ONLY'} tone={capabilities.tradeLive ? 'live' : 'degraded'} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
            {capabilities.tradeLive
              ? 'Route mapping, profitability snapshots from logged cargo runs, and quick access to deeper route tools.'
              : 'Route tools remain available, but profitability snapshots are degraded until CargoLog is restored.'}
          </div>
          <div style={{ marginTop: 'auto', color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.08em' }}>OPEN TRADE -&gt;</div>
        </button>

        <button type="button" onClick={() => setActiveTab('contracts')} className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="nexus-avatar"><FileText size={14} /></div><div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Contracts</div></div>
            <SurfaceModePill label={capabilities.contractsWrite ? 'LIVE' : 'BLOCKED'} tone={capabilities.contractsWrite ? 'live' : 'blocked'} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
            {capabilities.contractsWrite
              ? 'Courier, exchange, and auction contracts with lifecycle state, assignee tracking, and manifest summaries.'
              : 'Existing contract records can be reviewed, but issuing and state transitions are disabled until Contract is restored.'}
          </div>
          <div style={{ marginTop: 'auto', color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.08em' }}>OPEN CONTRACTS -&gt;</div>
        </button>

        <button type="button" onClick={() => navigate('/app/industry/logistics')} className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="nexus-avatar"><Package size={14} /></div><div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Logistics Bridge</div></div>
            <SurfaceModePill label={capabilities.logisticsBridgeLive ? 'LIVE' : 'CHECK'} tone={capabilities.logisticsBridgeLive ? 'live' : 'degraded'} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7 }}>
            {capabilities.logisticsBridgeLive
              ? 'Courier execution, cargo jobs, consignments, and dispatch planning are now live under Logistics.'
              : 'Logistics navigation remains available, but cross-app finance handoff is degraded until contract and cargo records are fully available.'}
          </div>
          <div style={{ marginTop: 'auto', color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.08em' }}>OPEN LOGISTICS -&gt;</div>
        </button>
      </div>

      <div className="nexus-card-2" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="nexus-btn"
            style={{ padding: '7px 12px', background: activeTab === tab.id ? 'rgba(192,57,43,0.14)' : 'transparent', borderColor: activeTab === tab.id ? 'rgba(192,57,43,0.4)' : 'var(--b1)', color: activeTab === tab.id ? 'var(--t0)' : 'var(--t2)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'wallet' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nexus-section-header">WALLET</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Member-level aUEC visibility with manual ledger entries against the live finance record.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <MetricCard label="Available" value={formatCompactAuec(walletBalance)} detail="Current cleared balance for the active member." color="var(--live)" />
            <MetricCard label="Pending" value={formatCompactAuec(pendingTotal)} detail="Pending wallet movements not yet settled into cleared balance." color="var(--warn)" />
            <MetricCard label="Credits" value={formatCompactAuec(clearedIn)} detail="Total logged wallet credits for the active member." color="var(--info)" />
            <MetricCard label="Debits" value={formatCompactAuec(clearedOut)} detail="Total logged wallet debits for the active member." color="var(--danger)" />
          </div>

          <div className="nexus-card-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{viewerCallsign}</div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                {capabilities.walletWrite
                  ? 'Wallet entries update the active profile balance when the live entity surface is available.'
                  : 'Wallet history is visible, but new ledger entries are disabled in this deployment.'}
              </div>
            </div>
            <button type="button" onClick={() => setShowTransactionForm((current) => !current)} className="nexus-btn primary" style={{ padding: '7px 12px' }} disabled={!capabilities.walletWrite}>
              <Plus size={12} />
              Log Wallet Activity
            </button>
          </div>

          {showTransactionForm ? (
            <form onSubmit={handleLogTransaction} className="nexus-card-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>TYPE</label>
                <select className="nexus-input" value={transactionForm.type} onChange={(event) => setTransactionForm((current) => ({ ...current, type: event.target.value }))} disabled={!capabilities.walletWrite}>
                  <option value="CREDIT">CREDIT</option>
                  <option value="DEBIT">DEBIT</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>AMOUNT</label>
                <input className="nexus-input" type="number" min="1" value={transactionForm.amount_aUEC} onChange={(event) => setTransactionForm((current) => ({ ...current, amount_aUEC: event.target.value }))} placeholder="125000" required disabled={!capabilities.walletWrite} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>DESCRIPTION</label>
                <input className="nexus-input" value={transactionForm.description} onChange={(event) => setTransactionForm((current) => ({ ...current, description: event.target.value }))} placeholder="Courier contract payout" required disabled={!capabilities.walletWrite} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="nexus-btn" onClick={() => setShowTransactionForm(false)}>Cancel</button>
                <button type="submit" className="nexus-btn primary" disabled={busy || !capabilities.walletWrite}>{busy ? 'Logging...' : 'Save Entry'}</button>
              </div>
            </form>
          ) : null}

          <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScrollText size={14} style={{ color: 'var(--acc)' }} />
              <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Transaction History</div>
            </div>
            {walletTransactions.length === 0 ? (
              <EmptyState
                icon={ArrowRightLeft}
                title="No wallet activity logged"
                detail={capabilities.walletWrite ? 'Create credits, debits, or pending payouts to start the live member finance ledger.' : 'Wallet history is readable, but this deployment cannot create new ledger entries yet.'}
                action={capabilities.walletWrite}
                actionLabel="Create Entry"
                actionOnClick={() => setShowTransactionForm(true)}
              />
            ) : (
              walletTransactions.map((entry) => (
                <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 160px', gap: 10, padding: '10px 0', borderTop: '0.5px solid var(--b0)', alignItems: 'center' }}>
                  <StatusPill status={entry.type} />
                  <div>
                    <div style={{ color: 'var(--t0)', fontSize: 11 }}>{entry.description || 'Manual entry'}</div>
                    <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 4 }}>{new Date(entry.created_at || entry.created_date || Date.now()).toLocaleString()}</div>
                  </div>
                  <div style={{ color: entry.type === 'DEBIT' ? 'var(--danger)' : entry.type === 'PENDING' ? 'var(--warn)' : 'var(--live)', fontSize: 11, fontWeight: 600 }}>
                    {entry.type === 'DEBIT' ? '-' : '+'}
                    {formatAuec(entry.amount_aUEC)}
                  </div>
                  <div style={{ color: 'var(--t2)', fontSize: 10 }}>{entry.reference_type || 'Manual'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'trade' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nexus-section-header">TRADE DESK</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Live route planning map paired with logged profitability from completed cargo runs.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <MetricCard label="Logged Profit" value={formatCompactAuec(tradeProfit)} detail={`${cargoLogs.length} logged cargo runs currently in the ledger.`} color={tradeProfit >= 0 ? 'var(--live)' : 'var(--danger)'} />
            <MetricCard label="Top Commodity" value={topTradeCommodity ? topTradeCommodity[0] : 'No Data'} detail={topTradeCommodity ? `${formatCompactAuec(topTradeCommodity[1])} logged profit contribution.` : 'Log cargo runs to identify the best trade lane.'} color="var(--acc)" />
            <MetricCard label="Org Coffer" value={formatCompactAuec(cofferBalance)} detail="Shared treasury state visible alongside trade planning and payout readiness." color="var(--info)" />
            <MetricCard label="Open Contracts" value={String(openContracts.length)} detail={`${activeContracts.length} active or in-transit contracts are currently in flight.`} color="var(--warn)" />
          </div>

          <div className="nexus-card-2" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="nexus-btn" onClick={() => navigate('/app/industry/profit')}>Open Profit Calc</button>
            <button type="button" className="nexus-btn" onClick={() => navigate('/app/scout/routes')}>Open Route Planner</button>
            <button type="button" className="nexus-btn" onClick={() => navigate('/app/industry/logistics')}>Open Logistics</button>
          </div>

          <TradeRouteMap height={520} onRouteSelect={() => {}} onPlanChange={() => {}} />
        </div>
      ) : null}

      {activeTab === 'contracts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nexus-section-header">CONTRACTS</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Issue courier, exchange, and auction work orders that route directly into logistics execution.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <MetricCard label="Open" value={String(openContracts.length)} detail="Contracts available for a courier or counterparty to accept." color="var(--acc)" />
            <MetricCard label="Active" value={String(activeContracts.length)} detail="Contracts already claimed and still in progress." color="var(--info)" />
            <MetricCard label="Exposure" value={formatCompactAuec(contractExposure)} detail="Collateral currently tied up in active finance commitments." color="var(--warn)" />
            <MetricCard label="Courier Bridge" value={capabilities.contractsWrite ? 'LIVE' : 'LIMITED'} detail={capabilities.contractsWrite ? 'Courier contracts can move directly into Logistics for fulfilment and dispatch planning.' : 'Cross-app courier handoff is degraded until contract writes are restored.'} color={capabilities.contractsWrite ? 'var(--live)' : 'var(--warn)'} />
          </div>

          <div className="nexus-card-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Issue New Contract</div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                {capabilities.contractsWrite
                  ? 'Courier contracts can carry cargo manifests that Logistics will honor as the delivery brief.'
                  : 'Contract review remains available, but new contract issuance is disabled in this deployment.'}
              </div>
            </div>
            <button type="button" onClick={() => setShowContractForm((current) => !current)} className="nexus-btn primary" style={{ padding: '7px 12px' }} disabled={!capabilities.contractsWrite}>
              <Plus size={12} />
              New Contract
            </button>
          </div>

          {showContractForm ? (
            <form onSubmit={handleCreateContract} className="nexus-card-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>TYPE</label>
                <select className="nexus-input" value={contractForm.contract_type} onChange={(event) => setContractForm((current) => ({ ...current, contract_type: event.target.value }))} disabled={!capabilities.contractsWrite}>
                  <option value="COURIER">COURIER</option>
                  <option value="EXCHANGE">EXCHANGE</option>
                  <option value="AUCTION">AUCTION</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>TITLE</label>
                <input className="nexus-input" value={contractForm.title} onChange={(event) => setContractForm((current) => ({ ...current, title: event.target.value }))} placeholder="Pyro relief courier run" required disabled={!capabilities.contractsWrite} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>DESCRIPTION</label>
                <textarea className="nexus-input" value={contractForm.description} onChange={(event) => setContractForm((current) => ({ ...current, description: event.target.value }))} placeholder="What the counterparty needs and what qualifies as completion." style={{ minHeight: 72, resize: 'vertical' }} disabled={!capabilities.contractsWrite} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>REWARD</label>
                <input className="nexus-input" type="number" min="0" value={contractForm.reward_aUEC} onChange={(event) => setContractForm((current) => ({ ...current, reward_aUEC: event.target.value }))} placeholder="180000" disabled={!capabilities.contractsWrite} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>COLLATERAL</label>
                <input className="nexus-input" type="number" min="0" value={contractForm.collateral_aUEC} onChange={(event) => setContractForm((current) => ({ ...current, collateral_aUEC: event.target.value }))} placeholder="450000" disabled={!capabilities.contractsWrite} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>EXPIRES</label>
                <input className="nexus-input" type="datetime-local" value={contractForm.expires_at} onChange={(event) => setContractForm((current) => ({ ...current, expires_at: event.target.value }))} disabled={!capabilities.contractsWrite} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>PICKUP</label>
                <input className="nexus-input" value={contractForm.pickup_location} onChange={(event) => setContractForm((current) => ({ ...current, pickup_location: event.target.value }))} placeholder="Patch City" disabled={!capabilities.contractsWrite} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>DELIVERY</label>
                <input className="nexus-input" value={contractForm.delivery_location} onChange={(event) => setContractForm((current) => ({ ...current, delivery_location: event.target.value }))} placeholder="Ruin Station" disabled={!capabilities.contractsWrite} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>CARGO MANIFEST</label>
                <textarea className="nexus-input" value={contractForm.cargo_manifest_text} onChange={(event) => setContractForm((current) => ({ ...current, cargo_manifest_text: event.target.value }))} placeholder={'Medical Supplies: 32\nHydrogen Fuel: 16'} style={{ minHeight: 88, resize: 'vertical', whiteSpace: 'pre-wrap' }} disabled={!capabilities.contractsWrite} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="nexus-btn" onClick={() => setShowContractForm(false)}>Cancel</button>
                <button type="submit" className="nexus-btn primary" disabled={busy || !capabilities.contractsWrite}>{busy ? 'Issuing...' : 'Issue Contract'}</button>
              </div>
            </form>
          ) : null}

          <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contracts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No contracts issued"
                detail={capabilities.contractsWrite ? 'Create a courier, exchange, or auction contract to start testing cross-app finance flows.' : 'Contract history is readable, but new contract creation is disabled in this deployment.'}
                action={capabilities.contractsWrite}
                actionLabel="Issue Contract"
                actionOnClick={() => setShowContractForm(true)}
              />
            ) : (
              contracts
                .slice()
                .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
                .map((contract) => {
                  const isIssuer = contract.issuer_id === viewerId;
                  const isAssignee = contract.assignee_id === viewerId;
                  const manifestValue = calculateManifestValue(contract.cargo_manifest, new Map());
                  return (
                    <div key={contract.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 0.9fr) auto', gap: 12, padding: '12px 0', borderTop: '0.5px solid var(--b0)', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{contract.title}</div>
                          <StatusPill status={contract.status} />
                          <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em' }}>{contract.contract_type}</span>
                        </div>
                        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{contract.description || 'No contract brief provided.'}</div>
                        <div style={{ color: 'var(--t2)', fontSize: 9, lineHeight: 1.6 }}>{summarizeManifest(contract.cargo_manifest)}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--t2)', fontSize: 10 }}>
                        <div>Reward: <span style={{ color: 'var(--t0)' }}>{formatAuec(contract.reward_aUEC)}</span></div>
                        <div>Collateral: <span style={{ color: 'var(--t0)' }}>{formatAuec(contract.collateral_aUEC)}</span></div>
                        <div>Manifest: <span style={{ color: 'var(--t0)' }}>{manifestValue > 0 ? formatCompactAuec(manifestValue) : 'Ad hoc'}</span></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--t2)', fontSize: 10 }}>
                        <div>From: <span style={{ color: 'var(--t0)' }}>{contract.pickup_location || '—'}</span></div>
                        <div>To: <span style={{ color: 'var(--t0)' }}>{contract.delivery_location || '—'}</span></div>
                        <div>Assigned: <span style={{ color: 'var(--t0)' }}>{contract.assignee_callsign || 'Unclaimed'}</span></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150 }}>
                        {contract.status === 'OPEN' ? (
                          <button type="button" className="nexus-btn" onClick={() => handleContractUpdate(contract, { status: contract.contract_type === 'COURIER' ? 'IN_TRANSIT' : 'ACTIVE', assignee_id: viewerId, assignee_callsign: viewerCallsign, accepted_at: new Date().toISOString() })} disabled={busy || !capabilities.contractsWrite}>
                            Accept
                          </button>
                        ) : null}
                        {['ACTIVE', 'IN_TRANSIT'].includes(contract.status) && (isIssuer || isAssignee) ? (
                          <button type="button" className="nexus-btn" onClick={() => handleContractUpdate(contract, { status: 'COMPLETE', completed_at: new Date().toISOString() })} disabled={busy || !capabilities.contractsWrite}>
                            Complete
                          </button>
                        ) : null}
                        {contract.contract_type === 'COURIER' ? (
                          <button type="button" className="nexus-btn" onClick={() => navigate('/app/industry/logistics')}>
                            Open Logistics
                          </button>
                        ) : null}
                        {contract.status === 'OPEN' && isIssuer ? (
                          <button type="button" className="nexus-btn" onClick={() => handleContractUpdate(contract, { status: 'EXPIRED' })} disabled={busy || !capabilities.contractsWrite}>
                            Expire
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
