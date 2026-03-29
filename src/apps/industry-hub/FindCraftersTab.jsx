/**
 * FindCraftersTab — search for org members who own blueprints, hold materials,
 * or have refinery orders relevant to crafting a specific item.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { listMemberDirectory } from '@/core/data/member-directory';
import { Users, Package, Scroll } from 'lucide-react';
import MaterialRequisitionDialog from '@/components/requisition/MaterialRequisitionDialog';
import CrafterResultCard from './find-crafters/CrafterResultCard';
import ItemSearchBar from './find-crafters/ItemSearchBar';

export default function FindCraftersTab({ blueprints, materials, callsign }) {
  const [members, setMembers] = useState([]);
  const [allMaterials, setAllMaterials] = useState(materials || []);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('item');
  const [bulkReqDialog, setBulkReqDialog] = useState(null); // 'item' | 'material' | 'member'

  useEffect(() => {
    (async () => {
      const [m, ro, cq, mats] = await Promise.all([
        listMemberDirectory({ sort: '-last_seen_at', limit: 500 }).catch(() => []),
        base44.entities.RefineryOrder.list('-started_at', 200).catch(() => []),
        base44.entities.CraftQueue.list('-created_date', 200).catch(() => []),
        materials?.length ? Promise.resolve(materials) : base44.entities.Material.list('-logged_at', 500).catch(() => []),
      ]);
      setMembers(m || []);
      setRefineryOrders(ro || []);
      setCraftQueue(cq || []);
      setAllMaterials(mats || []);
      setLoading(false);
    })();
  }, [materials]);

  // Build search index
  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const bps = blueprints || [];
    const mats = allMaterials || [];

    if (searchMode === 'item') {
      // Find blueprints matching the item name
      const matchingBps = bps.filter(bp =>
        bp.item_name?.toLowerCase().includes(q) ||
        bp.category?.toLowerCase().includes(q)
      );

      if (matchingBps.length === 0) return [];

      // For each matching blueprint, find members who can help
      const crafterMap = {};

      for (const bp of matchingBps) {
        // 1. Blueprint owners
        const ownerCs = (bp.owned_by_callsign || '').toUpperCase();
        if (ownerCs) {
          if (!crafterMap[ownerCs]) crafterMap[ownerCs] = { callsign: ownerCs, blueprints: [], materials: [], refinery: [], craftJobs: [] };
          crafterMap[ownerCs].blueprints.push(bp);
        }

        // 2. Members with materials needed for recipe
        if (bp.recipe_materials) {
          for (const rm of bp.recipe_materials) {
            const matName = (rm.material_name || rm.material || '').toUpperCase();
            if (!matName) continue;
            const holders = mats.filter(m =>
              !m.is_archived &&
              (m.material_name || '').toUpperCase() === matName &&
              m.quantity_scu > 0
            );
            for (const h of holders) {
              const cs = (h.custodian_callsign || h.logged_by_callsign || '').toUpperCase();
              if (!cs) continue;
              if (!crafterMap[cs]) crafterMap[cs] = { callsign: cs, blueprints: [], materials: [], refinery: [], craftJobs: [] };
              const exists = crafterMap[cs].materials.find(m => m.id === h.id);
              if (!exists) crafterMap[cs].materials.push({ ...h, needed_for: bp.item_name });
            }
          }
        }

        // 3. Members with active refinery orders for needed materials
        if (bp.recipe_materials) {
          for (const rm of bp.recipe_materials) {
            const matName = (rm.material_name || rm.material || '').toUpperCase();
            if (!matName) continue;
            const orders = refineryOrders.filter(ro =>
              ro.status !== 'COLLECTED' &&
              (ro.material_name || '').toUpperCase() === matName
            );
            for (const ro of orders) {
              const cs = (ro.submitted_by_callsign || '').toUpperCase();
              if (!cs) continue;
              if (!crafterMap[cs]) crafterMap[cs] = { callsign: cs, blueprints: [], materials: [], refinery: [], craftJobs: [] };
              const exists = crafterMap[cs].refinery.find(r => r.id === ro.id);
              if (!exists) crafterMap[cs].refinery.push({ ...ro, needed_for: bp.item_name });
            }
          }
        }

        // 4. Members with active craft queue for this blueprint
        const jobs = craftQueue.filter(cq =>
          cq.blueprint_id === bp.id && cq.status !== 'COMPLETE' && cq.status !== 'CANCELLED'
        );
        for (const job of jobs) {
          const cs = (job.claimed_by_callsign || job.requested_by_callsign || '').toUpperCase();
          if (!cs) continue;
          if (!crafterMap[cs]) crafterMap[cs] = { callsign: cs, blueprints: [], materials: [], refinery: [], craftJobs: [] };
          crafterMap[cs].craftJobs.push({ ...job, item_name: bp.item_name });
        }
      }

      return Object.values(crafterMap).sort((a, b) => {
        const scoreA = a.blueprints.length * 10 + a.materials.length * 3 + a.refinery.length * 2 + a.craftJobs.length * 5;
        const scoreB = b.blueprints.length * 10 + b.materials.length * 3 + b.refinery.length * 2 + b.craftJobs.length * 5;
        return scoreB - scoreA;
      });
    }

    if (searchMode === 'material') {
      // Find members holding a specific material
      const matchingMats = mats.filter(m =>
        !m.is_archived &&
        m.quantity_scu > 0 &&
        (m.material_name || '').toLowerCase().includes(q)
      );

      const holderMap = {};
      for (const m of matchingMats) {
        const cs = (m.custodian_callsign || m.logged_by_callsign || '').toUpperCase();
        if (!cs) continue;
        if (!holderMap[cs]) holderMap[cs] = { callsign: cs, blueprints: [], materials: [], refinery: [], craftJobs: [] };
        holderMap[cs].materials.push(m);
      }

      // Also find refinery orders producing this material
      const matchingRefinery = refineryOrders.filter(ro =>
        ro.status !== 'COLLECTED' &&
        (ro.material_name || '').toLowerCase().includes(q)
      );
      for (const ro of matchingRefinery) {
        const cs = (ro.submitted_by_callsign || '').toUpperCase();
        if (!cs) continue;
        if (!holderMap[cs]) holderMap[cs] = { callsign: cs, blueprints: [], materials: [], refinery: [], craftJobs: [] };
        holderMap[cs].refinery.push(ro);
      }

      return Object.values(holderMap).sort((a, b) =>
        (b.materials.reduce((s, m) => s + (m.quantity_scu || 0), 0)) -
        (a.materials.reduce((s, m) => s + (m.quantity_scu || 0), 0))
      );
    }

    if (searchMode === 'member') {
      // Find what a specific member can offer
      const matchingMembers = members.filter(m =>
        (m.callsign || '').toLowerCase().includes(q)
      );

      return matchingMembers.map(m => {
        const cs = (m.callsign || '').toUpperCase();
        const memberBps = bps.filter(bp => (bp.owned_by_callsign || '').toUpperCase() === cs);
        const memberMats = mats.filter(mat =>
          !mat.is_archived && mat.quantity_scu > 0 &&
          ((mat.custodian_callsign || '').toUpperCase() === cs || (mat.logged_by_callsign || '').toUpperCase() === cs)
        );
        const memberRefinery = refineryOrders.filter(ro =>
          ro.status !== 'COLLECTED' && (ro.submitted_by_callsign || '').toUpperCase() === cs
        );
        const memberJobs = craftQueue.filter(cq =>
          cq.status !== 'COMPLETE' && cq.status !== 'CANCELLED' &&
          ((cq.claimed_by_callsign || '').toUpperCase() === cs || (cq.requested_by_callsign || '').toUpperCase() === cs)
        );

        return {
          callsign: cs,
          member: m,
          blueprints: memberBps,
          materials: memberMats,
          refinery: memberRefinery,
          craftJobs: memberJobs,
        };
      }).filter(r => r.blueprints.length || r.materials.length || r.refinery.length || r.craftJobs.length);
    }

    return [];
  }, [searchQuery, searchMode, blueprints, allMaterials, refineryOrders, craftQueue, members]);

  // Unique item names for autocomplete
  const itemSuggestions = useMemo(() => {
    const names = new Set();
    for (const bp of (blueprints || [])) {
      if (bp.item_name) names.add(bp.item_name);
    }
    return [...names].sort();
  }, [blueprints]);

  const materialSuggestions = useMemo(() => {
    const names = new Set();
    for (const m of (allMaterials || [])) {
      if (m.material_name && !m.is_archived) names.add(m.material_name);
    }
    return [...names].sort();
  }, [allMaterials]);

  // Resolve member data for result cards
  const getMember = useCallback((callsign) => {
    return members.find(m => (m.callsign || '').toUpperCase() === callsign.toUpperCase());
  }, [members]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Users size={15} style={{ color: '#C0392B' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>FIND CRAFTERS</span>
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: '#5A5850', lineHeight: 1.5,
        }}>
          Search by item name to find who owns the blueprint, holds required materials, or is already refining ingredients.
          Switch modes to search by material name or member callsign.
        </div>
      </div>

      {/* Search mode tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { id: 'item', label: 'BY ITEM', icon: Scroll },
          { id: 'material', label: 'BY MATERIAL', icon: Package },
          { id: 'member', label: 'BY MEMBER', icon: Users },
        ].map(mode => (
          <button key={mode.id} onClick={() => { setSearchMode(mode.id); setSearchQuery(''); }} style={{
            padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
            background: searchMode === mode.id ? 'rgba(192,57,43,0.12)' : '#141410',
            border: `0.5px solid ${searchMode === mode.id ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
            color: searchMode === mode.id ? '#E8E4DC' : '#5A5850',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <mode.icon size={10} />
            {mode.label}
          </button>
        ))}
      </div>

      {/* Search input with suggestions */}
      <ItemSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={
          searchMode === 'item' ? 'Search item or blueprint name...' :
          searchMode === 'material' ? 'Search material name (CMR, Quantanium, etc.)...' :
          'Search member callsign...'
        }
        suggestions={
          searchMode === 'item' ? itemSuggestions :
          searchMode === 'material' ? materialSuggestions :
          members.map(m => m.callsign).filter(Boolean).sort()
        }
      />

      {/* Results */}
      {results === null ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: '#5A5850', letterSpacing: '0.08em',
        }}>
          Type a search query above to find org members who can help craft items
        </div>
      ) : results.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em',
        }}>
          NO MATCHES FOUND
        </div>
      ) : (
        <>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#9A9488', letterSpacing: '0.06em',
          }}>
            Found {results.length} member{results.length !== 1 ? 's' : ''} who can help
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(r => (
              <CrafterResultCard key={r.callsign} result={r} member={getMember(r.callsign)} currentCallsign={callsign} />
            ))}
          </div>
        </>
      )}
      {/* Bulk requisition dialog */}
      {bulkReqDialog && (
        <MaterialRequisitionDialog
          callsign={callsign}
          prefill={bulkReqDialog}
          onClose={() => setBulkReqDialog(null)}
          onCreated={() => setBulkReqDialog(null)}
        />
      )}
    </div>
  );
}
