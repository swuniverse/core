import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user, checkAuth } = useGameStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    check();
  }, [checkAuth]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has a planet, if not redirect to planet selection
  // But allow access to /select-planet itself
  if (
    user?.player && 
    (!user.player.planets || user.player.planets.length === 0) &&
    location.pathname !== '/select-planet'
  ) {
    return <Navigate to="/select-planet" replace />;
  }

  return <>{children}</>;
}
