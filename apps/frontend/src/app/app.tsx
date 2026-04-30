import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { AppShell } from '../components/layout/app-shell';
import { LoginPage } from '../pages/login';
import { RegisterPage } from '../pages/register';
import { DashboardPage } from '../pages/dashboard';

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
          <Route path="/colonies" element={<Placeholder name="Colonies" />} />
          <Route path="/spacecraft" element={<Placeholder name="Spacecraft" />} />
          <Route path="/starmap" element={<Placeholder name="Starmap" />} />
          <Route path="/research" element={<Placeholder name="Research" />} />
          <Route path="/trading" element={<Placeholder name="Trading" />} />
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
