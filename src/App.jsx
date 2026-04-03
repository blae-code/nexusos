import { Toaster } from "@/core/design/toaster";
import NexusToastContainer from '@/components/NexusToast';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { queryClientInstance } from '@/core/data/query-client';
import { getAppBasePath } from '@/core/data/app-base-path';
import { SessionProvider } from '@/core/data/SessionContext';
import NexusShell from '@/core/shell/NexusShell';
import AccessGate from '@/pages/AccessGate';
import Onboarding from '@/pages/Onboarding';
import IndustryHub from '@/apps/industry-hub/IndustryHub';
import BootScreen from '@/pages/BootScreen';
import Setup from '@/pages/Setup';
import MarketHub from '@/apps/market-hub/MarketHub';
import RouteErrorBoundary from '@/components/RouteErrorBoundary';
import FutureFeaturePage from '@/pages/FutureFeaturePage';

function withRouteBoundary(element, compact = false) {
  return <RouteErrorBoundary compact={compact}>{element}</RouteErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <SessionProvider>
        <Router basename={getAppBasePath()}>
          <Routes>
            <Route path="/" element={withRouteBoundary(<AccessGate />)} />
            <Route path="/gate" element={withRouteBoundary(<AccessGate />)} />
            <Route path="/boot" element={withRouteBoundary(<BootScreen />)} />
            <Route path="/setup" element={withRouteBoundary(<Setup />)} />
            <Route path="/training" element={<Navigate to="/app/training" replace />} />
            <Route path="/onboarding" element={withRouteBoundary(<Onboarding />)} />
            <Route path="/AccessGate" element={<Navigate to="/gate" replace />} />

            <Route path="/app" element={withRouteBoundary(<NexusShell />)}>
              <Route index element={<Navigate to="/app/industry" replace />} />

              {/* Industry Hub — single entry point for all industry */}
              <Route path="industry" element={withRouteBoundary(<IndustryHub />, true)} />
              {/* Redirects for old standalone industry routes */}
              <Route path="industry/ledger" element={<Navigate to="/app/industry?tab=materials" replace />} />
              <Route path="industry/commerce" element={<Navigate to="/app/industry?tab=commerce" replace />} />
              <Route path="industry/coffer" element={<Navigate to="/app/industry?tab=coffer" replace />} />
              <Route path="industry/logistics" element={<Navigate to="/app/industry?tab=logistics" replace />} />
              <Route path="industry/cargo" element={<Navigate to="/app/industry?tab=cargo" replace />} />
              <Route path="industry/profit" element={<Navigate to="/app/industry?tab=commerce" replace />} />

              {/* Redirect old command route into the active release surface */}
              <Route path="command" element={<Navigate to="/app/industry" replace />} />

              <Route path="armory/inventory" element={<Navigate to="/app/industry?tab=inventory&inventoryScope=org&inventoryView=gear" replace />} />
              <Route path="armory/assets" element={<Navigate to="/app/industry?tab=inventory&inventoryScope=org&inventoryView=assets" replace />} />

              <Route path="market" element={withRouteBoundary(<MarketHub />, true)} />
              <Route path="market/legacy" element={<Navigate to="/app/market" replace />} />

              <Route path="armory/org-fleet" element={<Navigate to="/app/armory/fleet" replace />} />
              <Route path="armory/readiness" element={<Navigate to="/app/armory/fleet?tab=readiness" replace />} />
              <Route path="armory/schedule" element={<Navigate to="/app/armory/fleet?tab=crew" replace />} />

              <Route path="ops/*" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="scout/*" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="armory/*" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="roster/*" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="handbook" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="training" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="settings" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="profile" element={withRouteBoundary(<FutureFeaturePage />, true)} />
              <Route path="keys" element={<Navigate to="/app/admin/keys" replace />} />
              <Route path="admin/*" element={withRouteBoundary(<FutureFeaturePage />, true)} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SessionProvider>
      <Toaster />
      <NexusToastContainer />
    </QueryClientProvider>
  );
}

export default App;
