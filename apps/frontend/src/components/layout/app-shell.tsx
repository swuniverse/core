import { Outlet } from 'react-router-dom';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { useSocket } from '../../hooks/use-socket';

export function AppShell() {
  useSocket();

  return (
    <div className="min-h-screen bg-swu-bg">
      <Header />
      <Sidebar />
      <main className="ml-[120px] mt-20 p-5">
        <Outlet />
      </main>
    </div>
  );
}
