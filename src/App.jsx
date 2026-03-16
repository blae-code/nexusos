import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

// Shell
import NexusShell from '@/components/shell/NexusShell';

// Pages
import AccessGate from '@/pages/AccessGate';
import IndustryHub from '@/pages/IndustryHub';
import ScoutIntel from '@/pages/ScoutIntel';
import OpBoard from '@/pages/OpBoard';
import OpCreator from '@/pages/OpCreator';
import FleetForge from '@/pages/FleetForge';
import ProfitCalc from '@/pages/ProfitCalc';
import CofferLedger from '@/pages/CofferLedger';
import RescueBoard from '@/pages/RescueBoard';
import OrgRoster from '@/pages/OrgRoster';
import EpicArchive from '@/pages/EpicArchive';
import NexusSettings from '@/pages/NexusSettings';
import KeyManagement from '@/pages/KeyManagement';
import NexusTodo from '@/pages/NexusTodo';


function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/gate" replace />} />
          <Route path="/gate" element={<AccessGate />} />
          <Route path="/AccessGate" element={<Navigate to="/gate" replace />} />

          {/* App shell — all /app/* routes rendered inside NexusShell */}
          <Route path="/app" element={<NexusShell />}>
            <Route index element={<Navigate to="/app/industry" replace />} />
            <Route path="industry" element={<IndustryHub />} />
            <Route path="scout" element={<ScoutIntel />} />
            <Route path="ops" element={<OpBoard />} />
            <Route path="ops/new" element={<OpCreator />} />
            <Route path="fleet" element={<FleetForge />} />
            <Route path="profit" element={<ProfitCalc />} />
            <Route path="coffer" element={<CofferLedger />} />
            <Route path="rescue" element={<RescueBoard />} />
            <Route path="roster" element={<OrgRoster />} />
            <Route path="archive" element={<EpicArchive />} />
            <Route path="settings" element={<NexusSettings />} />
            <Route path="admin/keys" element={<KeyManagement />} />
            <Route path="admin/todo" element={<NexusTodo />} />
          </Route>

          <Route path="*" element={<Navigate to="/gate" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;