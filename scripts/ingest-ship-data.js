import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'src', 'apps', 'armory', 'data');

const SOURCES = {
  ships: 'https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master/ships.json',
  components: 'https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master/ship-items.json',
  fpsGear: 'https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master/fps-items.json',
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlaceholderName(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return !normalized || normalized === '<= placeholder =>';
}

function titleCaseFromIdentifier(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function pickDisplayName(...candidates) {
  for (const candidate of candidates) {
    if (candidate && !isPlaceholderName(candidate)) {
      return normalizeWhitespace(candidate);
    }
  }

  for (const candidate of candidates) {
    if (candidate) {
      return titleCaseFromIdentifier(candidate);
    }
  }

  return '';
}

function getNumericValue(...candidates) {
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function flattenNumericStats(source, prefix = '', target = {}) {
  if (Array.isArray(source)) {
    source.forEach((value, index) => {
      if (isFiniteNumber(value)) {
        target[`${prefix}${index}`] = value;
      } else if (isPlainObject(value) || Array.isArray(value)) {
        flattenNumericStats(value, `${prefix}${index}.`, target);
      }
    });
    return target;
  }

  if (!isPlainObject(source)) {
    return target;
  }

  Object.entries(source).forEach(([key, value]) => {
    if (isFiniteNumber(value)) {
      target[`${prefix}${key}`] = value;
      return;
    }

    if (isPlainObject(value) || Array.isArray(value)) {
      flattenNumericStats(value, `${prefix}${key}.`, target);
    }
  });

  return target;
}

function extractHardpoints(loadout, collector = []) {
  if (!Array.isArray(loadout)) {
    return collector;
  }

  loadout.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      return;
    }

    const hardpointId = entry.UUID || entry.HardpointName || entry.PortName || `hardpoint-${collector.length + index}`;
    const itemTypes = Array.isArray(entry.ItemTypes) ? entry.ItemTypes : [];
    const primaryType = itemTypes[0]?.SubType || itemTypes[0]?.Type || entry.Type || null;
    const size = getNumericValue(entry.MaxSize, entry.Size, entry.size, entry.MinSize);
    const positionLabel = pickDisplayName(
      entry.Position,
      entry.DisplayName,
      entry.HardpointName,
      entry.PortName,
    );

    if (primaryType || size !== null || positionLabel) {
      collector.push({
        id: String(hardpointId),
        type: primaryType ? String(primaryType) : 'UNKNOWN',
        size: size ?? 0,
        position_label: positionLabel || 'UNSPECIFIED',
      });
    }

    if (Array.isArray(entry.Loadout)) {
      extractHardpoints(entry.Loadout, collector);
    }

    if (Array.isArray(entry.Ports)) {
      extractHardpoints(entry.Ports, collector);
    }
  });

  return collector;
}

function normalizeShipRecord(ship) {
  const id = ship.UUID || ship.ClassName;
  const name = pickDisplayName(ship.Name, ship.ClassName);
  const manufacturer = pickDisplayName(ship.Manufacturer?.Name, ship.ManufacturerName, 'Unknown Manufacturer');
  const role = pickDisplayName(ship.Role, ship.Career, ship.IsSpaceship ? 'GENERAL' : 'GROUND');
  const crew = getNumericValue(ship.Crew, ship.Seats, ship.SeatCount);
  const hardpoints = extractHardpoints(ship.Loadout || ship.Ports || []);

  return {
    id: String(id || ''),
    name,
    manufacturer,
    role,
    crew_min: crew ?? 0,
    crew_max: crew ?? 0,
    cargo_scu: getNumericValue(ship.Cargo, ship.CargoSCU, ship.CargoScu, ship.Inventory?.Cargo),
    mass: getNumericValue(ship.MassTotal, ship.MassLoadout, ship.Mass, ship.Physics?.Mass),
    length: getNumericValue(ship.Length),
    hardpoints,
  };
}

function normalizeComponentRecord(component) {
  const stdItem = component.stdItem || {};
  return {
    id: String(component.reference || stdItem.UUID || component.className || ''),
    name: pickDisplayName(component.name, stdItem.Name, component.itemName, component.className),
    type: pickDisplayName(component.type, stdItem.Type, component.classification, 'UNKNOWN'),
    size: getNumericValue(component.size, stdItem.Size) ?? 0,
    grade: String(component.grade ?? stdItem.Grade ?? '0'),
    manufacturer: pickDisplayName(component.manufacturer, stdItem.Manufacturer?.Name, 'Unknown Manufacturer'),
    stats: flattenNumericStats({ ...component, stdItem }),
  };
}

function normalizeFpsGearRecord(item) {
  const stdItem = item.stdItem || {};
  return {
    id: String(item.reference || stdItem.UUID || item.className || ''),
    name: pickDisplayName(item.name, stdItem.Name, item.itemName, item.className),
    slot_type: pickDisplayName(item.type, item.subType, stdItem.Type, item.classification, 'UNKNOWN'),
    manufacturer: pickDisplayName(item.manufacturer, stdItem.Manufacturer?.Name, 'Unknown Manufacturer'),
    stats: flattenNumericStats({ ...item, stdItem }),
  };
}

function validateShipRecord(record) {
  return Boolean(
    record.id
    && record.name
    && record.manufacturer
    && record.role
    && typeof record.crew_min === 'number'
    && typeof record.crew_max === 'number'
    && Array.isArray(record.hardpoints)
    && record.hardpoints.every((hardpoint) =>
      hardpoint
      && hardpoint.id
      && hardpoint.type
      && typeof hardpoint.size === 'number'
      && hardpoint.position_label),
  );
}

function validateComponentRecord(record) {
  return Boolean(
    record.id
    && record.name
    && record.type
    && typeof record.size === 'number'
    && record.grade
    && record.manufacturer
    && isPlainObject(record.stats)
    && Object.keys(record.stats).length > 0,
  );
}

function validateFpsGearRecord(record) {
  return Boolean(
    record.id
    && record.name
    && record.slot_type
    && record.manufacturer
    && isPlainObject(record.stats)
    && Object.keys(record.stats).length > 0,
  );
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'NexusOS Armory Ingest/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

async function writeJson(fileName, data) {
  const outputPath = path.join(outputDir, fileName);
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const [shipsSource, componentsSource, fpsSource] = await Promise.all([
    fetchJson(SOURCES.ships),
    fetchJson(SOURCES.components),
    fetchJson(SOURCES.fpsGear),
  ]);

  const ships = (Array.isArray(shipsSource) ? shipsSource : [])
    .map(normalizeShipRecord)
    .filter(validateShipRecord)
    .sort((left, right) => left.name.localeCompare(right.name));

  const components = (Array.isArray(componentsSource) ? componentsSource : [])
    .map(normalizeComponentRecord)
    .filter(validateComponentRecord)
    .sort((left, right) => left.name.localeCompare(right.name));

  const fpsGear = (Array.isArray(fpsSource) ? fpsSource : [])
    .map(normalizeFpsGearRecord)
    .filter(validateFpsGearRecord)
    .sort((left, right) => left.name.localeCompare(right.name));

  await Promise.all([
    writeJson('ships.json', ships),
    writeJson('components.json', components),
    writeJson('fps-gear.json', fpsGear),
  ]);

  console.log(`Ingested ${ships.length} ships`);
  console.log(`Ingested ${components.length} components`);
  console.log(`Ingested ${fpsGear.length} FPS gear items`);
}

main().catch((error) => {
  console.error('[armory:ingest] failed:', error.message);
  process.exitCode = 1;
});
