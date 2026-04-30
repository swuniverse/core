import { Outlet } from 'react-router-dom';
import { Header } from './header';
import { Sidebar } from './sidebar';

export function AppShell() {
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
