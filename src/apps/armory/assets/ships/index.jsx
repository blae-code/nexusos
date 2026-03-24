import React from 'react';

export const SHIP_LIBRARY = {
  prospector: {
    label: 'MISC Prospector',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 22L116 32L122 54L118 86L128 120L122 154L108 176H92L78 154L72 120L82 88L78 54L84 32Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 22V176' },
      { kind: 'path', className: 'ship-detail', d: 'M82 56L52 64L46 86L56 102L80 94' },
      { kind: 'path', className: 'ship-detail', d: 'M118 56L148 64L154 86L144 102L120 94' },
      { kind: 'path', className: 'ship-detail', d: 'M88 118H112' },
    ],
    hardpoints: [
      { id: 'mining-arm-left', type: 'mining-arm', cx: 52, cy: 82 },
      { id: 'mining-arm-right', type: 'mining-arm', cx: 148, cy: 82 },
      { id: 'scanner-top', type: 'utility', cx: 100, cy: 44 },
    ],
  },
  mole: {
    label: 'Argo MOLE',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 20L126 28L146 52L158 90L152 130L130 162L100 176L70 162L48 130L42 90L54 52L74 28Z' },
      { kind: 'path', className: 'ship-detail', d: 'M92 34H108L112 56H88Z' },
      { kind: 'path', className: 'ship-detail', d: 'M58 74L34 86V110L58 122' },
      { kind: 'path', className: 'ship-detail', d: 'M142 74L166 86V110L142 122' },
      { kind: 'path', className: 'ship-detail', d: 'M100 20V176' },
      { kind: 'path', className: 'ship-detail', d: 'M74 134H126' },
    ],
    hardpoints: [
      { id: 'mining-turret-center', type: 'mining-turret', cx: 100, cy: 50 },
      { id: 'mining-turret-port', type: 'mining-turret', cx: 54, cy: 98 },
      { id: 'mining-turret-starboard', type: 'mining-turret', cx: 146, cy: 98 },
    ],
  },
  caterpillar: {
    label: 'Drake Caterpillar',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M98 18L110 28L112 168L102 182H94L86 168L88 28Z' },
      { kind: 'path', className: 'ship-detail', d: 'M112 24L138 32L134 48L112 46' },
      { kind: 'rect', className: 'ship-detail', x: 58, y: 46, width: 24, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 58, y: 76, width: 24, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 58, y: 106, width: 24, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 58, y: 136, width: 24, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 118, y: 46, width: 24, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 118, y: 76, width: 24, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 118, y: 106, width: 24, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 118, y: 136, width: 24, height: 24, rx: 2 },
      { kind: 'path', className: 'ship-detail', d: 'M100 18V182' },
    ],
    hardpoints: [
      { id: 'turret-fore', type: 'turret', cx: 100, cy: 54 },
      { id: 'turret-mid', type: 'turret', cx: 100, cy: 98 },
      { id: 'turret-aft', type: 'turret', cx: 100, cy: 144 },
    ],
  },
  c2Hercules: {
    label: 'Crusader C2 Hercules',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 18L122 28L150 44L168 78L160 156L130 178H70L40 156L32 78L50 44L78 28Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 18V178' },
      { kind: 'path', className: 'ship-detail', d: 'M72 46H128' },
      { kind: 'path', className: 'ship-detail', d: 'M58 78H142' },
      { kind: 'path', className: 'ship-detail', d: 'M52 148H148' },
      { kind: 'path', className: 'ship-detail', d: 'M72 162H128' },
    ],
    hardpoints: [
      { id: 'turret-nose', type: 'turret', cx: 100, cy: 46 },
      { id: 'turret-dorsal', type: 'turret', cx: 100, cy: 94 },
      { id: 'turret-ventral', type: 'turret', cx: 100, cy: 132 },
    ],
  },
  hullC: {
    label: 'MISC Hull C',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 16L106 24L108 176L100 184L92 176L94 24Z' },
      { kind: 'rect', className: 'ship-detail', x: 38, y: 52, width: 34, height: 20, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 128, y: 52, width: 34, height: 20, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 30, y: 90, width: 42, height: 20, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 128, y: 90, width: 42, height: 20, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 38, y: 128, width: 34, height: 20, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 128, y: 128, width: 34, height: 20, rx: 2 },
      { kind: 'path', className: 'ship-detail', d: 'M72 62H128' },
      { kind: 'path', className: 'ship-detail', d: 'M72 100H128' },
      { kind: 'path', className: 'ship-detail', d: 'M72 138H128' },
    ],
    hardpoints: [
      { id: 'turret-fore', type: 'turret', cx: 100, cy: 40 },
      { id: 'turret-port', type: 'turret', cx: 66, cy: 100 },
      { id: 'turret-starboard', type: 'turret', cx: 134, cy: 100 },
      { id: 'turret-aft', type: 'turret', cx: 100, cy: 158 },
    ],
  },
  arrow: {
    label: 'Anvil Arrow',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 22L116 40L156 68L132 86L126 150L110 176H90L74 150L68 86L44 68L84 40Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 22V176' },
      { kind: 'path', className: 'ship-detail', d: 'M84 40L100 62L116 40' },
      { kind: 'path', className: 'ship-detail', d: 'M76 128H124' },
    ],
    hardpoints: [
      { id: 'weapon-wing-left', type: 'weapon', cx: 72, cy: 84 },
      { id: 'weapon-wing-right', type: 'weapon', cx: 128, cy: 84 },
      { id: 'weapon-nose', type: 'weapon', cx: 100, cy: 52 },
    ],
  },
  gladius: {
    label: 'Aegis Gladius',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 18L118 34L154 70L132 90L138 146L118 176H82L62 146L68 90L46 70L82 34Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 18V176' },
      { kind: 'path', className: 'ship-detail', d: 'M82 34L100 54L118 34' },
      { kind: 'path', className: 'ship-detail', d: 'M72 132H128' },
    ],
    hardpoints: [
      { id: 'weapon-wing-left', type: 'weapon', cx: 74, cy: 88 },
      { id: 'weapon-wing-right', type: 'weapon', cx: 126, cy: 88 },
      { id: 'weapon-nose', type: 'weapon', cx: 100, cy: 48 },
    ],
  },
  cutlassBlack: {
    label: 'Drake Cutlass Black',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 22L118 34L132 64L164 78L154 118L144 164L118 182H82L56 164L46 118L36 78L68 64L82 34Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 22V182' },
      { kind: 'path', className: 'ship-detail', d: 'M72 62H128' },
      { kind: 'path', className: 'ship-detail', d: 'M60 118H140' },
      { kind: 'rect', className: 'ship-detail', x: 52, y: 144, width: 20, height: 24, rx: 2 },
      { kind: 'rect', className: 'ship-detail', x: 128, y: 144, width: 20, height: 24, rx: 2 },
    ],
    hardpoints: [
      { id: 'weapon-pilot-left', type: 'weapon', cx: 72, cy: 88 },
      { id: 'weapon-pilot-right', type: 'weapon', cx: 128, cy: 88 },
      { id: 'turret-dorsal', type: 'turret', cx: 100, cy: 110 },
      { id: 'missile-rack-left', type: 'missile', cx: 52, cy: 96 },
      { id: 'missile-rack-right', type: 'missile', cx: 148, cy: 96 },
    ],
  },
  carrack: {
    label: 'Anvil Carrack',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 16L124 26L152 46L166 80L160 156L132 178H68L40 156L34 80L48 46L76 26Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 16V178' },
      { kind: 'path', className: 'ship-detail', d: 'M54 78H146' },
      { kind: 'path', className: 'ship-detail', d: 'M58 116H142' },
      { kind: 'path', className: 'ship-detail', d: 'M70 154H130' },
      { kind: 'path', className: 'ship-detail', d: 'M56 62L40 82L56 104' },
      { kind: 'path', className: 'ship-detail', d: 'M144 62L160 82L144 104' },
    ],
    hardpoints: [
      { id: 'turret-fore', type: 'turret', cx: 100, cy: 50 },
      { id: 'turret-port', type: 'turret', cx: 60, cy: 94 },
      { id: 'turret-starboard', type: 'turret', cx: 140, cy: 94 },
      { id: 'turret-aft', type: 'turret', cx: 100, cy: 148 },
      { id: 'sensor-array', type: 'sensor', cx: 100, cy: 72 },
    ],
  },
  pisces: {
    label: 'Anvil C8 Pisces',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 24L118 36L136 60L140 96L130 140L112 170H88L70 140L60 96L64 60L82 36Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 24V170' },
      { kind: 'path', className: 'ship-detail', d: 'M80 64H120' },
      { kind: 'path', className: 'ship-detail', d: 'M74 118H126' },
    ],
    hardpoints: [
      { id: 'weapon-left', type: 'weapon', cx: 78, cy: 84 },
      { id: 'weapon-right', type: 'weapon', cx: 122, cy: 84 },
      { id: 'mount-nose', type: 'utility', cx: 100, cy: 56 },
    ],
  },
  razor: {
    label: 'Mirai Razor',
    elements: [
      { kind: 'path', className: 'ship-frame', d: 'M100 14L108 24L116 56L120 118L114 170L100 186L86 170L80 118L84 56L92 24Z' },
      { kind: 'path', className: 'ship-detail', d: 'M100 14V186' },
      { kind: 'path', className: 'ship-detail', d: 'M86 82L62 96L86 110' },
      { kind: 'path', className: 'ship-detail', d: 'M114 82L138 96L114 110' },
      { kind: 'path', className: 'ship-detail', d: 'M90 140H110' },
    ],
    hardpoints: [
      { id: 'mount-left', type: 'weapon', cx: 78, cy: 96 },
      { id: 'mount-right', type: 'weapon', cx: 122, cy: 96 },
      { id: 'sensor-nose', type: 'sensor', cx: 100, cy: 44 },
    ],
  },
};

function renderElement(element, index) {
  const commonProps = {
    key: `${element.kind}-${index}`,
    className: element.className,
    vectorEffect: 'non-scaling-stroke',
  };

  if (element.kind === 'path') {
    return <path {...commonProps} d={element.d} />;
  }

  if (element.kind === 'rect') {
    return (
      <rect
        {...commonProps}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={element.rx}
      />
    );
  }

  return null;
}

function ShipSilhouette({ ship, size = 120, colour = 'currentColor', showHardpoints = false, onHardpointClick }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      style={{ color: colour, display: 'block' }}
      aria-label={ship.label}
      role="img"
    >
      <style>
        {`
          .ship-frame,
          .ship-detail,
          .ship-hardpoint {
            fill: none;
            stroke: currentColor;
            stroke-linecap: round;
            stroke-linejoin: round;
            vector-effect: non-scaling-stroke;
          }
          .ship-frame {
            stroke-width: 1;
          }
          .ship-detail {
            stroke-width: 0.75;
            opacity: 0.9;
          }
          .ship-hardpoint {
            stroke-width: 0.85;
            opacity: 0.82;
            transition: stroke-width 160ms ease, opacity 160ms ease;
          }
          .ship-hardpoint:hover {
            stroke-width: 1.4;
            opacity: 1;
          }
        `}
      </style>
      {ship.elements.map(renderElement)}
      {ship.hardpoints.map((hardpoint) => (
        <circle
          key={hardpoint.id}
          className="ship-hardpoint"
          cx={hardpoint.cx}
          cy={hardpoint.cy}
          r={4}
          data-hardpoint-id={hardpoint.id}
          data-hardpoint-type={hardpoint.type}
          style={{
            opacity: showHardpoints ? 0.82 : 0,
            pointerEvents: showHardpoints ? 'auto' : 'none',
            cursor: onHardpointClick ? 'pointer' : 'default',
          }}
          onClick={onHardpointClick ? () => onHardpointClick(hardpoint) : undefined}
        >
          <title>{`${hardpoint.id} (${hardpoint.type})`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function Prospector(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.prospector} {...props} />;
}

export function Mole(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.mole} {...props} />;
}

export function Caterpillar(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.caterpillar} {...props} />;
}

export function C2Hercules(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.c2Hercules} {...props} />;
}

export function HullC(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.hullC} {...props} />;
}

export function Arrow(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.arrow} {...props} />;
}

export function Gladius(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.gladius} {...props} />;
}

export function CutlassBlack(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.cutlassBlack} {...props} />;
}

export function Carrack(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.carrack} {...props} />;
}

export function Pisces(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.pisces} {...props} />;
}

export function Razor(props) {
  return <ShipSilhouette ship={SHIP_LIBRARY.razor} {...props} />;
}

export const shipComponents = {
  Prospector,
  Mole,
  Caterpillar,
  C2Hercules,
  HullC,
  Arrow,
  Gladius,
  CutlassBlack,
  Carrack,
  Pisces,
  Razor,
};

export default shipComponents;
