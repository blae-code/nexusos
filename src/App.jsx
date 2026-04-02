import { Toaster } from "@/core/design/toaster";
import NexusToastContainer from '@/components/NexusToast';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { queryClientInstance } from '@/core/data/query-client';
import { getAppBasePath } from '@/core/data/app-base-path';
import { SessionProvider } from '@/core/data/SessionContext';
import NexusShell from '@/core/shell/NexusShell';
import LiveOp from '@/apps/ops-board/LiveOp';
import AccessGate from '@/pages/AccessGate';
import Onboarding from '@/pages/Onboarding';
import IndustryHub from '@/apps/industry-hub/IndustryHub';
import NexusSettings from '@/pages/NexusSettings';
import NexusTodo from '@/pages/NexusTodo';
import OpBoard from '@/apps/ops-board/OpBoard';
import OpsTimeline from '@/apps/ops-board/OpsTimeline';
import OpCreator from '@/apps/ops-board/OpCreatorPage';
import ScoutIntel from '@/apps/scout-intel/ScoutIntel';
import RedscarHandbook from '@/pages/RedscarHandbook';
import Armory from '@/pages/Armory';
import FleetHub from '@/pages/FleetHub';
import TrainingHub from '@/pages/TrainingHub';
import AdminSettings from '@/pages/AdminSettings';
import AdminDataConsole from '@/pages/AdminDataConsole';
import KeyManagement from '@/pages/KeyManagement';
import RescueBoard from '@/pages/RescueBoard';
import OrgRoster from '@/pages/OrgRoster';
import EpicArchive from '@/pages/EpicArchive';
import BootScreen from '@/pages/BootScreen';
import Setup from '@/pages/Setup';
import DebtTracker from '@/pages/DebtTracker';
import MarketIntelligence from '@/apps/market-intel/MarketIntelligence';
import MarketHub from '@/apps/market-hub/MarketHub';
import MemberManagement from '@/pages/MemberManagement';
import RouteErrorBoundary from '@/components/RouteErrorBoundary';
import MissionPlannerPage from '@/apps/ops-board/mission-planner/MissionPlannerPage';

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
            <Route path="/training" element={withRouteBoundary(<TrainingHub />)} />
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

              {/* Scout Intel — Deposits + Routes tabs */}
              <Route path="scout" element={withRouteBoundary(<ScoutIntel />, true)} />
              <Route path="scout/routes" element={<Navigate to="/app/scout?tab=routes" replace />} />

              {/* Ops Board — Board + Analytics tabs */}
              <Route path="ops" element={withRouteBoundary(<OpBoard />, true)} />
              <Route path="ops/timeline" element={withRouteBoundary(<OpsTimeline />, true)} />
              <Route path="ops/new" element={withRouteBoundary(<OpCreator />, true)} />
              <Route path="ops/planner" element={withRouteBoundary(<MissionPlannerPage />, true)} />
              <Route path="ops/:id" element={withRouteBoundary(<LiveOp />, true)} />
              <Route path="ops/rescue" element={withRouteBoundary(<RescueBoard />, true)} />
              <Route path="ops/archive" element={withRouteBoundary(<EpicArchive />, true)} />
              {/* Redirect old command route */}
              <Route path="command" element={<Navigate to="/app/ops?view=analytics" replace />} />

              {/* Armory + Fleet Hub */}
              <Route path="armory" element={withRouteBoundary(<Armory />, true)} />
              <Route path="armory/fleet" element={withRouteBoundary(<FleetHub />, true)} />
              <Route path="armory/inventory" element={<Navigate to="/app/industry?tab=inventory&inventoryScope=org&inventoryView=gear" replace />} />
              <Route path="armory/assets" element={<Navigate to="/app/industry?tab=inventory&inventoryScope=org&inventoryView=assets" replace />} />
              {/* Market Intelligence */}
              <Route path="market" element={withRouteBoundary(<MarketHub />, true)} />
              <Route path="market/legacy" element={withRouteBoundary(<MarketIntelligence />, true)} />

              {/* Redirects for old fleet sub-routes */}
              <Route path="armory/org-fleet" element={<Navigate to="/app/armory/fleet" replace />} />
              <Route path="armory/readiness" element={<Navigate to="/app/armory/fleet?tab=readiness" replace />} />
              <Route path="armory/schedule" element={<Navigate to="/app/armory/fleet?tab=crew" replace />} />

              {/* Org */}
              <Route path="roster" element={withRouteBoundary(<OrgRoster />, true)} />
              <Route path="roster/manage" element={withRouteBoundary(<MemberManagement />, true)} />
              <Route path="roster/debts" element={withRouteBoundary(<DebtTracker />, true)} />
              <Route path="handbook" element={withRouteBoundary(<RedscarHandbook />, true)} />
              <Route path="training" element={withRouteBoundary(<TrainingHub />, true)} />

              {/* Settings — single entry point */}
              <Route path="settings" element={withRouteBoundary(<NexusSettings />, true)} />
              <Route path="profile" element={<Navigate to="/app/settings" replace />} />

              {/* Admin */}
              <Route path="keys" element={<Navigate to="/app/admin/keys" replace />} />
              <Route path="admin/keys" element={withRouteBoundary(<KeyManagement />, true)} />
              <Route path="admin/settings" element={withRouteBoundary(<AdminSettings />, true)} />
              <Route path="admin/data" element={withRouteBoundary(<AdminDataConsole />, true)} />
              <Route path="admin/readiness" element={withRouteBoundary(<NexusTodo />, true)} />
              <Route path="admin/todo" element={<Navigate to="/app/admin/readiness" replace />} />
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
