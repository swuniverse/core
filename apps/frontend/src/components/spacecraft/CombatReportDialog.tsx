type Report = {
  attacker: { name: string };
  defender: { name: string };
  rounds: Array<{
    number: number;
    lines: Array<{ kind: string; text: string; emphasis: string }>;
  }>;
  outcome: {
    winner: string;
    attackerDestroyed: boolean;
    defenderDestroyed: boolean;
  };
};

export function CombatReportDialog({
  report,
  onClose,
}: {
  report: Report;
  onClose: () => void;
}) {
  const lines = report.rounds.flatMap((round) =>
    round.lines.map((line) => ({ ...line, round: round.number })),
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kampfbericht"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-2xl border border-swu-border bg-swu-bg text-sm">
        <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
          <h3 className="font-bold text-swu-primary">
            Kampfbericht · {report.attacker.name} gegen {report.defender.name}
          </h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        <div className="max-h-[65vh] overflow-auto p-3">
          {lines.map((line, index) => (
            <p
              key={index}
              className={
                line.emphasis === 'critical'
                  ? 'text-red-300'
                  : line.emphasis === 'warning'
                    ? 'text-amber-300'
                    : 'text-swu-text'
              }
            >
              {line.text}
            </p>
          ))}
          <p className="mt-3 border-t border-swu-border pt-2 font-bold text-swu-primary">
            Ergebnis:{' '}
            {report.outcome.winner === 'draw'
              ? 'Unentschieden'
              : `${report.outcome.winner === 'attacker' ? report.attacker.name : report.defender.name} gewinnt`}
          </p>
        </div>
      </section>
    </div>
  );
}
