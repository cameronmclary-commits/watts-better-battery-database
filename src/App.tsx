import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import Layout from './components/Layout';
import BatteriesPage from './pages/BatteriesPage';
import BatteryDetailPage from './pages/BatteryDetailPage';
import SolarPanelsPage from './pages/SolarPanelsPage';
import SolarPanelDetailPage from './pages/SolarPanelDetailPage';
import EnergyPlansPage from './pages/EnergyPlansPage';
import InstallersPage from './pages/InstallersPage';
import InspectorsPage from './pages/InspectorsPage';
import InstallerPricingPage from './pages/InstallerPricingPage';
import AiAssistantPage from './pages/AiAssistantPage';
import ApiInfoPage from './pages/ApiInfoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/batteries" replace />} />
          <Route path="/batteries" element={<BatteriesPage />} />
          <Route path="/batteries/:id" element={<BatteryDetailPage />} />
          <Route path="/solar-panels" element={<SolarPanelsPage />} />
          <Route path="/solar-panels/:id" element={<SolarPanelDetailPage />} />
          <Route path="/energy-plans" element={<EnergyPlansPage />} />
          <Route path="/installers" element={<InstallersPage />} />
          <Route path="/inspectors" element={<InspectorsPage />} />
          <Route path="/installer-pricing" element={<InstallerPricingPage />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/api-info" element={<ApiInfoPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </BrowserRouter>
  );
}
