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
import { HolonetPage } from '../pages/holonet';
import { OnboardingPage } from '../pages/onboarding';
import { SettingsPage } from '../pages/settings';
import { DatabasePage } from '../pages/database';
import { StarmapAdminPage } from '../pages/starmap-admin';
import { AdminPage } from '../pages/admin';
import { AdminShipsPage } from '../pages/admin-ships';
import { AdminInvitesPage } from '../pages/admin-invites';
import { NotesPage } from '../pages/notes';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  if (!isAuthenticated) return <>{children}</>;
  return <Navigate to="/" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
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
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/ships"
            element={
              <AdminRoute>
                <AdminShipsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/starmap"
            element={
              <AdminRoute>
                <StarmapAdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/invites"
            element={
              <AdminRoute>
                <AdminInvitesPage />
              </AdminRoute>
            }
          />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/holonet" element={<HolonetPage />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/claim-colony" element={<OnboardingPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
