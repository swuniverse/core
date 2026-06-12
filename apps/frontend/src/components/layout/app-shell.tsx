import { Outlet } from 'react-router-dom';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { useSocket } from '../../hooks/use-socket';

export function AppShell() {
  useSocket();

  return (
    <div className="min-h-screen bg-swu-bg">
      <Header />
      <Sidebar />
      <BottomNav />
      <main className="md:ml-[68px] mt-[52px] px-3 md:px-4 py-2 pb-[calc(56px+env(safe-area-inset-bottom,0px)+8px)] md:pb-2">
        <Outlet />
      </main>
    </div>
  );
}
