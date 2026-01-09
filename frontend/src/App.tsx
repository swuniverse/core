import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PlanetSelection from './pages/PlanetSelection';
import Dashboard from './pages/Dashboard';
import Planet from './pages/Planet';
import Galaxy from './pages/Galaxy';
import SystemView from './pages/SystemView';
import Research from './pages/Research';
import Fleet from './pages/Fleet';
import Settings from './pages/Settings';
import InviteCodes from './pages/InviteCodes';
import Admin from './pages/Admin';
import Planets from './pages/Planets';
import Ship from './pages/Ship';
import HoloNet from './pages/HoloNet';
import BlueprintEditorPage from './pages/BlueprintEditor';

function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/select-planet" element={
        <ProtectedRoute>
          <PlanetSelection />
        </ProtectedRoute>
      } />
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planets" element={<Planets />} />
        <Route path="/planet/:id" element={<Planet />} />
        <Route path="/blueprints" element={<BlueprintEditorPage />} />
        <Route path="/blueprints/:blueprintId" element={<BlueprintEditorPage />} />
        <Route path="/planet/:planetId/blueprints" element={<BlueprintEditorPage />} />
        <Route path="/galaxy" element={<Galaxy />} />
        <Route path="/system/:systemId" element={<SystemView />} />
        <Route path="/ship/:id" element={<Ship />} />
        <Route path="/research" element={<Research />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/holonet" element={<HoloNet />} />
        <Route path="/invite-codes" element={<InviteCodes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

export default App;
