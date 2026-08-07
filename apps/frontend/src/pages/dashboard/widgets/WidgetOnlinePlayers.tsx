import type { DashboardData } from '../types';

export function WidgetOnlinePlayers({ data }: { data: DashboardData }) {
  const players = data.onlinePlayers;
  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 h-full">
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-2 text-swu-muted text-center"
        style={{ fontFamily: 'var(--font-swu-display)' }}
      >
        Spieler Online ({players.length})
      </div>
      {players.length === 0 ? (
        <div className="text-[10px] text-swu-muted text-center">Niemand online.</div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {players.map((p) => (
            <div key={p.id} className="relative group" title={p.username}>
              <div className="w-10 h-10 rounded border border-swu-border/60 overflow-hidden bg-swu-bg">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-swu-muted text-sm font-bold">
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-swu-surface" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
