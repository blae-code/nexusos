/**
 * SC 4.x mining & salvage reference data for signature calculations.
 */

// ── Ore database ────────────────────────────────────────────────────────────
export const ORES = [
  { name: 'Quantanium',   tier: 'S', pricePerScu: 88000, instability: 0.95, resistance: 0.85 },
  { name: 'Bexalite',     tier: 'A', pricePerScu: 44000, instability: 0.70, resistance: 0.75 },
  { name: 'Taranite',     tier: 'A', pricePerScu: 35000, instability: 0.60, resistance: 0.70 },
  { name: 'Borase',       tier: 'B', pricePerScu: 26000, instability: 0.50, resistance: 0.60 },
  { name: 'Laranite',     tier: 'B', pricePerScu: 28000, instability: 0.40, resistance: 0.55 },
  { name: 'Agricium',     tier: 'B', pricePerScu: 25000, instability: 0.35, resistance: 0.50 },
  { name: 'Hephaestanite',tier: 'C', pricePerScu: 15000, instability: 0.30, resistance: 0.45 },
  { name: 'Titanium',     tier: 'C', pricePerScu: 8800,  instability: 0.20, resistance: 0.35 },
  { name: 'Diamond',      tier: 'C', pricePerScu: 7200,  instability: 0.25, resistance: 0.40 },
  { name: 'Gold',         tier: 'C', pricePerScu: 6000,  instability: 0.15, resistance: 0.30 },
  { name: 'Copper',       tier: 'D', pricePerScu: 4800,  instability: 0.10, resistance: 0.20 },
  { name: 'Beryl',        tier: 'D', pricePerScu: 4300,  instability: 0.10, resistance: 0.25 },
  { name: 'Tungsten',     tier: 'D', pricePerScu: 3900,  instability: 0.12, resistance: 0.30 },
  { name: 'Corundum',     tier: 'D', pricePerScu: 2600,  instability: 0.08, resistance: 0.15 },
  { name: 'Quartz',       tier: 'E', pricePerScu: 1500,  instability: 0.05, resistance: 0.10 },
  { name: 'Aluminium',    tier: 'E', pricePerScu: 1200,  instability: 0.05, resistance: 0.08 },
  { name: 'Inert Material',tier:'F', pricePerScu: 1,     instability: 0.02, resistance: 0.05 },
];

export const ORE_MAP = Object.fromEntries(ORES.map(o => [o.name, o]));

// ── Salvage materials ───────────────────────────────────────────────────────
export const SALVAGE_MATERIALS = [
  { name: 'RMC', pricePerScu: 1580, description: 'Recycled Material Composite' },
  { name: 'CMR', pricePerScu: 3200, description: 'Composite Metal Raw' },
  { name: 'CMP', pricePerScu: 2900, description: 'Composite Metal Processed' },
  { name: 'CMS', pricePerScu: 2700, description: 'Composite Metal Salvage' },
  { name: 'Hull Scrap', pricePerScu: 450, description: 'Basic hull fragments' },
];

// ── Signature brackets ──────────────────────────────────────────────────────
export const MINING_BRACKETS = [
  { label: 'Gem (Hand)',   minSig: 0,     maxSig: 500,   scuRange: [0.1, 0.5] },
  { label: 'Small',        minSig: 500,   maxSig: 2000,  scuRange: [0.5, 4] },
  { label: 'Medium',       minSig: 2000,  maxSig: 5000,  scuRange: [4, 16] },
  { label: 'Large',        minSig: 5000,  maxSig: 10000, scuRange: [16, 32] },
  { label: 'Very Large',   minSig: 10000, maxSig: 20000, scuRange: [32, 64] },
  { label: 'Cluster',      minSig: 20000, maxSig: 999999,scuRange: [64, 256] },
];

export const SALVAGE_BRACKETS = [
  { label: 'Light Wreck',   minSig: 0,     maxSig: 3000,  scuRange: [2, 10] },
  { label: 'Medium Wreck',  minSig: 3000,  maxSig: 8000,  scuRange: [10, 40] },
  { label: 'Heavy Wreck',   minSig: 8000,  maxSig: 15000, scuRange: [40, 100] },
  { label: 'Capital Wreck',  minSig: 15000, maxSig: 999999,scuRange: [100, 400] },
];

// ── Refinery methods ────────────────────────────────────────────────────────
export const REFINERY_METHODS = [
  { name: 'Dinyx Solvation',          yieldPct: 0.91, timeMult: 1.0 },
  { name: 'Ferron Exchange',          yieldPct: 0.86, timeMult: 0.75 },
  { name: 'Pyrometric Chromalysis',   yieldPct: 0.82, timeMult: 0.5 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
export function getBracket(sig, mode) {
  const brackets = mode === 'salvage' ? SALVAGE_BRACKETS : MINING_BRACKETS;
  return brackets.find(b => sig >= b.minSig && sig < b.maxSig) || brackets[brackets.length - 1];
}

export function estimateScu(sig, bracket) {
  if (!bracket) return 0;
  const range = bracket.maxSig - bracket.minSig;
  const pos = range > 0 ? (sig - bracket.minSig) / range : 0.5;
  return bracket.scuRange[0] + pos * (bracket.scuRange[1] - bracket.scuRange[0]);
}