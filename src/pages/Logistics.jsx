import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAnimatedList } from '@/core/hooks/useAnimatedList';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import EmptyState from '@/core/design/EmptyState';
import OperationalReferenceStrip from '@/core/design/OperationalReferenceStrip';
import {
  buildPriceLookup,
  calculateManifestValue,
  collateralMultiplierForTier,
  formatAuec,
  formatCompactAuec,
  parseManifestText,
  resolveRiskTier,
  summarizeManifest,
  toArray,
} from '@/core/data/commerce-logistics';
import {
  AlertTriangle,
  Package,
  Plus,
  Route,
  Truck,
} from 'lucide-react';

const TABS = [
  { id: 'cargo', label: 'Cargo Board' },
  { id: 'manifest', label: 'Manifest' },
  { id: 'consignment', label: 'Consignment' },
  { id: 'dispatch', label: 'Dispatch' },
];

const STATUS_STYLES = {
  OPEN: { color: 'var(--acc)', bg: 'rgba(200,168,75,0.14)' },
  CLAIMED: { color: 'var(--info)', bg: 'rgba(93,156,236,0.16)' },
  IN_TRANSIT: { color: 'var(--warn)', bg: 'rgba(243,156,18,0.16)' },
  DELIVERED: { color: 'var(--live)', bg: 'rgba(74,232,48,0.14)' },
  FAILED: { color: 'var(--danger)', bg: 'rgba(192,57,43,0.14)' },
  CANCELLED: { color: 'var(--t2)', bg: 'rgba(157,161,205,0.12)' },
  PENDING: { color: 'var(--warn)', bg: 'rgba(243,156,18,0.16)' },
  LISTED: { color: 'var(--info)', bg: 'rgba(93,156,236,0.16)' },
  SOLD: { color: 'var(--live)', bg: 'rgba(74,232,48,0.14)' },
  RETURNED: { color: 'var(--t2)', bg: 'rgba(157,161,205,0.12)' },
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

export default function Logistics() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState('cargo');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [entityAvailability, setEntityAvailability] = useState({
    CargoJob: true,
    Consignment: true,
    OrgShip: true,
    Material: true,
    GameCacheCommodity: true,
  });
  const [jobs, setJobs] = useState([]);
  const [consignments, setConsignments] = useState([]);
  const [ships, setShips] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showConsignmentForm, setShowConsignmentForm] = useState(false);
  const [jobForm, setJobForm] = useState({
    job_type: 'HAUL',
    title: '',
    pickup_location: '',
    delivery_location: '',
    reward_aUEC: '',
    collateral_aUEC: '',
    risk_tier: '',
    cargo_manifest_text: '',
    notes: '',
  });
  const [consignmentForm, setConsignmentForm] = useState({
    goods_text: '',
    asking_price_aUEC: '',
    commission_rate: '5',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [jobsResult, consignmentsResult, shipsResult, materialsResult, commoditiesResult] = await Promise.allSettled([
      base44.entities.CargoJob.list('-created_at', 200),
      base44.entities.Consignment.list('-created_at', 200),
      base44.entities.OrgShip.list('-last_synced', 200),
      base44.entities.Material.list('-logged_at', 200),
      base44.entities.GameCacheCommodity.list('-baseline_price', 200),
    ]);

    const nextAvailability = {
      CargoJob: jobsResult.status === 'fulfilled',
      Consignment: consignmentsResult.status === 'fulfilled',
      OrgShip: shipsResult.status === 'fulfilled',
      Material: materialsResult.status === 'fulfilled',
      GameCacheCommodity: commoditiesResult.status === 'fulfilled',
    };
    const unavailable = [];
    if (jobsResult.status === 'fulfilled') setJobs(toArray(jobsResult.value)); else { setJobs([]); unavailable.push('CargoJob'); }
    if (consignmentsResult.status === 'fulfilled') setConsignments(toArray(consignmentsResult.value)); else { setConsignments([]); unavailable.push('Consignment'); }
    if (shipsResult.status === 'fulfilled') setShips(toArray(shipsResult.value)); else { setShips([]); unavailable.push('OrgShip'); }
    if (materialsResult.status === 'fulfilled') setMaterials(toArray(materialsResult.value)); else { setMaterials([]); unavailable.push('Material'); }
    if (commoditiesResult.status === 'fulfilled') setCommodities(toArray(commoditiesResult.value)); else { setCommodities([]); unavailable.push('GameCacheCommodity'); }
    setEntityAvailability(nextAvailability);
    setWarning(unavailable.length ? `This deployment is missing ${unavailable.join(', ')} data surfaces. Logistics will degrade to read-only until those entities are available.` : '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsubscribers = [
      base44.entities.CargoJob.subscribe(() => load()),
      base44.entities.Consignment.subscribe(() => load()),
      base44.entities.OrgShip.subscribe(() => load()),
    ];
    return () => unsubscribers.forEach((unsubscribe) => typeof unsubscribe === 'function' && unsubscribe());
  }, [load]);

  const viewerId = user?.id || '';
  const viewerCallsign = user?.callsign || 'UNKNOWN';
  const capabilities = useMemo(() => ({
    cargoWrites: Boolean(entityAvailability.CargoJob),
    manifestWrites: Boolean(entityAvailability.CargoJob),
    consignmentWrites: Boolean(entityAvailability.Consignment),
    dispatchWrites: Boolean(entityAvailability.CargoJob && entityAvailability.OrgShip),
    pricingLive: Boolean(entityAvailability.Material && entityAvailability.GameCacheCommodity),
    fleetLive: Boolean(entityAvailability.OrgShip),
  }), [entityAvailability]);
  const surfaceSummary = useMemo(() => ([
    capabilities.cargoWrites ? 'Cargo board can issue and claim jobs.' : 'Cargo board is read-only because CargoJob is unavailable.',
    capabilities.consignmentWrites ? 'Consignments can post and settle normally.' : 'Consignment workflow is blocked because Consignment is unavailable.',
    capabilities.dispatchWrites ? 'Dispatch can assign ships against shared fleet data.' : 'Dispatch cannot persist assignments until CargoJob and OrgShip are both available.',
  ]), [capabilities]);
  const priceLookup = useMemo(() => buildPriceLookup(materials, commodities), [materials, commodities]);
  const jobsWithMetrics = useMemo(() => {
    return jobs.map((job) => {
      const manifestItems = toArray(job.cargo_manifest);
      const manifestScu = manifestItems.reduce((sum, item) => sum + (Number(item.quantity_scu || item.quantity || 0) || 0), 0);
      const manifestValue = calculateManifestValue(manifestItems, priceLookup);
      return { ...job, manifestItems, manifestScu, manifestValue };
    });
  }, [jobs, priceLookup]);
  const openJobs = jobsWithMetrics.filter((job) => job.status === 'OPEN');
  const activeJobs = jobsWithMetrics.filter((job) => ['CLAIMED', 'IN_TRANSIT', 'DELIVERED'].includes(job.status));
  const animatedOpenJobs = useAnimatedList(openJobs, (j) => j.id);
  const animatedActiveJobs = useAnimatedList(activeJobs, (j) => j.id);
  const availableShips = ships.filter((ship) => ship.status === 'AVAILABLE' && Number(ship.cargo_scu || 0) > 0);
  const activeManifestValue = activeJobs.reduce((sum, job) => sum + job.manifestValue, 0);

  useEffect(() => {
    if (!capabilities.cargoWrites) {
      setShowJobForm(false);
    }
    if (!capabilities.consignmentWrites) {
      setShowConsignmentForm(false);
    }
  }, [capabilities.cargoWrites, capabilities.consignmentWrites]);

  const handleCreateJob = async (event) => {
    event.preventDefault();
    if (!capabilities.cargoWrites) {
      setError('Cargo job creation is disabled because the CargoJob entity is unavailable in this deployment.');
      return;
    }
    if (!viewerId || !jobForm.title.trim() || !jobForm.pickup_location.trim() || !jobForm.delivery_location.trim()) {
      setError('Enter a title, pickup, and delivery location before posting a cargo job.');
      return;
    }

    const manifest = parseManifestText(jobForm.cargo_manifest_text);
    const manifestValue = calculateManifestValue(manifest, priceLookup);
    const riskTier = resolveRiskTier(jobForm.risk_tier, manifestValue);
    const collateral = Number(jobForm.collateral_aUEC) || Math.round(manifestValue * collateralMultiplierForTier(riskTier));

    setBusy(true);
    setError('');
    try {
      await base44.entities.CargoJob.create({
        job_type: jobForm.job_type,
        title: jobForm.title.trim(),
        status: 'OPEN',
        risk_tier: riskTier,
        issuer_id: viewerId,
        issuer_callsign: viewerCallsign,
        cargo_manifest: manifest,
        pickup_location: jobForm.pickup_location.trim(),
        delivery_location: jobForm.delivery_location.trim(),
        reward_aUEC: Number(jobForm.reward_aUEC) || 0,
        collateral_aUEC: collateral,
        manifest_value_aUEC: manifestValue,
        notes: jobForm.notes.trim(),
        created_at: new Date().toISOString(),
      });
      setJobForm({ job_type: 'HAUL', title: '', pickup_location: '', delivery_location: '', reward_aUEC: '', collateral_aUEC: '', risk_tier: '', cargo_manifest_text: '', notes: '' });
      setShowJobForm(false);
      await load();
    } catch (nextError) {
      setError(nextError?.message || 'Unable to create a cargo job in this deployment.');
    } finally {
      setBusy(false);
    }
  };

  const handleJobUpdate = async (job, patch) => {
    if (!capabilities.manifestWrites) {
      setError('Cargo job updates are disabled because the CargoJob entity is unavailable in this deployment.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await base44.entities.CargoJob.update(job.id, patch);
      await load();
    } catch (nextError) {
      setError(nextError?.message || 'Unable to update cargo job state.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateConsignment = async (event) => {
    event.preventDefault();
    if (!capabilities.consignmentWrites) {
      setError('Consignment creation is disabled because the Consignment entity is unavailable in this deployment.');
      return;
    }
    if (!viewerId || !consignmentForm.goods_text.trim() || !consignmentForm.asking_price_aUEC) {
      setError('Enter goods and an asking price before posting a consignment.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await base44.entities.Consignment.create({
        consignor_id: viewerId,
        consignor_callsign: viewerCallsign,
        goods: parseManifestText(consignmentForm.goods_text),
        asking_price_aUEC: Number(consignmentForm.asking_price_aUEC) || 0,
        commission_rate: Number(consignmentForm.commission_rate) || 5,
        status: 'PENDING',
        notes: consignmentForm.notes.trim(),
        created_at: new Date().toISOString(),
      });
      setConsignmentForm({ goods_text: '', asking_price_aUEC: '', commission_rate: '5', notes: '' });
      setShowConsignmentForm(false);
      await load();
    } catch (nextError) {
      setError(nextError?.message || 'Unable to create a consignment in this deployment.');
    } finally {
      setBusy(false);
    }
  };

  const handleConsignmentUpdate = async (consignment, patch) => {
    if (!capabilities.consignmentWrites) {
      setError('Consignment updates are disabled because the Consignment entity is unavailable in this deployment.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await base44.entities.Consignment.update(consignment.id, patch);
      await load();
    } catch (nextError) {
      setError(nextError?.message || 'Unable to update consignment state.');
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
      <OperationalReferenceStrip
        sectionLabel="LOGISTICS"
        title="Cargo Movement And Hauling Coordination"
        description="Logistics is the shared execution layer for cargo jobs, manifests, consignments, and ship assignment once Commerce or Scout work becomes a real movement task."
        statusPills={[
          { label: capabilities.cargoWrites ? 'cargo live' : 'cargo read-only', tone: capabilities.cargoWrites ? 'live' : 'danger' },
          { label: capabilities.consignmentWrites ? 'consignment live' : 'consignment blocked', tone: capabilities.consignmentWrites ? 'live' : 'danger' },
          { label: capabilities.dispatchWrites ? 'dispatch live' : 'dispatch limited', tone: capabilities.dispatchWrites ? 'live' : 'warn' },
          { label: capabilities.pricingLive ? 'pricing live' : 'pricing limited', tone: capabilities.pricingLive ? 'live' : 'warn' },
        ]}
        notes={[
          { label: 'When To Use', value: 'Move Goods', detail: 'Use Logistics to post hauling work, advance claimed manifests, handle consignments, and assign a real org ship to active cargo.' },
          { label: 'Data Depends On', value: 'Cargo + Fleet + Pricing', detail: 'Full logistics execution needs CargoJob, Consignment, OrgShip, Material, and commodity cache records to be present and writable.' },
          { label: 'Next Step', value: 'Dispatch And Confirm', detail: 'Once a cargo job is claimed, progress it through launch, delivery, confirmation, and ship assignment from the same workspace.' },
        ]}
        actions={[
          { label: 'Open Commerce', onClick: () => navigate('/app/industry?tab=commerce'), tone: 'info' },
          { label: 'Open Org Fleet', onClick: () => navigate('/app/armory/fleet'), tone: 'warn' },
          { label: 'Open Dispatch', onClick: () => setActiveTab('dispatch'), tone: 'neutral' },
        ]}
      />

      {warning ? <div className="nexus-card-2" style={{ color: 'var(--warn)', fontSize: 11, lineHeight: 1.6 }}>{warning}</div> : null}
      {error ? <div className="nexus-card-2" style={{ color: 'var(--danger)', fontSize: 11, lineHeight: 1.6 }}>{error}</div> : null}
      <div className="nexus-card-2" style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
        {surfaceSummary.join(' ')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <MetricCard label="Open Jobs" value={String(openJobs.length)} detail="Cargo work orders currently available to claim." color="var(--acc)" />
        <MetricCard label="In Flight" value={String(activeJobs.length)} detail="Claimed, in-transit, or delivered jobs awaiting closure." color="var(--info)" />
        <MetricCard label="Manifest Value" value={formatCompactAuec(activeManifestValue)} detail="Estimated aUEC value tied up in active cargo movement." color="var(--warn)" />
        <MetricCard label="Dispatch Ready" value={String(availableShips.length)} detail="Available ships with cargo space ready for assignment." color="var(--live)" />
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
        <button type="button" className="nexus-btn" onClick={() => navigate('/app/armory/org-fleet')}>Open Org Fleet</button>
      </div>

      {activeTab === 'cargo' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nexus-section-header">CARGO BOARD</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Post new hauling work, calculate collateral from manifest value, and claim open jobs.</div>
          </div>

          <div className="nexus-card-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Post Cargo Job</div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                {capabilities.cargoWrites
                  ? 'Manifest lines accept `Commodity: Qty` or `Commodity xQty` input.'
                  : 'Cargo board data remains visible, but new job posting is disabled in this deployment.'}
              </div>
            </div>
            <button type="button" onClick={() => setShowJobForm((current) => !current)} className="nexus-btn primary" style={{ padding: '7px 12px' }} disabled={!capabilities.cargoWrites}>
              <Plus size={12} />
              New Cargo Job
            </button>
          </div>

          {showJobForm ? (
            <form onSubmit={handleCreateJob} className="nexus-card-2 nexus-raised" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>JOB TYPE</label>
                <select className="nexus-input" value={jobForm.job_type} onChange={(event) => setJobForm((current) => ({ ...current, job_type: event.target.value }))} disabled={!capabilities.cargoWrites}>
                  <option value="HAUL">HAUL</option>
                  <option value="COLLECT">COLLECT</option>
                  <option value="DELIVER">DELIVER</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>TITLE</label>
                <input className="nexus-input" value={jobForm.title} onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))} placeholder="Pyro relief run" required disabled={!capabilities.cargoWrites} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>PICKUP</label>
                <input className="nexus-input" value={jobForm.pickup_location} onChange={(event) => setJobForm((current) => ({ ...current, pickup_location: event.target.value }))} placeholder="Patch City" required disabled={!capabilities.cargoWrites} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>DELIVERY</label>
                <input className="nexus-input" value={jobForm.delivery_location} onChange={(event) => setJobForm((current) => ({ ...current, delivery_location: event.target.value }))} placeholder="Ruin Station" required disabled={!capabilities.cargoWrites} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>RISK TIER</label>
                <select className="nexus-input" value={jobForm.risk_tier} onChange={(event) => setJobForm((current) => ({ ...current, risk_tier: event.target.value }))} disabled={!capabilities.cargoWrites}>
                  <option value="">AUTO</option>
                  <option value="GREEN">GREEN</option>
                  <option value="AMBER">AMBER</option>
                  <option value="RED">RED</option>
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>REWARD</label>
                <input className="nexus-input" type="number" min="0" value={jobForm.reward_aUEC} onChange={(event) => setJobForm((current) => ({ ...current, reward_aUEC: event.target.value }))} placeholder="180000" disabled={!capabilities.cargoWrites} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>COLLATERAL</label>
                <input className="nexus-input" type="number" min="0" value={jobForm.collateral_aUEC} onChange={(event) => setJobForm((current) => ({ ...current, collateral_aUEC: event.target.value }))} placeholder="Auto if blank" disabled={!capabilities.cargoWrites} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>CARGO MANIFEST</label>
                <textarea className="nexus-input" value={jobForm.cargo_manifest_text} onChange={(event) => setJobForm((current) => ({ ...current, cargo_manifest_text: event.target.value }))} placeholder={'Medical Supplies: 32\nHydrogen Fuel: 16'} style={{ minHeight: 88, resize: 'vertical', whiteSpace: 'pre-wrap' }} disabled={!capabilities.cargoWrites} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>NOTES</label>
                <textarea className="nexus-input" value={jobForm.notes} onChange={(event) => setJobForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Escort required on final jump." style={{ minHeight: 72, resize: 'vertical' }} disabled={!capabilities.cargoWrites} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="nexus-btn" onClick={() => setShowJobForm(false)}>Cancel</button>
                <button type="submit" className="nexus-btn primary" disabled={busy || !capabilities.cargoWrites}>{busy ? 'Posting...' : 'Post Job'}</button>
              </div>
            </form>
          ) : null}

          <div className={`nexus-card nexus-bg-dimable${showJobForm ? ' nexus-bg-dimmed' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openJobs.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No open cargo jobs"
                detail={capabilities.cargoWrites ? 'Post a new job or wait for another courier order to arrive.' : 'Cargo jobs cannot be created or claimed until the CargoJob entity is restored.'}
                action={capabilities.cargoWrites}
                actionLabel="Post Job"
                actionOnClick={() => setShowJobForm(true)}
              />
            ) : (
              animatedOpenJobs.map(({ item: job, state }) => (
                <div key={job.id} data-anim={state} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr) auto', gap: 12, padding: '12px 0', borderTop: '0.5px solid var(--b0)', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{job.title || 'Untitled cargo job'}</div>
                      <StatusPill status={job.status} />
                      <StatusPill status={job.risk_tier} />
                    </div>
                    <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{summarizeManifest(job.manifestItems)}</div>
                    <div style={{ color: 'var(--t2)', fontSize: 10 }}>{job.pickup_location} → {job.delivery_location}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--t2)', fontSize: 10 }}>
                    <div>Reward: <span style={{ color: 'var(--t0)' }}>{formatAuec(job.reward_aUEC)}</span></div>
                    <div>Collateral: <span style={{ color: 'var(--t0)' }}>{formatAuec(job.collateral_aUEC)}</span></div>
                    <div>Value: <span style={{ color: 'var(--t0)' }}>{job.manifestValue > 0 ? formatCompactAuec(job.manifestValue) : 'Ad hoc'}</span></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                    <button type="button" className="nexus-btn" onClick={() => handleJobUpdate(job, { status: 'CLAIMED', courier_id: viewerId, courier_callsign: viewerCallsign, claimed_at: new Date().toISOString() })} disabled={busy || !capabilities.cargoWrites}>Claim Job</button>
                    <button type="button" className="nexus-btn" onClick={() => navigate('/app/industry/commerce')}>Open Commerce</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'manifest' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nexus-section-header">MANIFEST</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Advance claimed jobs through launch, delivery, confirmation, and failure handling.</div>
          </div>

          <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeJobs.length === 0 ? (
              <EmptyState icon={Route} title="No active manifests" detail="Claim a cargo job from the board to start tracking its manifest through delivery." />
            ) : (
              activeJobs.map((job) => {
                const isIssuer = job.issuer_id === viewerId;
                const isCourier = job.courier_id === viewerId;
                return (
                  <div key={job.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr) auto', gap: 12, padding: '12px 0', borderTop: '0.5px solid var(--b0)', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{job.title || 'Untitled cargo job'}</div>
                        <StatusPill status={job.status} />
                        {job.confirmed_at ? <StatusPill status="COMPLETE" /> : null}
                      </div>
                      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{summarizeManifest(job.manifestItems)}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 10 }}>{job.pickup_location} → {job.delivery_location}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 10 }}>Courier: <span style={{ color: 'var(--t0)' }}>{job.courier_callsign || 'Unassigned'}</span>{job.assigned_ship_name ? ` · Ship: ${job.assigned_ship_name}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--t2)', fontSize: 10 }}>
                      <div>Reward: <span style={{ color: 'var(--t0)' }}>{formatAuec(job.reward_aUEC)}</span></div>
                      <div>Collateral: <span style={{ color: 'var(--t0)' }}>{formatAuec(job.collateral_aUEC)}</span></div>
                      <div>Value: <span style={{ color: 'var(--t0)' }}>{job.manifestValue > 0 ? formatCompactAuec(job.manifestValue) : 'Ad hoc'}</span></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150 }}>
                      {job.status === 'CLAIMED' && isCourier ? <button type="button" className="nexus-btn" onClick={() => handleJobUpdate(job, { status: 'IN_TRANSIT' })} disabled={busy || !capabilities.manifestWrites}>Launch</button> : null}
                      {job.status === 'IN_TRANSIT' && isCourier ? <button type="button" className="nexus-btn" onClick={() => handleJobUpdate(job, { status: 'DELIVERED', delivered_at: new Date().toISOString() })} disabled={busy || !capabilities.manifestWrites}>Mark Delivered</button> : null}
                      {job.status === 'DELIVERED' && isIssuer && !job.confirmed_at ? <button type="button" className="nexus-btn" onClick={() => handleJobUpdate(job, { confirmed_at: new Date().toISOString() })} disabled={busy || !capabilities.manifestWrites}>Confirm Delivery</button> : null}
                      {['CLAIMED', 'IN_TRANSIT'].includes(job.status) && (isIssuer || isCourier) ? <button type="button" className="nexus-btn" onClick={() => handleJobUpdate(job, { status: 'FAILED', failed_at: new Date().toISOString() })} disabled={busy || !capabilities.manifestWrites}>Fail Job</button> : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'consignment' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nexus-section-header">CONSIGNMENT</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Track member goods held for sale, commission rate, and payout state.</div>
          </div>

          <div className="nexus-card-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>New Consignment</div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                {capabilities.consignmentWrites
                  ? 'Goods entries use the same manifest format as cargo jobs.'
                  : 'Consignment history remains visible, but new postings are disabled in this deployment.'}
              </div>
            </div>
            <button type="button" onClick={() => setShowConsignmentForm((current) => !current)} className="nexus-btn primary" style={{ padding: '7px 12px' }} disabled={!capabilities.consignmentWrites}>
              <Plus size={12} />
              New Consignment
            </button>
          </div>

          {showConsignmentForm ? (
            <form onSubmit={handleCreateConsignment} className="nexus-card-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>ASKING PRICE</label>
                <input className="nexus-input" type="number" min="0" value={consignmentForm.asking_price_aUEC} onChange={(event) => setConsignmentForm((current) => ({ ...current, asking_price_aUEC: event.target.value }))} placeholder="240000" required disabled={!capabilities.consignmentWrites} />
              </div>
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>COMMISSION %</label>
                <input className="nexus-input" type="number" min="0" max="100" value={consignmentForm.commission_rate} onChange={(event) => setConsignmentForm((current) => ({ ...current, commission_rate: event.target.value }))} disabled={!capabilities.consignmentWrites} />
              </div>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>NOTES</label>
                <input className="nexus-input" value={consignmentForm.notes} onChange={(event) => setConsignmentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Fast sale preferred" disabled={!capabilities.consignmentWrites} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6, display: 'block', letterSpacing: '0.08em' }}>GOODS</label>
                <textarea className="nexus-input" value={consignmentForm.goods_text} onChange={(event) => setConsignmentForm((current) => ({ ...current, goods_text: event.target.value }))} placeholder={'Agricium: 24\nTitanium: 18'} style={{ minHeight: 88, resize: 'vertical', whiteSpace: 'pre-wrap' }} required disabled={!capabilities.consignmentWrites} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="nexus-btn" onClick={() => setShowConsignmentForm(false)}>Cancel</button>
                <button type="submit" className="nexus-btn primary" disabled={busy || !capabilities.consignmentWrites}>{busy ? 'Posting...' : 'Post Consignment'}</button>
              </div>
            </form>
          ) : null}

          <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {consignments.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No consignments posted"
                detail={capabilities.consignmentWrites ? 'Create a consignment to start seller payout and commission workflows.' : 'Consignment history is readable, but posting and settlement are disabled in this deployment.'}
                action={capabilities.consignmentWrites}
                actionLabel="Post Consignment"
                actionOnClick={() => setShowConsignmentForm(true)}
              />
            ) : (
              consignments
                .slice()
                .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
                .map((consignment) => {
                  const payout = Math.round((Number(consignment.proceeds_aUEC || consignment.asking_price_aUEC || 0) || 0) * (1 - ((Number(consignment.commission_rate) || 0) / 100)));
                  return (
                    <div key={consignment.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr) auto', gap: 12, padding: '12px 0', borderTop: '0.5px solid var(--b0)', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{consignment.consignor_callsign || viewerCallsign}</div>
                          <StatusPill status={consignment.status} />
                        </div>
                        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{summarizeManifest(consignment.goods)}</div>
                        <div style={{ color: 'var(--t2)', fontSize: 10 }}>{consignment.notes || 'No special sale notes.'}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--t2)', fontSize: 10 }}>
                        <div>Ask: <span style={{ color: 'var(--t0)' }}>{formatAuec(consignment.asking_price_aUEC)}</span></div>
                        <div>Commission: <span style={{ color: 'var(--t0)' }}>{Number(consignment.commission_rate) || 0}%</span></div>
                        <div>Payout: <span style={{ color: 'var(--t0)' }}>{formatCompactAuec(payout)}</span></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150 }}>
                        {consignment.status === 'PENDING' ? <button type="button" className="nexus-btn" onClick={() => handleConsignmentUpdate(consignment, { status: 'LISTED' })} disabled={busy || !capabilities.consignmentWrites}>List For Sale</button> : null}
                        {consignment.status === 'LISTED' ? <button type="button" className="nexus-btn" onClick={() => handleConsignmentUpdate(consignment, { status: 'SOLD', proceeds_aUEC: Number(consignment.asking_price_aUEC) || 0, settled_at: new Date().toISOString() })} disabled={busy || !capabilities.consignmentWrites}>Mark Sold</button> : null}
                        {['PENDING', 'LISTED'].includes(consignment.status) ? <button type="button" className="nexus-btn" onClick={() => handleConsignmentUpdate(consignment, { status: 'RETURNED' })} disabled={busy || !capabilities.consignmentWrites}>Return Goods</button> : null}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'dispatch' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nexus-section-header">DISPATCH</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Match active cargo work with available org haulers and persist ship assignment into the job record.</div>
          </div>

          <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeJobs.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No jobs waiting for dispatch" detail="Claim a cargo job first, then assign an available ship from the org fleet." />
            ) : (
              activeJobs.map((job) => {
                const matchingShips = availableShips
                  .filter((ship) => Number(ship.cargo_scu || 0) >= Math.max(1, job.manifestScu))
                  .slice(0, 3);
                return (
                  <div key={job.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, padding: '12px 0', borderTop: '0.5px solid var(--b0)', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{job.title || 'Untitled cargo job'}</div>
                        <StatusPill status={job.status} />
                      </div>
                      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{summarizeManifest(job.manifestItems)}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 10 }}>{job.pickup_location} → {job.delivery_location}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 10 }}>Assigned ship: <span style={{ color: 'var(--t0)' }}>{job.assigned_ship_name || 'None yet'}</span></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {matchingShips.length === 0 ? (
                        <div style={{ color: 'var(--warn)', fontSize: 10, lineHeight: 1.6 }}>No available hauler currently matches this manifest size. Open Org Fleet to review capacity or maintenance state.</div>
                      ) : (
                        matchingShips.map((ship) => (
                          <div key={ship.id} className="nexus-card-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{ship.name}</div>
                              <div style={{ color: 'var(--t2)', fontSize: 10 }}>{ship.model} · {Number(ship.cargo_scu || 0)} SCU</div>
                            </div>
                            <button type="button" className="nexus-btn" onClick={() => handleJobUpdate(job, { assigned_ship_id: ship.id, assigned_ship_name: ship.name })} disabled={busy || !capabilities.dispatchWrites}>Assign</button>
                          </div>
                        ))
                      )}
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
