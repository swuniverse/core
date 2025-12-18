import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import PlanetSelection from './pages/PlanetSelection';
import Dashboard from './pages/Dashboard';
import Planet from './pages/Planet';
import Galaxy from './pages/Galaxy';
import SystemView from './pages/SystemView';
import Research from './pages/Research';
import Fleet from './pages/Fleet';
import Shipyard from './pages/Shipyard';
import Settings from './pages/Settings';
import InviteCodes from './pages/InviteCodes';
import Admin from './pages/Admin';

function App() {
  return (
    <Routes>
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
        <Route path="/planet/:id" element={<Planet />} />
        <Route path="/shipyard/:planetId" element={<Shipyard />} />
        <Route path="/galaxy" element={<Galaxy />} />
        <Route path="/system/:systemId" element={<SystemView />} />
        <Route path="/research" element={<Research />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/invite-codes" element={<InviteCodes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

export default App;
