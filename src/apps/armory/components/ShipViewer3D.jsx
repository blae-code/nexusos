import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import MFDPanel from '../../../core/design/components/MFDPanel.jsx';

const SHIP_CLASS_PROFILES = {
  MINING: 'mining',
  INDUSTRIAL: 'freighter',
  FREIGHTER: 'freighter',
  HAULER: 'freighter',
  COMBAT: 'fighter',
  ESCORT: 'fighter',
  FIGHTER: 'fighter',
  SUPPORT: 'support',
  EXPLORATION: 'support',
  COMMAND: 'support',
  RACING: 'racing',
  RACE: 'racing',
};

const TYPE_COLOR_MAP = {
  weapon: '--danger',
  shield: '--info',
  cooler: '--acc',
  power: '--warn',
  missile: '--danger',
  turret: '--live',
  mining: '--warn',
  utility: '--acc',
  sensor: '--info',
};

function getCssVar(name, fallback) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function readPalette() {
  return {
    bg0: getCssVar('--bg0', '#07080b'),
    bg2: getCssVar('--bg2', '#10121a'),
    b1: getCssVar('--b1', '#1e2130'),
    t2: getCssVar('--t2', '#4a5068'),
    t3: getCssVar('--t3', '#2a2e40'),
    acc: getCssVar('--acc', '#5a6080'),
    live: getCssVar('--live', '#27c96a'),
    warn: getCssVar('--warn', '#e8a020'),
    danger: getCssVar('--danger', '#e04848'),
    info: getCssVar('--info', '#4a8fd0'),
  };
}

function resolveShipProfile(shipClass, shipName) {
  const normalizedClass = String(shipClass || '').trim().toUpperCase();
  if (SHIP_CLASS_PROFILES[normalizedClass]) {
    return SHIP_CLASS_PROFILES[normalizedClass];
  }

  const normalizedName = String(shipName || '').toLowerCase();
  if (normalizedName.includes('prospector') || normalizedName.includes('mole')) {
    return 'mining';
  }
  if (
    normalizedName.includes('caterpillar')
    || normalizedName.includes('hercules')
    || normalizedName.includes('hull')
    || normalizedName.includes('freighter')
  ) {
    return 'freighter';
  }
  if (
    normalizedName.includes('arrow')
    || normalizedName.includes('gladius')
    || normalizedName.includes('cutlass')
    || normalizedName.includes('fighter')
  ) {
    return 'fighter';
  }
  if (normalizedName.includes('razor') || normalizedName.includes('racing')) {
    return 'racing';
  }

  return 'support';
}

function addWireframeMesh(target, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  target.add(mesh);
  return mesh;
}

function createShipHull(profile, palette) {
  const group = new THREE.Group();
  const hullMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.acc),
    transparent: true,
    opacity: 0.6,
    wireframe: true,
    metalness: 0,
    roughness: 1,
  });

  if (profile === 'mining') {
    addWireframeMesh(group, new THREE.CylinderGeometry(7.5, 9.5, 54, 10, 1, false), hullMaterial, [0, 0, 0], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.ConeGeometry(8, 18, 10, 1, false), hullMaterial, [0, 0, -34], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(9, 8, 18), hullMaterial, [0, 0, 26]);
    addWireframeMesh(group, new THREE.BoxGeometry(28, 3, 6), hullMaterial, [0, -1.5, -4]);
    addWireframeMesh(group, new THREE.BoxGeometry(5, 3, 30), hullMaterial, [-24, -1.5, -4]);
    addWireframeMesh(group, new THREE.BoxGeometry(5, 3, 30), hullMaterial, [24, -1.5, -4]);
    addWireframeMesh(group, new THREE.ConeGeometry(3.8, 12, 8, 1, false), hullMaterial, [-24, -1.5, -24], [0, 0, Math.PI / 2]);
    addWireframeMesh(group, new THREE.ConeGeometry(3.8, 12, 8, 1, false), hullMaterial, [24, -1.5, -24], [0, 0, -Math.PI / 2]);
  } else if (profile === 'freighter') {
    addWireframeMesh(group, new THREE.BoxGeometry(26, 16, 76), hullMaterial, [0, 0, 0]);
    addWireframeMesh(group, new THREE.ConeGeometry(14, 24, 10, 1, false), hullMaterial, [0, 0, -50], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(34, 12, 28), hullMaterial, [0, 0, 12]);
    addWireframeMesh(group, new THREE.BoxGeometry(44, 8, 16), hullMaterial, [0, 0, 30]);
    addWireframeMesh(group, new THREE.CylinderGeometry(5, 5, 14, 12, 1, false), hullMaterial, [-12, -2, 44], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.CylinderGeometry(5, 5, 14, 12, 1, false), hullMaterial, [12, -2, 44], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.CylinderGeometry(3.5, 3.5, 12, 10, 1, false), hullMaterial, [0, -2, 48], [Math.PI / 2, 0, 0]);
  } else if (profile === 'fighter') {
    addWireframeMesh(group, new THREE.ConeGeometry(10, 36, 10, 1, false), hullMaterial, [0, 0, -30], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.CylinderGeometry(6.5, 8, 34, 10, 1, false), hullMaterial, [0, 0, 6], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(58, 2.4, 20), hullMaterial, [0, -1, 2], [0, 0.08, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(22, 1.8, 12), hullMaterial, [0, 0.5, -16], [0, 0.18, 0]);
    addWireframeMesh(group, new THREE.ConeGeometry(4.5, 14, 10, 1, false), hullMaterial, [-10, -2, 32], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.ConeGeometry(4.5, 14, 10, 1, false), hullMaterial, [10, -2, 32], [Math.PI / 2, 0, 0]);
  } else if (profile === 'racing') {
    addWireframeMesh(group, new THREE.CylinderGeometry(4.5, 6.5, 88, 10, 1, false), hullMaterial, [0, 0, 0], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.ConeGeometry(6.5, 20, 10, 1, false), hullMaterial, [0, 0, -54], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(18, 2, 24), hullMaterial, [0, -1, -4], [0, 0.1, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(34, 1.6, 10), hullMaterial, [0, -1, 12], [0, -0.1, 0]);
    addWireframeMesh(group, new THREE.ConeGeometry(3.5, 16, 8, 1, false), hullMaterial, [0, -1, 48], [Math.PI / 2, 0, 0]);
  } else {
    addWireframeMesh(group, new THREE.BoxGeometry(24, 15, 58), hullMaterial, [0, 0, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(34, 8, 26), hullMaterial, [0, 5, -6]);
    addWireframeMesh(group, new THREE.CylinderGeometry(6, 6, 12, 12, 1, false), hullMaterial, [0, 0, -36], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.BoxGeometry(54, 2.5, 16), hullMaterial, [0, 2, 6]);
    addWireframeMesh(group, new THREE.BoxGeometry(8, 8, 8), hullMaterial, [-24, 8, -12]);
    addWireframeMesh(group, new THREE.BoxGeometry(8, 8, 8), hullMaterial, [24, 8, -12]);
    addWireframeMesh(group, new THREE.ConeGeometry(3.5, 12, 10, 1, false), hullMaterial, [-10, -2, 32], [Math.PI / 2, 0, 0]);
    addWireframeMesh(group, new THREE.ConeGeometry(3.5, 12, 10, 1, false), hullMaterial, [10, -2, 32], [Math.PI / 2, 0, 0]);
  }

  group.rotation.x = -0.28;
  return group;
}

function getHardpointColor(type, palette) {
  const token = TYPE_COLOR_MAP[String(type || '').toLowerCase()] || '--acc';
  const resolved = getCssVar(token, palette.acc);
  return new THREE.Color(resolved);
}

function getProfileFootprint(profile) {
  if (profile === 'mining') {
    return { width: 30, length: 52, height: 10 };
  }
  if (profile === 'freighter') {
    return { width: 24, length: 70, height: 12 };
  }
  if (profile === 'fighter') {
    return { width: 34, length: 46, height: 10 };
  }
  if (profile === 'racing') {
    return { width: 18, length: 72, height: 8 };
  }
  return { width: 32, length: 58, height: 14 };
}

function distributeDefaultPosition(index, total, footprint) {
  const laneCount = Math.max(1, Math.min(3, Math.ceil(total / 2)));
  const laneIndex = index % laneCount;
  const row = Math.floor(index / laneCount);
  const xPattern = laneCount === 1
    ? [0]
    : laneCount === 2
      ? [-footprint.width * 0.75, footprint.width * 0.75]
      : [-footprint.width * 0.85, 0, footprint.width * 0.85];
  const zStep = total > 1 ? (footprint.length * 1.4) / Math.max(1, total - 1) : 0;
  const z = -footprint.length * 0.7 + ((row * laneCount + laneIndex) * zStep);
  return { x: xPattern[laneIndex] ?? 0, y: 0, z };
}

function inferHardpointPosition(hardpoint, index, total, footprint) {
  const source = `${hardpoint.id || ''} ${hardpoint.position_label || ''} ${hardpoint.type || ''}`.toLowerCase();
  const base = distributeDefaultPosition(index, total, footprint);

  if (source.includes('port') || source.includes('left')) {
    base.x = -footprint.width;
  } else if (source.includes('starboard') || source.includes('right')) {
    base.x = footprint.width;
  }

  if (source.includes('nose') || source.includes('fore') || source.includes('front')) {
    base.z = -footprint.length * 0.82;
  } else if (source.includes('aft') || source.includes('rear')) {
    base.z = footprint.length * 0.82;
  } else if (source.includes('mid') || source.includes('center') || source.includes('centre')) {
    base.z = 0;
  }

  if (source.includes('dorsal') || source.includes('top') || source.includes('sensor')) {
    base.y = footprint.height * 0.55;
  } else if (source.includes('ventral') || source.includes('bottom')) {
    base.y = -footprint.height * 0.55;
  } else if (source.includes('turret')) {
    base.y = footprint.height * 0.35;
  }

  if (source.includes('missile')) {
    base.y += 1.2;
  }

  return new THREE.Vector3(base.x, base.y, base.z);
}

function formatZoomLevel(distance) {
  const normalized = Math.max(0.6, Math.min(2.8, 90 / distance));
  return `x${normalized.toFixed(1)}`;
}

export default function ShipViewer3D({
  shipClass,
  shipName,
  hardpoints = [],
  onHardpointSelect,
  height = 320,
}) {
  const mountRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState('x1.0');
  const [activeHardpointId, setActiveHardpointId] = useState(null);
  const viewerId = useMemo(() => `armory-viewer-${Math.random().toString(36).slice(2, 8)}`, []);

  useEffect(() => {
    if (!mountRef.current) {
      return undefined;
    }

    const profile = resolveShipProfile(shipClass, shipName);
    const palette = readPalette();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.bg0);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 500);
    camera.position.set(0, 34, 86);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mountRef.current.clientWidth || 1, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 48;
    controls.maxDistance = 150;
    controls.target.set(0, 0, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(new THREE.Color(palette.acc), 1.6);
    const keyLight = new THREE.DirectionalLight(new THREE.Color(palette.live), 0.45);
    keyLight.position.set(40, 56, 48);
    const rimLight = new THREE.DirectionalLight(new THREE.Color(palette.info), 0.28);
    rimLight.position.set(-36, 14, -50);
    scene.add(ambientLight, keyLight, rimLight);

    const shipGroup = new THREE.Group();
    shipGroup.add(createShipHull(profile, palette));
    scene.add(shipGroup);

    const footprint = getProfileFootprint(profile);
    const markerGeometry = new THREE.IcosahedronGeometry(1, 0);
    const hoverGlow = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.live),
        transparent: true,
        opacity: 0.42,
      }),
    );
    hoverGlow.visible = false;
    scene.add(hoverGlow);

    const scanLine = new THREE.Mesh(
      new THREE.PlaneGeometry(footprint.width * 2.7, 10),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.acc),
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    scanLine.position.set(0, 0, -footprint.length * 0.9);
    scene.add(scanLine);

    const hardpointMeshes = [];
    const hardpointMarkers = new THREE.Group();
    hardpoints.forEach((hardpoint, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: getHardpointColor(hardpoint.type, palette),
        emissive: new THREE.Color(palette.bg2),
        emissiveIntensity: 0.35,
        metalness: 0,
        roughness: 0.7,
      });

      const marker = new THREE.Mesh(markerGeometry, material);
      marker.position.copy(inferHardpointPosition(hardpoint, index, hardpoints.length, footprint));
      marker.scale.setScalar(2);
      marker.userData.hardpoint = hardpoint;
      marker.userData.baseColor = material.color.clone();
      marker.userData.type = String(hardpoint.type || '').toLowerCase();
      hardpointMarkers.add(marker);
      hardpointMeshes.push(marker);
    });
    scene.add(hardpointMarkers);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interaction = {
      dragging: false,
      hovered: null,
      selectedId: null,
    };

    function updateZoomIndicator() {
      setZoomLevel(formatZoomLevel(camera.position.distanceTo(controls.target)));
    }

    controls.addEventListener('change', updateZoomIndicator);
    controls.addEventListener('start', () => {
      interaction.dragging = true;
    });
    controls.addEventListener('end', () => {
      interaction.dragging = false;
    });
    updateZoomIndicator();

    function resizeRenderer() {
      if (!mountRef.current) {
        return;
      }

      const width = mountRef.current.clientWidth || 1;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(mountRef.current);

    function setPointerFromEvent(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function updateHoverState(mesh) {
      interaction.hovered = mesh;
      setActiveHardpointId(mesh?.userData?.hardpoint?.id || null);
      renderer.domElement.style.cursor = mesh ? 'pointer' : 'grab';
    }

    function handlePointerMove(event) {
      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const [intersection] = raycaster.intersectObjects(hardpointMeshes, false);
      updateHoverState(intersection?.object || null);
    }

    function handlePointerLeave() {
      updateHoverState(null);
    }

    function handlePointerDown() {
      renderer.domElement.style.cursor = 'grabbing';
    }

    function handlePointerUp() {
      renderer.domElement.style.cursor = interaction.hovered ? 'pointer' : 'grab';
    }

    function handleClick(event) {
      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const [intersection] = raycaster.intersectObjects(hardpointMeshes, false);
      if (!intersection) {
        return;
      }

      const hardpoint = intersection.object.userData.hardpoint;
      interaction.selectedId = hardpoint?.id || null;
      setActiveHardpointId(interaction.selectedId);
      if (onHardpointSelect) {
        onHardpointSelect(hardpoint);
      }
    }

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.style.cursor = 'grab';

    let frameId = 0;
    const clock = new THREE.Clock();

    function animate() {
      frameId = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!interaction.hovered && !interaction.dragging) {
        shipGroup.rotation.y += 0.003;
      }

      scanLine.position.z = THREE.MathUtils.lerp(
        -footprint.length * 0.9,
        footprint.length * 0.9,
        (elapsed % 4) / 4,
      );

      hardpointMeshes.forEach((mesh, index) => {
        const isHovered = mesh === interaction.hovered;
        const isSelected = mesh.userData.hardpoint?.id === interaction.selectedId;
        const isMissile = mesh.userData.type === 'missile';
        const pulse = 1 + ((Math.sin(elapsed * 5 + index) + 1) * 0.12);
        const targetScale = isHovered ? 3 : isMissile ? 2.3 * pulse : 2;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.18);

        mesh.material.emissive.set(isHovered || isSelected ? palette.live : palette.bg2);
        mesh.material.emissiveIntensity = isHovered ? 1.6 : isSelected ? 1.15 : isMissile ? 0.55 : 0.28;
      });

      if (interaction.hovered) {
        hoverGlow.visible = true;
        hoverGlow.position.copy(interaction.hovered.position);
        const glowScale = 2.7 + ((Math.sin(elapsed * 6) + 1) * 0.35);
        hoverGlow.scale.setScalar(glowScale);
        hoverGlow.material.opacity = 0.3 + ((Math.sin(elapsed * 6) + 1) * 0.08);
      } else {
        hoverGlow.visible = false;
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', updateZoomIndicator);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('click', handleClick);

      scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });

      renderer.dispose();
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [height, hardpoints, onHardpointSelect, shipClass, shipName]);

  return (
    <MFDPanel
      label="TACTICAL WIREFRAME"
      statusDot={activeHardpointId ? 'var(--live)' : 'var(--acc)'}
      action={(
        <span
          style={{
            fontSize: 9,
            color: 'var(--t3)',
            fontFamily: 'var(--font)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {resolveShipProfile(shipClass, shipName)}
        </span>
      )}
    >
      <div
        style={{
          position: 'relative',
          height,
          background: 'var(--bg0)',
          overflow: 'hidden',
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div
              style={{
                fontSize: 9,
                color: 'var(--t3)',
                fontFamily: 'var(--font)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {shipName || 'UNLISTED FRAME'}
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--t2)',
                fontFamily: 'var(--font)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {`${hardpoints.length} HPT`}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--t3)',
                fontSize: 9,
                fontFamily: 'var(--font)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5 3.5H3.5V5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11 12.5H12.5V11" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 8a4.5 4.5 0 0 1 7.68-3.18" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M12.5 8a4.5 4.5 0 0 1-7.68 3.18" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
              </svg>
              Rotate / Orbit
            </div>

            <div
              style={{
                color: 'var(--t2)',
                fontSize: 9,
                fontFamily: 'var(--font)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {`Zoom ${zoomLevel}`}
            </div>
          </div>
        </div>
      </div>
    </MFDPanel>
  );
}
