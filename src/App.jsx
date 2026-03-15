import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Shell
import NexusShell from '@/components/shell/NexusShell';

// Pages
import AccessGate from '@/app/AccessGate';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg0)' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--b3)', borderTopColor: 'var(--acc2)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/gate" replace />} />
      <Route path="/gate" element={<AccessGate />} />

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

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;