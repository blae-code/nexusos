import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { listMemberDirectory } from '@/core/data/member-directory';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { useSession } from '@/core/data/SessionContext';
import { qualityPercentFromRecord } from '@/core/data/quality';
import { Boxes, Camera, Inbox, Package, Plus, RefreshCw, Search, Shield, Users, Zap } from 'lucide-react';
import BlueprintOwnershipPanel from '@/apps/industry-hub/BlueprintOwnershipPanel';
import FindCraftersTab from '@/apps/industry-hub/FindCraftersTab';
import MaterialLifecycleTracker from '@/apps/industry-hub/MaterialLifecycleTracker';
import LowStockAlerts from '@/components/ledger/LowStockAlerts';
import ArmoryStockPanel from '@/components/armory/ArmoryStockPanel';
import AssetList from './AssetList';
import ShipList from './ShipList';
import GapAnalysis from './GapAnalysis';
import AddAssetForm from './AddAssetForm';
import OcrScanner from './OcrScanner';
import OcrResultsReview from './OcrResultsReview';
import InventoryNetworkPanel from './InventoryNetworkPanel';
import InventoryAssetRoster from './InventoryAssetRoster';
import AssetReservationPanel from './AssetReservationPanel';
import OpReadinessPanel from './OpReadinessPanel';
import InventorySearchPanel from './InventorySearchPanel';

const INVENTORY_VIEWS = [
  { id: 'holdings', label: 'HOLDINGS', icon: Boxes },
  { id: 'network', label: 'NETWORK', icon: Users },
  { id: 'assets', label: 'ASSETS', icon: Package },
  { id: 'gear', label: 'GEAR', icon: Shield },
  { id: 'readiness', label: 'READINESS', icon: Zap },
  { id: 'search', label: 'SEARCH', icon: Search },
];

const SCOPES = [
  {
    id: 'me',
    label: 'MY CUSTODY',
    description: 'Personal holdings, assigned org assets, and craftability from your current custody.',
  },
  {
    id: 'org',
    label: 'ORG NETWORK',
    description: 'Org-wide custody, shared gear, ship assignments, and blueprint coverage.',
  },
];

function matchesCallsign(value, callsign) {
  return Boolean(value) && Boolean(callsign) && value.toUpperCase() === callsign.toUpperCase();
}

function buildInventoryMap(materialAssets, orgMaterials) {
  const inventory = {};

  for (const asset of materialAssets || []) {
    const key = (asset.item_name || '').toUpperCase();
    if (!key) continue;
    if (!inventory[key]) inventory[key] = { scu: 0, quality: 0, count: 0 };
    inventory[key].scu += Number(asset.quantity || 0);
    inventory[key].quality = Math.max(inventory[key].quality, Number(asset.quality_score || 0));
    inventory[key].count += 1;
  }

  for (const material of orgMaterials || []) {
    const key = (material.material_name || '').toUpperCase();
    if (!key) continue;
    if (!inventory[key]) inventory[key] = { scu: 0, quality: 0, count: 0 };
    inventory[key].scu += Number(material.quantity_scu || 0);
    inventory[key].quality = Math.max(inventory[key].quality, Number(material.quality_score || 0));
    inventory[key].count += 1;
  }

  return inventory;
}

function totalScuFromInventory(inventory) {
  return Object.values(inventory).reduce((sum, value) => sum + Number(value.scu || 0), 0);
}

function craftReadyLinesFromInventory(inventory) {
  return Object.values(inventory).filter((value) => Number(value.quality || 0) >= 800 && Number(value.scu || 0) > 0).length;
}

function ScopeButton({ scope, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(scope.id)}
      style={{
        padding: '8px 12px',
        borderRadius: 2,
        background: active ? 'rgba(192,57,43,0.12)' : '#141410',
        border: `0.5px solid ${active ? 'rgba(192,57,43,0.35)' : 'rgba(200,170,100,0.10)'}`,
        color: active ? '#E8E4DC' : '#9A9488',
        cursor: 'pointer',
        textAlign: 'left',
        minWidth: 220,
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}
      >
        {scope.label}
      </div>
      <div style={{ fontSize: 9, color: active ? '#C8A84B' : '#5A5850', marginTop: 3 }}>
        {scope.description}
      </div>
    </button>
  );
}

function ViewButton({ view, active, onClick }) {
  const Icon = view.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(view.id)}
      style={{
        padding: '7px 14px',
        border: 'none',
        cursor: 'pointer',
        borderBottom: active ? '2px solid #C0392B' : '2px solid transparent',
        background: 'transparent',
        color: active ? '#E8E4DC' : '#5A5850',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <Icon size={10} />
      {view.label}
    </button>
  );
}

function KpiCard({ label, value, color = '#E8E4DC' }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.08)',
        borderRadius: 2,
        minWidth: 104,
      }}
    >
      <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionBlock({ eyebrow, title, description, children }) {
  return (
    <section
      style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '0.5px solid rgba(200,170,100,0.08)',
          background: 'rgba(200,170,100,0.03)',
        }}
      >
        {eyebrow && (
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9,
              color: '#C8A84B',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: '#E8E4DC',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 10, color: '#5A5850', marginTop: 4, maxWidth: 820 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        {children}
      </div>
    </section>
  );
}

function TransferOfferRow({ transfer, onAccept, onDecline }) {
  const [busy, setBusy] = useState(false);

  const itemSummary = (transfer.items || [])
    .map((item) => `${Number(item.quantity_scu || 0)} SCU ${item.material_name || item.material_type || ''}`.trim())
    .filter(Boolean)
    .join(', ');

  const offeredAt = transfer.offered_at
    ? new Date(transfer.offered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  const handleAccept = async () => {
    setBusy(true);
    await onAccept(transfer);
    setBusy(false);
  };

  const handleDecline = async () => {
    setBusy(true);
    await onDecline(transfer);
    setBusy(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#E8E4DC' }}>
          <span style={{ color: '#3498DB', fontWeight: 600 }}>{transfer.from_callsign || '—'}</span>
          <span style={{ color: '#5A5850', margin: '0 6px' }}>→</span>
          <span>{itemSummary || 'Transfer package'}</span>
        </div>
        <div style={{ fontSize: 9, color: '#5A5850', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {transfer.pickup_location && <span>From: {transfer.pickup_location}</span>}
          {Number(transfer.aUEC) > 0 && <span style={{ color: '#C8A84B' }}>{Number(transfer.aUEC).toLocaleString()} aUEC</span>}
          {offeredAt && <span>Offered {offeredAt}</span>}
          {transfer.notes && <span style={{ color: '#9A9488', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transfer.notes}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDecline}
        disabled={busy}
        style={{
          padding: '4px 10px',
          background: 'transparent',
          border: '0.5px solid rgba(192,57,43,0.35)',
          borderRadius: 2,
          color: busy ? '#5A5850' : '#C0392B',
          fontSize: 9,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer',
          letterSpacing: '0.08em',
        }}
      >
        DECLINE
      </button>
      <button
        type="button"
        onClick={handleAccept}
        disabled={busy}
        style={{
          padding: '4px 10px',
          background: busy ? 'transparent' : 'rgba(74,140,92,0.12)',
          border: `0.5px solid ${busy ? 'rgba(74,140,92,0.15)' : 'rgba(74,140,92,0.45)'}`,
          borderRadius: 2,
          color: busy ? '#5A5850' : '#4A8C5C',
          fontSize: 9,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer',
          letterSpacing: '0.08em',
        }}
      >
        ACCEPT
      </button>
    </div>
  );
}

function TransferInbox({ transfers, onAccept, onDecline }) {
  if (!transfers || transfers.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 12,
        background: '#0A0C10',
        border: '0.5px solid rgba(52,152,219,0.22)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '7px 12px',
          borderBottom: '0.5px solid rgba(52,152,219,0.12)',
          background: 'rgba(52,152,219,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Inbox size={11} style={{ color: '#3498DB' }} />
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 10,
            color: '#3498DB',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Transfer Offers
        </span>
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 9,
            color: '#5A5850',
            marginLeft: 4,
          }}
        >
          {transfers.length} pending — accept to confirm receipt intent, decline to reject
        </span>
      </div>
      <div style={{ padding: '4px 12px' }}>
        {transfers.map((transfer) => (
          <TransferOfferRow
            key={transfer.id}
            transfer={transfer}
            onAccept={onAccept}
            onDecline={onDecline}
          />
        ))}
      </div>
    </div>
  );
}

export default function AssetInventoryTab({
  blueprints = [],
  materials: orgMaterials = [],
  callsign: providedCallsign,
  rank,
  craftQueue = [],
  refineryOrders = [],
  scoutDeposits = [],
  cofferLogs = [],
}) {
  const { user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const callsign = (providedCallsign || user?.callsign || '').toUpperCase();

  const inventoryScope = searchParams.get('inventoryScope') === 'org' ? 'org' : 'me';
  const inventoryView = INVENTORY_VIEWS.some((view) => view.id === searchParams.get('inventoryView'))
    ? searchParams.get('inventoryView')
    : 'holdings';

  const [personalAssets, setPersonalAssets] = useState([]);
  const [orgShips, setOrgShips] = useState([]);
  const [orgAssets, setOrgAssets] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const [ocrResults, setOcrResults] = useState(null);
  const [ocrMode, setOcrMode] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [assets, ships, assetsRegistry, directory, transfers] = await Promise.all([
      base44.entities.PersonalAsset.list('-logged_at', 500).catch(() => []),
      base44.entities.OrgShip.list('name', 300).catch(() => []),
      base44.entities.OrgAsset.list('-acquired_at', 500).catch(() => []),
      listMemberDirectory({ sort: '-last_seen_at', limit: 500 }).catch(() => []),
      base44.entities.MaterialTransfer.filter({ status: 'OFFERED' }, '-offered_at', 100).catch(() => []),
    ]);

    setPersonalAssets(assets || []);
    setOrgShips(ships || []);
    setOrgAssets(assetsRegistry || []);
    setMembers(directory || []);
    setPendingTransfers(transfers || []);
    setLoading(false);
  }, []);

  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => {
    void refreshNow();
  }, [refreshNow]);

  useEffect(() => {
    const unsubs = [
      base44.entities.PersonalAsset.subscribe(scheduleRefresh),
      base44.entities.OrgShip.subscribe(scheduleRefresh),
      base44.entities.OrgAsset.subscribe(scheduleRefresh),
      base44.entities.MaterialTransfer.subscribe(scheduleRefresh),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [scheduleRefresh]);

  useEffect(() => {
    setSearch('');
    setShowAdd(false);
    setShowOcr(false);
    setOcrResults(null);
  }, [inventoryScope, inventoryView]);

  const updateInventoryParams = useCallback((nextScope, nextView) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'inventory');
    nextParams.set('inventoryScope', nextScope ?? inventoryScope);
    nextParams.set('inventoryView', nextView ?? inventoryView);
    setSearchParams(nextParams, { replace: true });
  }, [inventoryScope, inventoryView, searchParams, setSearchParams]);

  const myAssets = useMemo(() => {
    if (!callsign) return [];
    return personalAssets.filter((asset) => matchesCallsign(asset.owner_callsign, callsign));
  }, [personalAssets, callsign]);

  const myMaterialAssets = useMemo(() => {
    return myAssets.filter((asset) => asset.category === 'MATERIAL');
  }, [myAssets]);

  const myOrgMaterials = useMemo(() => {
    if (!callsign) return [];
    return (orgMaterials || []).filter((material) => {
      if (material.is_archived) return false;
      return matchesCallsign(material.custodian_callsign, callsign)
        || matchesCallsign(material.logged_by_callsign, callsign);
    });
  }, [orgMaterials, callsign]);

  const myShips = useMemo(() => {
    if (!callsign) return [];
    return orgShips.filter((ship) => matchesCallsign(ship.assigned_to_callsign, callsign));
  }, [orgShips, callsign]);

  const myShipIds = useMemo(() => new Set(myShips.map((ship) => ship.id).filter(Boolean)), [myShips]);

  const myOrgAssets = useMemo(() => {
    if (!callsign) return [];
    return orgAssets.filter((asset) => {
      return matchesCallsign(asset.assigned_to_callsign, callsign)
        || (asset.linked_ship_id && myShipIds.has(asset.linked_ship_id));
    });
  }, [orgAssets, callsign, myShipIds]);

  const otherAssets = useMemo(() => {
    return myAssets.filter((asset) => asset.category !== 'MATERIAL');
  }, [myAssets]);

  const orgNetworkMaterials = useMemo(() => {
    return (orgMaterials || []).filter((material) => !material.is_archived && Number(material.quantity_scu || 0) > 0);
  }, [orgMaterials]);

  const myInventory = useMemo(() => buildInventoryMap(myMaterialAssets, myOrgMaterials), [myMaterialAssets, myOrgMaterials]);
  const orgInventory = useMemo(() => buildInventoryMap([], orgNetworkMaterials), [orgNetworkMaterials]);

  const myPendingTransfers = useMemo(() => {
    if (!callsign) return [];
    return pendingTransfers.filter((t) => matchesCallsign(t.to_callsign, callsign));
  }, [pendingTransfers, callsign]);

  const handleAcceptTransfer = useCallback(async (transfer) => {
    try {
      await base44.entities.MaterialTransfer.update(transfer.id, {
        status: 'ACCEPTED',
        confirmed_at: new Date().toISOString(),
      });
      void refreshNow();
    } catch (err) {
      console.error('[TransferInbox] accept failed:', err);
    }
  }, [refreshNow]);

  const handleDeclineTransfer = useCallback(async (transfer) => {
    try {
      await base44.entities.MaterialTransfer.update(transfer.id, { status: 'CANCELLED' });
      void refreshNow();
    } catch (err) {
      console.error('[TransferInbox] decline failed:', err);
    }
  }, [refreshNow]);

  const scopedCraftQueue = useMemo(() => {
    if (inventoryScope === 'org') return craftQueue;
    return craftQueue.filter((job) => {
      return matchesCallsign(job.claimed_by_callsign, callsign)
        || matchesCallsign(job.requested_by_callsign, callsign);
    });
  }, [callsign, craftQueue, inventoryScope]);

  const scopedRefineryOrders = useMemo(() => {
    if (inventoryScope === 'org') return refineryOrders;
    return refineryOrders.filter((order) => matchesCallsign(order.submitted_by_callsign, callsign));
  }, [callsign, inventoryScope, refineryOrders]);

  const scopedCofferLogs = useMemo(() => {
    if (inventoryScope === 'org') return cofferLogs;
    return cofferLogs.filter((log) => matchesCallsign(log.logged_by_callsign, callsign));
  }, [callsign, cofferLogs, inventoryScope]);

  const scopedScoutDeposits = useMemo(() => {
    if (inventoryScope === 'org') return scoutDeposits;
    return scoutDeposits.filter((deposit) => matchesCallsign(deposit.reported_by_callsign, callsign));
  }, [callsign, inventoryScope, scoutDeposits]);

  const readinessMaterials = inventoryScope === 'org' ? orgNetworkMaterials : myOrgMaterials;
  const readinessInventory = inventoryScope === 'org' ? orgInventory : myInventory;
  const assetScopeLabel = inventoryScope === 'org' ? 'org-wide custody' : 'your current custody';

  const myMaterialLines = myMaterialAssets.length + myOrgMaterials.length;
  const myTotalScu = totalScuFromInventory(myInventory);
  const myCraftReady = craftReadyLinesFromInventory(myInventory);
  const myPersonalValue = myAssets.reduce((sum, asset) => sum + Number(asset.estimated_value_aUEC || 0), 0);

  const orgTotalScu = orgNetworkMaterials.reduce((sum, material) => sum + Number(material.quantity_scu || 0), 0);
  const orgCraftReady = orgNetworkMaterials.filter((material) => qualityPercentFromRecord(material) >= 80).length;
  const orgHolderCount = new Set(
    orgNetworkMaterials
      .map((material) => (material.custodian_callsign || material.logged_by_callsign || '').toUpperCase())
      .filter(Boolean)
  ).size;

  const kpis = inventoryScope === 'me'
    ? [
        { label: 'HOLDING LINES', value: myMaterialLines, color: '#4A8C5C' },
        { label: 'TOTAL SCU', value: myTotalScu.toFixed(1), color: '#C8A84B' },
        { label: 'CRAFT READY', value: myCraftReady, color: '#C8A84B' },
        { label: 'ORG ASSETS', value: myOrgAssets.length, color: '#7AAECC' },
        { label: 'SHIPS', value: myShips.length, color: '#3498DB' },
        { label: 'PERSONAL VALUE', value: `${(myPersonalValue / 1000).toFixed(0)}K`, color: '#E8A020' },
        ...(myPendingTransfers.length > 0 ? [{ label: 'INCOMING', value: myPendingTransfers.length, color: '#3498DB' }] : []),
      ]
    : [
        { label: 'MATERIAL LINES', value: orgNetworkMaterials.length, color: '#4A8C5C' },
        { label: 'ORG SCU', value: orgTotalScu.toFixed(1), color: '#C8A84B' },
        { label: 'CRAFT READY', value: orgCraftReady, color: '#C8A84B' },
        { label: 'ORG ASSETS', value: orgAssets.length, color: '#7AAECC' },
        { label: 'SHIPS', value: orgShips.length, color: '#3498DB' },
        { label: 'HOLDERS', value: orgHolderCount, color: '#9A9488' },
      ];

  const showSearch = ['holdings', 'network', 'assets'].includes(inventoryView);
  const showPersonalActions = inventoryView === 'holdings' && inventoryScope === 'me';

  const searchPlaceholder = inventoryView === 'assets'
    ? inventoryScope === 'org'
      ? 'Search assets, ships, serials, or locations...'
      : 'Search assigned assets, ships, or storage...'
    : inventoryView === 'network'
      ? 'Search materials, custodians, or storage locations...'
      : inventoryScope === 'org'
        ? 'Search org materials, holders, or cargo locations...'
        : 'Search your materials, assets, or locations...';

  const viewSummary = useMemo(() => {
    switch (inventoryView) {
      case 'holdings':
        return inventoryScope === 'me'
          ? 'Track personal holdings, org materials in your custody, OCR intake, and donation flow without leaving Industry.'
          : 'Org holdings are being shown as a custody network so leadership can see where materials currently sit.';
      case 'network':
        return 'Map org custody, check blueprint coverage, and find crafters or material holders from a single network view.';
      case 'assets':
        return 'Manage the org asset register and ship custody from the same inventory command center.';
      case 'gear':
        return 'Shared gear and ship components live here as the authoritative ArmoryItem manager. Armory reuses the same stock read-only.';
      case 'readiness':
        return 'Measure craftability, reserve assets for ops, cross-reference fleet readiness, and watch low-stock shortages against the current inventory basis.';
      case 'search':
        return 'Full-scope search across materials, personal assets, org assets, and ships in a single unified results view.';
      default:
        return '';
    }
  }, [inventoryScope, inventoryView]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  const renderHoldings = () => {
    if (inventoryScope === 'me') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <TransferInbox
            transfers={myPendingTransfers}
            onAccept={handleAcceptTransfer}
            onDecline={handleDeclineTransfer}
          />
          <AssetList
            materialAssets={myMaterialAssets}
            orgMaterials={myOrgMaterials}
            otherAssets={otherAssets}
            search={search}
            onRefresh={refreshNow}
            callsign={callsign}
            members={members}
          />
        </div>
      );
    }

    return (
      <SectionBlock
        eyebrow="Custody Network"
        title="Org holdings by custodian"
        description="Org scope remaps holdings to the live custody network so you can see who currently carries usable stock."
      >
        <InventoryNetworkPanel materials={orgNetworkMaterials} search={search} />
      </SectionBlock>
    );
  };

  const renderNetwork = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionBlock
        eyebrow="Custody Map"
        title="Org material network"
        description="Search the active custody map to see who holds materials, how much SCU is available, and where craft-ready stock is parked."
      >
        <InventoryNetworkPanel materials={orgNetworkMaterials} search={search} />
      </SectionBlock>

      <SectionBlock
        eyebrow="Blueprint Coverage"
        title="Owned vs missing blueprint coverage"
        description="Review blueprint ownership gaps and launch requisitions for missing coverage without leaving inventory."
      >
        <BlueprintOwnershipPanel blueprints={blueprints} callsign={callsign} rank={rank} />
      </SectionBlock>

      <SectionBlock
        eyebrow="Crafter Discovery"
        title="Find members by item, material, or callsign"
        description="Search the member network to find who owns a blueprint, who holds the ingredients, or who is already refining a needed material."
      >
        <FindCraftersTab embedded blueprints={blueprints} materials={orgNetworkMaterials} callsign={callsign} />
      </SectionBlock>
    </div>
  );

  const renderAssets = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionBlock
        eyebrow="Asset Register"
        title={inventoryScope === 'org' ? 'Org asset roster' : 'Assets in your custody'}
        description="Register, review, and update org-owned assets without switching to a separate armory inventory page."
      >
        <InventoryAssetRoster
          assets={inventoryScope === 'me' ? myOrgAssets : orgAssets}
          members={members}
          ships={orgShips}
          search={search}
          scope={inventoryScope}
          onRefresh={refreshNow}
        />
      </SectionBlock>

      <SectionBlock
        eyebrow="Ship Custody"
        title={inventoryScope === 'org' ? 'Org ship assignments' : 'Ships assigned to you'}
        description="Ship custody stays visible alongside the asset register so material movement and craft support can be planned from one surface."
      >
        <ShipList
          ships={inventoryScope === 'me' ? myShips : orgShips}
          search={search}
          scope={inventoryScope}
        />
      </SectionBlock>
    </div>
  );

  const renderGear = () => (
    <SectionBlock
      eyebrow="Shared Gear"
      title="Armory stock by vessel and storage"
      description="This is the authoritative editor for shared gear and ship components. Armory checkout reads the same stock without maintaining a second inventory manager."
    >
      <ArmoryStockPanel />
    </SectionBlock>
  );

  const renderReadiness = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionBlock
        eyebrow="Craft Gaps"
        title="Craftability against the active inventory basis"
        description="Use your current scope to see what can be crafted now and send requisitions for the exact shortfalls that remain."
      >
        <GapAnalysis
          blueprints={blueprints}
          inventory={readinessInventory}
          callsign={callsign}
          basisLabel={assetScopeLabel}
        />
      </SectionBlock>

      <SectionBlock
        eyebrow="Asset Reservations"
        title="Schedule ships and assets for ops or personal use"
        description="Reserve a ship or asset for a time window. Leaders confirm and activate reservations. Conflicts are detected before booking."
      >
        <AssetReservationPanel callsign={callsign} rank={rank} ships={orgShips} orgAssets={orgAssets} />
      </SectionBlock>

      <SectionBlock
        eyebrow="Op Fleet Readiness"
        title="Live ops cross-referenced against ship mission readiness"
        description="See which ships in the fleet are fit for each active or upcoming op type, and which assets are unassigned and ready to deploy."
      >
        <OpReadinessPanel ships={orgShips} orgAssets={orgAssets} />
      </SectionBlock>

      <SectionBlock
        eyebrow="Lifecycle Flow"
        title="Material movement through scouting, refining, crafting, and sale"
        description="This flow view uses the same inventory scope to show whether readiness bottlenecks are in intake, refining, or fabrication."
      >
        <MaterialLifecycleTracker
          materials={readinessMaterials}
          refineryOrders={scopedRefineryOrders}
          craftQueue={scopedCraftQueue}
          cofferLogs={scopedCofferLogs}
          scoutDeposits={scopedScoutDeposits}
        />
      </SectionBlock>

      <SectionBlock
        eyebrow="Shortage Signals"
        title="Low-stock alerts and threshold tuning"
        description="Adjust monitored materials and dispatch shortage alerts from the same readiness view used for craftability."
      >
        <LowStockAlerts materials={readinessMaterials} callsign={callsign} />
      </SectionBlock>
    </div>
  );

  const renderSearch = () => (
    <SectionBlock
      eyebrow="Unified Search"
      title="Search across all inventory"
      description="Query materials, personal assets, org assets, and ships in a single pass."
    >
      <InventorySearchPanel
        materials={inventoryScope === 'me' ? myOrgMaterials : orgNetworkMaterials}
        personalAssets={inventoryScope === 'me' ? myMaterialAssets.concat(otherAssets) : personalAssets}
        orgAssets={inventoryScope === 'me' ? myOrgAssets : orgAssets}
        orgShips={inventoryScope === 'me' ? myShips : orgShips}
      />
    </SectionBlock>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          background: '#0A0908',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={15} style={{ color: '#C8A84B' }} />
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#E8E4DC',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                INVENTORY COMMAND
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  color: '#5A5850',
                  letterSpacing: '0.06em',
                }}
              >
                — {callsign || 'UNASSIGNED'}
              </span>
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                color: '#5A5850',
                lineHeight: 1.5,
                maxWidth: 860,
              }}
            >
              {viewSummary}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={refreshNow}
              style={{
                padding: '6px 10px',
                background: '#141410',
                border: '0.5px solid rgba(200,170,100,0.12)',
                borderRadius: 2,
                color: '#5A5850',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
              }}
            >
              <RefreshCw size={10} />
              REFRESH
            </button>

            {showPersonalActions && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowOcr((open) => !open);
                    if (!showOcr) {
                      setShowAdd(false);
                      setOcrResults(null);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 2,
                    background: showOcr ? 'rgba(142,68,173,0.12)' : '#141410',
                    border: `0.5px solid ${showOcr ? 'rgba(142,68,173,0.4)' : 'rgba(200,170,100,0.12)'}`,
                    color: showOcr ? '#8E44AD' : '#9A9488',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    letterSpacing: '0.08em',
                  }}
                >
                  <Camera size={10} />
                  {showOcr ? 'CLOSE OCR' : 'SCAN'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd((open) => !open);
                    if (!showAdd) {
                      setShowOcr(false);
                      setOcrResults(null);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 2,
                    background: showAdd ? 'rgba(192,57,43,0.12)' : '#C0392B',
                    border: showAdd ? '0.5px solid rgba(192,57,43,0.3)' : 'none',
                    color: showAdd ? '#C0392B' : '#E8E4DC',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    letterSpacing: '0.08em',
                  }}
                >
                  <Plus size={10} />
                  {showAdd ? 'CANCEL' : 'LOG HOLDING'}
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {SCOPES.map((scope) => (
            <ScopeButton key={scope.id} scope={scope} active={inventoryScope === scope.id} onClick={(nextScope) => updateInventoryParams(nextScope)} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} color={kpi.color} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {INVENTORY_VIEWS.map((view) => (
              <ViewButton key={view.id} view={view} active={inventoryView === view.id} onClick={(nextView) => updateInventoryParams(undefined, nextView)} />
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {showSearch && (
            <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
              <Search size={10} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
              <input
                className="nexus-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 24, height: 28, fontSize: 10 }}
              />
            </div>
          )}
        </div>
      </div>

      {showOcr && !ocrResults && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <OcrScanner
            onResults={(items, mode) => {
              setOcrResults(items);
              setOcrMode(mode);
            }}
            onCancel={() => {
              setShowOcr(false);
              setOcrResults(null);
            }}
          />
        </div>
      )}

      {ocrResults && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <OcrResultsReview
            items={ocrResults}
            mode={ocrMode}
            callsign={callsign}
            onSaved={() => {
              setOcrResults(null);
              setShowOcr(false);
              void refreshNow();
            }}
            onCancel={() => setOcrResults(null)}
          />
        </div>
      )}

      {showAdd && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <AddAssetForm
            callsign={callsign}
            onCreated={() => {
              setShowAdd(false);
              void refreshNow();
            }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 16px' }}>
        {inventoryView === 'holdings' && renderHoldings()}
        {inventoryView === 'network' && renderNetwork()}
        {inventoryView === 'assets' && renderAssets()}
        {inventoryView === 'gear' && renderGear()}
        {inventoryView === 'readiness' && renderReadiness()}
        {inventoryView === 'search' && renderSearch()}
      </div>
    </div>
  );
}
