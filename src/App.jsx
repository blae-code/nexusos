import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { queryClientInstance } from '@/lib/query-client';
import { SessionProvider } from '@/lib/SessionContext';
import NexusShell from '@/components/shell/NexusShell';
import LiveOp from '@/pages/LiveOp';
import AccessGate from '@/pages/AccessGate';
import CofferLedger from '@/pages/CofferLedger';
import EpicArchive from '@/pages/EpicArchive';
import FleetForge from '@/pages/FleetForge';
import IndustryHub from '@/pages/IndustryHub';
import MaterialLedger from '@/pages/MaterialLedger';
import NexusSettings from '@/pages/NexusSettings';
import NexusTodo from '@/pages/NexusTodo';
import OpBoard from '@/pages/OpBoard';
import OpCreator from '@/pages/OpCreator';
import OrgRoster from '@/pages/OrgRoster';
import ProfitCalc from '@/pages/ProfitCalc';
import RescueBoard from '@/pages/RescueBoard';
import ScoutIntel from '@/pages/ScoutIntel';
import RedscarHandbook from '@/pages/RedscarHandbook';
import Armory from '@/pages/Armory';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <SessionProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/gate" replace />} />
            <Route path="/gate" element={<AccessGate />} />
            <Route path="/AccessGate" element={<Navigate to="/gate" replace />} />

            <Route path="/app" element={<NexusShell />}>
              <Route index element={<Navigate to="/app/industry" replace />} />
              <Route path="industry" element={<IndustryHub />} />
              <Route path="scout" element={<ScoutIntel />} />
              <Route path="ops" element={<OpBoard />} />
              <Route path="ops/new" element={<OpCreator />} />
              <Route path="ops/:id" element={<LiveOp />} />
              <Route path="fleet" element={<FleetForge />} />
              <Route path="profit" element={<ProfitCalc />} />
              <Route path="coffer" element={<CofferLedger />} />
              <Route path="rescue" element={<RescueBoard />} />
              <Route path="roster" element={<OrgRoster />} />
              <Route path="archive" element={<EpicArchive />} />
              <Route path="settings" element={<NexusSettings />} />
              <Route path="profile" element={<NexusSettings />} />
              <Route path="admin/todo" element={<NexusTodo />} />
              <Route path="ledger" element={<MaterialLedger />} />
              <Route path="handbook" element={<RedscarHandbook />} />
              <Route path="armory" element={<Armory />} />
            </Route>

            <Route path="*" element={<Navigate to="/gate" replace />} />
          </Routes>
        </Router>
      </SessionProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;