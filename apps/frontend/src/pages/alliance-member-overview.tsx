import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  type AllianceMemberColonyDto,
  type AllianceMemberOperationsDto,
  type AllianceMemberOverviewDto,
  type SpaceLocationDto,
} from '@swuniverse/shared';
import { ApiError, api } from '../services/api';

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatLocation(location: SpaceLocationDto | null): string {
  if (!location) return 'unbekannt';
  return location.scope === 'SYSTEM'
    ? `System ${location.systemId} (${location.x}|${location.y})`
    : `Sektor (${location.x}|${location.y})`;
}

function formatLastActive(lastActiveAt: string | null): string {
  return lastActiveAt
    ? dateTimeFormatter.format(new Date(lastActiveAt))
    : 'unbekannt';
}

function ColonyRow({ colony }: { colony: AllianceMemberColonyDto }) {
  return (
    <li className="flex flex-wrap gap-x-4 gap-y-1 py-1 text-xs">
      <span className="font-bold text-swu-primary">{colony.name}</span>
      <span>{formatLocation(colony.location)}</span>
      <span>
        Energie {colony.energy}/{colony.energyMax}
      </span>
      <span>
        Lager {colony.storageUsed}/{colony.storageMax}
      </span>
      <span>
        Bevölkerung {colony.population}/{colony.populationMax}
      </span>
    </li>
  );
}

function MemberRow({ member }: { member: AllianceMemberOperationsDto }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-2 text-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-left"
      >
        <span className="font-bold text-swu-primary">{member.name}</span>
        {member.roleTitle && (
          <span className="text-xs text-swu-muted">{member.roleTitle}</span>
        )}
        <span className="text-xs text-swu-muted">
          Letzte Aktivität: {formatLastActive(member.lastActiveAt)}
        </span>
        <span className="text-xs text-swu-muted">
          Crew {member.crew.assigned}/{member.crew.limit}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3 border-l border-swu-border pl-3">
          <section>
            <h3 className="text-xs font-bold text-swu-accent">Kolonien</h3>
            {member.colonies.length === 0 ? (
              <p className="text-xs text-swu-muted">Keine Kolonien.</p>
            ) : (
              <ul>
                {member.colonies.map((colony) => (
                  <ColonyRow key={colony.id} colony={colony} />
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="text-xs font-bold text-swu-accent">Schiffe</h3>
            {member.shipGroups.length === 0 ? (
              <p className="text-xs text-swu-muted">Keine Schiffe.</p>
            ) : (
              member.shipGroups.map((group) => (
                <div key={group.shipClassId} className="py-1">
                  <p className="text-xs font-bold">
                    {group.shipClassName} ({group.ships.length})
                  </p>
                  <ul>
                    {group.ships.map((ship) => (
                      <li key={ship.id} className="text-xs">
                        {ship.name} – {formatLocation(ship.location)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
          <section>
            <h3 className="text-xs font-bold text-swu-accent">Crew</h3>
            <p className="text-xs">
              Crew-Auslastung: {member.crew.assigned} von {member.crew.limit}
            </p>
          </section>
          <div className="flex gap-3 text-xs">
            <Link
              to={`/players/${member.userId}`}
              className="text-swu-accent hover:underline"
            >
              Profil
            </Link>
            <Link
              to={`/messages?tab=compose&to=${member.userId}&name=${encodeURIComponent(member.name)}`}
              className="text-swu-accent hover:underline"
            >
              Nachricht
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

export function AllianceMemberOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [overview, setOverview] = useState<AllianceMemberOverviewDto | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get<AllianceMemberOverviewDto>(`/alliances/${id}/member-overview`)
      .then((result) => {
        if (cancelled) return;
        setOverview(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOverview(null);
        setError(
          err instanceof ApiError && (err.status === 403 || err.status === 404)
            ? 'Die Mitgliederübersicht ist nicht verfügbar.'
            : 'Die Mitgliederübersicht konnte nicht geladen werden.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <Link
        to={id ? `/alliances/${id}` : '/alliances'}
        className="text-xs text-swu-muted hover:text-swu-accent"
      >
        ← Allianz
      </Link>
      <h1
        className="text-2xl font-bold text-swu-accent"
        style={{ fontFamily: 'var(--font-swu-display)' }}
      >
        Mitgliederübersicht
      </h1>
      {error && (
        <p
          role="alert"
          className="border border-swu-danger/60 bg-swu-danger/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {overview && (
        <ul className="divide-y divide-swu-border border border-swu-border px-3">
          {overview.members.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
        </ul>
      )}
    </div>
  );
}
