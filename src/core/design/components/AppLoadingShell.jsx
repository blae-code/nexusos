import React from 'react';
import MFDPanel from './MFDPanel';

function SkeletonLine({ width, height = 10 }) {
  return (
    <div
      className="nexus-skeleton"
      style={{
        width,
        height,
        borderRadius: 3,
      }}
    />
  );
}

function SkeletonPanel({ label }) {
  return (
    <MFDPanel label={label}>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonLine width="32%" height={11} />
        <SkeletonLine width="68%" height={22} />
        <SkeletonLine width="84%" />
        <SkeletonLine width="76%" />
        <SkeletonLine width="58%" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 4 }}>
          <SkeletonLine width="100%" height={44} />
          <SkeletonLine width="100%" height={44} />
          <SkeletonLine width="100%" height={44} />
        </div>
      </div>
    </MFDPanel>
  );
}

export default function AppLoadingShell() {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
      }}
      data-loading="true"
    >
      <SkeletonPanel label="Primary Feed" />
      <SkeletonPanel label="Operational State" />
      <SkeletonPanel label="Support Data" />
    </div>
  );
}
