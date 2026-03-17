import { Toaster } from "@/core/design/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { queryClientInstance } from '@/core/data/query-client';
import { getAppBasePath } from '@/core/data/app-base-path';
import { SessionProvider } from '@/core/data/SessionContext';
import NexusShell from '@/core/shell/NexusShell';
import LiveOp from '@/apps/ops-board/LiveOp';
import AccessGate from '@/pages/AccessGate';
import Onboarding from '@/pages/Onboarding';
import CofferLedger from '@/pages/CofferLedger';
import Commerce from '@/pages/Commerce';
import EpicArchive from '@/pages/EpicArchive';
import FleetForge from '@/pages/FleetForge';
import Fleet from '@/pages/Fleet';
import RoutePlanner from '@/pages/RoutePlanner';
import IndustryHub from '@/apps/industry-hub/IndustryHub';
import Logistics from '@/pages/Logistics';
import MaterialLedger from '@/pages/MaterialLedger';
import NexusSettings from '@/pages/NexusSettings';
import NexusTodo from '@/pages/NexusTodo';
import OpBoard from '@/apps/ops-board/OpBoard';
import OpCreator from '@/apps/ops-board/OpCreatorPage';
import OrgRoster from '@/pages/OrgRoster';
import ProfitCalc from '@/pages/ProfitCalc';
import RescueBoard from '@/pages/RescueBoard';
import ScoutIntel from '@/apps/scout-intel/ScoutIntel';
import RedscarHandbook from '@/pages/RedscarHandbook';
import Armory from '@/pages/Armory';
import InventoryManager from '@/pages/InventoryManager';
import AdminSettings from '@/pages/AdminSettings';
import BootScreen from '@/pages/BootScreen';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <SessionProvider>
        <Router basename={getAppBasePath()}>
          <Routes>
            <Route path="/" element={<AccessGate />} />
            <Route path="/gate" element={<AccessGate />} />
            <Route path="/boot" element={<BootScreen />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/AccessGate" element={<Navigate to="/gate" replace />} />

            <Route path="/app" element={<NexusShell />}>
              <Route index element={<Navigate to="/app/industry" replace />} />
              <Route path="industry" element={<IndustryHub />} />
              <Route path="scout" element={<ScoutIntel />} />
              <Route path="ops" element={<OpBoard />} />
              <Route path="ops/new" element={<OpCreator />} />
              <Route path="ops/:id" element={<LiveOp />} />
              <Route path="fleet" element={<FleetForge />} />
              <Route path="org-fleet" element={<Fleet />} />
              <Route path="routes" element={<RoutePlanner />} />
              <Route path="profit" element={<ProfitCalc />} />
              <Route path="coffer" element={<CofferLedger />} />
              <Route path="rescue" element={<RescueBoard />} />
              <Route path="roster" element={<OrgRoster />} />
              <Route path="archive" element={<EpicArchive />} />
              <Route path="commerce" element={<Commerce />} />
              <Route path="logistics" element={<Logistics />} />
              <Route path="settings" element={<NexusSettings />} />
              <Route path="profile" element={<NexusSettings />} />
              <Route path="admin/todo" element={<NexusTodo />} />
              <Route path="ledger" element={<MaterialLedger />} />
              <Route path="handbook" element={<RedscarHandbook />} />
              <Route path="armory" element={<Armory />} />
              <Route path="inventory" element={<InventoryManager />} />
              <Route path="admin/settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SessionProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;