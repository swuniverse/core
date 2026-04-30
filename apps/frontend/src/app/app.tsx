import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { AppShell } from '../components/layout/app-shell';
import { LoginPage } from '../pages/login';
import { RegisterPage } from '../pages/register';
import { DashboardPage } from '../pages/dashboard';
import { ColoniesPage } from '../pages/colonies';
import { SpacecraftPage } from '../pages/spacecraft';
import { StarmapPage } from '../pages/starmap';
import { ResearchPage } from '../pages/research';
import { MessagesPage } from '../pages/messages';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/colonies" element={<ColoniesPage />} />
          <Route path="/spacecraft" element={<SpacecraftPage />} />
          <Route path="/starmap" element={<StarmapPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/holonet" element={<Placeholder name="HoloNet" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent">{name}</h1>
      <p className="text-swu-muted mt-2">Coming soon...</p>
    </div>
  );
}

export default App;
