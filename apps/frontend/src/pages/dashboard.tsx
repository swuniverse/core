import { useAuthStore } from '../stores/auth.store';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Maindesk</h1>
      <div className="bg-swu-surface border border-swu-border rounded-lg p-6">
        <p className="text-swu-muted">
          Welcome back, <span className="text-swu-primary font-bold">{user?.username}</span>
        </p>
        <p className="text-sm text-swu-muted mt-2">
          Faction: <span className="text-swu-accent">{user?.faction}</span> | Prestige: {user?.prestige}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <DashPanel title="Colonies" value="—" />
        <DashPanel title="Ships" value="—" />
        <DashPanel title="Research" value="—" />
      </div>
    </div>
  );
}

function DashPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
      <h3 className="text-sm text-swu-muted">{title}</h3>
      <p className="text-xl font-bold text-swu-primary mt-1">{value}</p>
    </div>
  );
}
