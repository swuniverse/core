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
import { StarmapAdminPage } from '../pages/starmap-admin';

type UserWithOnboarding = {
  onboardingCompleted?: boolean;
};

function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  const user = useAuthStore((s) => s.user) as UserWithOnboarding | null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  const user = useAuthStore((s) => s.user) as UserWithOnboarding | null;
  if (!isAuthenticated) return <>{children}</>;
  if (user && user.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to="/" replace />;
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
          path="/onboarding"
          element={
            <AuthOnlyRoute>
              <OnboardingPage />
            </AuthOnlyRoute>
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
          <Route path="/admin/starmap" element={<StarmapAdminPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/holonet" element={<HolonetPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
