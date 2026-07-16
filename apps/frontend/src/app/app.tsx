import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { useAuthStore } from '../stores/auth.store';
import { AppShell } from '../components/layout/app-shell';
import { LoginPage } from '../pages/login';
import { RegisterPage } from '../pages/register';
import { DashboardPage } from '../pages/dashboard';
import { ColoniesPage } from '../pages/colonies';
import { SpacecraftPage } from '../pages/spacecraft';
import { SpacecraftDetailPage } from '../pages/spacecraft-detail';
import { StarmapPage } from '../pages/starmap';
import { ResearchPage } from '../pages/research';
import { ResearchTreePage } from '../pages/research-tree';
import { MessagesPage } from '../pages/messages';
import { HolonetPage } from '../pages/holonet';
import { OnboardingPage } from '../pages/onboarding';
import { SettingsPage } from '../pages/settings';
import { DatabasePage } from '../pages/database';
import { StarmapAdminFullmapPage } from '../pages/starmap-admin-fullmap';
import { AdminPage } from '../pages/admin';
import { AdminShipsPage } from '../pages/admin-ships';
import { AdminInvitesPage } from '../pages/admin-invites';
import { AdminUsersPage } from '../pages/admin-users';
import { NotesPage } from '../pages/notes';
import { ColonyScansPage } from '../pages/colony-scans';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function MapEditorRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user?.isAdmin && !user?.permissions?.includes('MAP_EDITOR'))
    return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <ToastProvider>
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
            <Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} />
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
                <MapEditorRoute>
                  <StarmapAdminFullmapPage />
                </MapEditorRoute>
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
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/research/tree" element={<ResearchTreePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/holonet" element={<HolonetPage />} />
            <Route path="/database" element={<DatabasePage />} />
            <Route path="/claim-colony" element={<OnboardingPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/colony-scans" element={<ColonyScansPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
