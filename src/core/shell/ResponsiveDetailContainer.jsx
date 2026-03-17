import React from 'react';

/**
 * ResponsiveDetailContainer — wraps content and detail panel
 * At Ultrawide (1920px+), creates a 2-column layout with detail panel
 * At lower breakpoints, detail panel is hidden or rendered as modal elsewhere
 */
export default function ResponsiveDetailContainer({ children, detailPanel, isUltrawide }) {
  if (isUltrawide && detailPanel) {
    return (
      <div className="detail-panel-container">
        <div style={{ overflow: 'auto', minWidth: 0 }}>
          {children}
        </div>
        {detailPanel}
      </div>
    );
  }

  return <>{children}</>;
}