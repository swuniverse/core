import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AllianceRelationshipType,
  AllianceRole,
  type AllianceChronicleDto,
  type AllianceChronicleEntryDto,
  type AllianceDiplomacyChronicleDto,
  type AllianceDiplomacyChronicleEntryDto,
  type AllianceApplicationDto,
  type AllianceDetailDto,
  type AllianceDiplomacyManagementDto,
  type AllianceDiplomacyProposalDto,
  type AllianceDiplomacyRelationshipDto,
  type AllianceRelationshipPermissionsDto,
  type AllianceMemberDto,
  type AllianceRelationshipContractDto,
  type AllianceRelationshipSummaryDto,
  type AllianceSummaryDto,
  type AllianceRefDto,
  type AllianceTitlesDto,
  DiplomacyPartyType,
  type MyAllianceDto,
  type SettlerCounterpartyDto,
  type SettlerCounterpartyPageDto,
  type SettlerDiplomacyManagementDto,
  type SettlerPublicDiplomacyDto,
  type UpdateAllianceRequest,
} from '@swuniverse/shared';
import { BbCodeText } from '../components/BbCodeText';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { ApiError, api } from '../services/api';
import { getErrorMessage } from '../lib/errors';

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const inputClass =
  'w-full border border-swu-border bg-swu-bg px-2 py-1.5 text-sm text-swu-text focus:border-swu-accent focus:outline-none';
const buttonClass =
  'border border-swu-border px-3 py-1 text-xs text-swu-muted hover:text-swu-primary disabled:opacity-40';
const primaryButtonClass =
  'border border-swu-accent bg-swu-accent/10 px-3 py-1 text-xs text-swu-accent hover:bg-swu-accent/20 disabled:opacity-40';
const dangerButtonClass =
  'border border-swu-danger/70 px-3 py-1 text-xs text-red-400 hover:bg-swu-danger/20 disabled:opacity-40';

function relationshipTypeLabel(type: AllianceRelationshipSummaryDto['type']) {
  switch (type) {
    case 'WAR':
      return 'Krieg';
    case 'PEACE':
      return 'Frieden';
    case 'FRIENDSHIP':
      return 'Freundschaft';
    case 'ALLIANCE':
      return 'Bündnis';
    case 'TRADE_AGREEMENT':
      return 'Handelsabkommen';
    case 'VASSALAGE':
      return 'Vasallenschaft';
    default:
      return type;
  }
}

function PageTitle({
  children,
  color,
}: {
  children: ReactNode;
  color?: string | null;
}) {
  return (
    <h1
      className="text-2xl font-bold text-swu-accent"
      style={{
        fontFamily: 'var(--font-swu-display)',
        color: color ?? undefined,
      }}
    >
      {children}
    </h1>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border border-swu-danger/60 bg-swu-danger/10 px-3 py-2 text-sm text-red-300"
    >
      {message}
    </p>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-xs text-swu-muted hover:text-swu-accent">
      ← {label}
    </Link>
  );
}

function chronicleEventLabel(entry: AllianceDiplomacyChronicleEntryDto) {
  switch (entry.type) {
    case 'WAR_DECLARED':
      return 'Krieg erklärt';
    case 'RELATIONSHIP_STARTED':
      return `${relationshipTypeLabel(entry.relationship.type)} begonnen`;
    case 'RELATIONSHIP_CHANGED':
      return `${relationshipTypeLabel(entry.relationship.type)} geändert`;
    case 'RELATIONSHIP_ENDED':
      return `${relationshipTypeLabel(entry.relationship.type)} beendet`;
    default:
      return entry.type;
  }
}

// --- List ---

export function AllianceIndexPage() {
  const [mine, setMine] = useState<MyAllianceDto['alliance'] | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MyAllianceDto>('/alliances/mine')
      .then((own) => {
        if (!cancelled) setMine(own.alliance);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            getErrorMessage(
              err,
              'Die Allianzzugehörigkeit konnte nicht geladen werden.',
            ),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-4 p-3 md:p-6">
        <PageTitle>Allianzen</PageTitle>
        <ErrorMessage message={error} />
      </div>
    );
  }
  if (mine === undefined) {
    return (
      <div className="p-3 text-swu-muted md:p-6">Allianz wird geladen...</div>
    );
  }
  return (
    <Navigate to={mine ? `/alliances/${mine.id}` : '/alliances/list'} replace />
  );
}

function AllianceListMembers({
  members,
}: {
  members: AllianceSummaryDto['members'];
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
      <span className="text-swu-muted">Mitglieder:</span>
      {members.length === 0 ? (
        <span className="italic text-swu-muted">Keine</span>
      ) : (
        members.map((member) => (
          <Link
            key={member.userId}
            to={`/players/${member.userId}`}
            className="flex items-center gap-1 font-bold text-swu-primary hover:text-swu-accent"
          >
            <PlayerAvatar
              name={member.name}
              avatar={member.avatar}
              faction={member.faction}
              decorative
              className="size-5 border-0 text-[9px]"
            />
            {member.name}
          </Link>
        ))
      )}
    </div>
  );
}

function AllianceListSection({
  title,
  alliances,
}: {
  title: string;
  alliances: AllianceSummaryDto[];
}) {
  if (alliances.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-swu-primary">{title}</h2>
      <ul className="divide-y divide-swu-border border border-swu-border bg-swu-surface text-sm">
        {alliances.map((alliance) => (
          <li
            key={alliance.id}
            data-alliance-color={alliance.color ?? undefined}
            className="space-y-2 px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full border border-swu-border"
                    style={{ backgroundColor: alliance.color ?? 'transparent' }}
                  />
                  <Link
                    to={`/alliances/${alliance.id}`}
                    className="font-bold text-swu-primary hover:text-swu-accent"
                    style={{ color: alliance.color ?? undefined }}
                  >
                    {alliance.name}
                  </Link>
                </span>
                <p className="pl-[18px] text-xs text-swu-muted">
                  {alliance.factionName}
                </p>
              </div>
              <span className="font-mono text-xs text-swu-muted">
                {alliance.memberCount} Mitglieder
              </span>
            </div>
            {alliance.banner ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row">
                <Link
                  to={`/alliances/${alliance.id}`}
                  aria-label={`Allianz ${alliance.name} öffnen`}
                  className="block shrink-0 w-fit max-w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent"
                >
                  <img
                    src={alliance.banner.url}
                    alt={`Banner von ${alliance.name}`}
                    className="max-h-[150px] max-w-full w-auto"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <AllianceListMembers members={alliance.members} />
                </div>
              </div>
            ) : (
              <AllianceListMembers members={alliance.members} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AllianceListPage() {
  const [alliances, setAlliances] = useState<AllianceSummaryDto[] | null>(null);
  const [mine, setMine] = useState<MyAllianceDto['alliance']>(null);
  const [canSettlerDiplomacy, setCanSettlerDiplomacy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<AllianceSummaryDto[]>('/alliances'),
      api.get<MyAllianceDto>('/alliances/mine'),
    ])
      .then(([list, own]) => {
        if (cancelled) return;
        setAlliances(list);
        setMine(own.alliance);
        setCanSettlerDiplomacy(own.actions?.settlerDiplomacy === true);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            getErrorMessage(err, 'Allianzen konnten nicht geladen werden.'),
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 p-3 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageTitle>Allianzen</PageTitle>
        <div className="flex flex-wrap gap-2">
          {alliances && canSettlerDiplomacy && (
            <Link to="/alliances/settlers/diplomacy" className={buttonClass}>
              Siedler-Diplomatie
            </Link>
          )}
          {alliances &&
            (mine ? (
              <Link to={`/alliances/${mine.id}`} className={primaryButtonClass}>
                Meine Allianz
              </Link>
            ) : (
              <Link to="/alliances/new" className={primaryButtonClass}>
                Allianz gründen
              </Link>
            ))}
        </div>
      </div>
      <ErrorMessage message={error} />
      {!alliances && !error && (
        <p className="text-swu-muted">Allianzen werden geladen...</p>
      )}
      {alliances && alliances.length === 0 && (
        <p className="text-sm italic text-swu-muted">
          Es gibt noch keine Allianzen.
        </p>
      )}
      {alliances && alliances.length > 0 && (
        <div className="space-y-4">
          <AllianceListSection
            title="Offene Allianzen"
            alliances={alliances.filter(
              (alliance) => alliance.acceptsApplications,
            )}
          />
          <AllianceListSection
            title="Geschlossene Allianzen"
            alliances={alliances.filter(
              (alliance) => !alliance.acceptsApplications,
            )}
          />
        </div>
      )}
    </div>
  );
}

// --- Found ---

export function AllianceFoundPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { id } = await api.post<{ id: number }>('/alliances', {
        name,
        description,
      });
      navigate(`/alliances/${id}`);
    } catch (err) {
      setError(
        getErrorMessage(err, 'Die Allianz konnte nicht gegründet werden.'),
      );
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4 p-3 md:p-6">
      <BackLink to="/alliances/list" label="Allianzen" />
      <PageTitle>Allianz gründen</PageTitle>
      <p className="text-sm text-swu-muted">
        Die Allianz gehört zu Deiner Fraktion. Du wirst ihr Präsident.
        Bewerbungen sind zunächst geschlossen.
      </p>
      <form
        onSubmit={submit}
        className="space-y-3 border border-swu-border bg-swu-surface p-4"
      >
        <Field label="Name" hint="5 bis 40 Zeichen">
          {(id) => (
            <input
              id={id}
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field
          label="Beschreibung"
          hint="BBCode erlaubt, höchstens 10.000 Zeichen"
        >
          {(id) => (
            <textarea
              id={id}
              value={description}
              rows={8}
              maxLength={10000}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <ErrorMessage message={error} />
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          Gründen
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = `alliance-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs uppercase tracking-wider text-swu-muted"
      >
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[10px] text-swu-muted">{hint}</p>}
    </div>
  );
}

// --- Detail ---

function AllianceMembersSection({
  title,
  members,
  actions,
}: {
  title: string;
  members: AllianceMemberDto[];
  actions?: (member: AllianceMemberDto) => ReactNode[];
}) {
  return (
    <section className="space-y-2 border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold text-swu-primary">{title}</h2>
      {members.length === 0 ? (
        <p className="text-sm italic text-swu-muted">Keine</p>
      ) : (
        <ul className="divide-y divide-swu-border/40">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center gap-3 py-2 text-sm"
            >
              <Link
                to={`/players/${member.userId}`}
                className="flex items-center gap-2 font-bold text-swu-primary hover:text-swu-accent"
              >
                <PlayerAvatar
                  name={member.name}
                  avatar={member.avatar}
                  faction={member.faction}
                  decorative
                  className="size-9 text-sm"
                />
                {member.name}
              </Link>
              {member.roleTitle && (
                <span className="border border-swu-accent/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-swu-accent">
                  {member.roleTitle}
                </span>
              )}
              {member.online !== undefined && (
                <span
                  className={
                    member.online
                      ? 'text-[10px] uppercase tracking-wider text-green-400'
                      : 'text-[10px] uppercase tracking-wider text-swu-muted'
                  }
                >
                  {member.online ? 'Online' : 'Offline'}
                </span>
              )}
              {actions && (
                <span className="ml-auto flex flex-wrap gap-2">
                  {actions(member)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function useAllianceDetail(id: string | undefined) {
  const [alliance, setAlliance] = useState<AllianceDetailDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setAlliance(await api.get<AllianceDetailDto>(`/alliances/${id}`));
      setLoadError(null);
    } catch (err) {
      setAlliance(null);
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? 'Die Allianz existiert nicht.'
          : 'Die Allianz konnte nicht geladen werden.',
      );
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { alliance, loadError, reload };
}

/** German sentence for one internal chronicle entry. */
function allianceChronicleText(
  entry: AllianceChronicleEntryDto,
  titles?: AllianceTitlesDto,
): string {
  const officeName = (role: unknown): string | null => {
    switch (role) {
      case 'PRESIDENT':
        return titles?.president ?? 'Präsident';
      case 'VICE':
        return titles?.vice ?? 'Vize-Präsident';
      case 'DIPLOMAT':
        return titles?.diplomat ?? 'Diplomat';
      default:
        return null;
    }
  };
  const actor = entry.actor?.name ?? 'Ein Siedler';
  const subject = entry.subject?.name ?? 'ein Siedler';
  switch (entry.type) {
    case 'FOUNDED':
      return `${actor} hat die Allianz gegründet`;
    case 'MEMBER_JOINED':
      return `${actor} hat ${subject} in die Allianz aufgenommen`;
    case 'MEMBER_LEFT':
      return `${actor} hat die Allianz verlassen`;
    case 'MEMBER_KICKED':
      return `${actor} hat ${subject} aus der Allianz geworfen`;
    case 'ROLE_CHANGED': {
      const { newRole, previousRole } = chronicleMeta(entry);
      const newOffice = officeName(newRole);
      return newOffice
        ? `${actor} hat ${subject} zum ${newOffice} ernannt`
        : `${actor} hat ${subject} vom Amt ${officeName(previousRole) ?? 'unbekannt'} abgesetzt`;
    }
    case 'PRESIDENCY_TRANSFERRED': {
      const previousOffice = officeName(chronicleMeta(entry).previousRole);
      return `${actor} hat die Präsidentschaft an ${subject} übergeben${
        previousOffice ? ` (zuvor ${previousOffice})` : ''
      }`;
    }
    case 'BANNER_SET':
      return chronicleMeta(entry).replaced === true
        ? `${actor} hat das Banner ersetzt`
        : `${actor} hat ein Banner gesetzt`;
    case 'BANNER_REMOVED':
      return `${actor} hat das Banner entfernt`;
    case 'AUTOMATIC_SUCCESSION': {
      const { previousPresidentName } = chronicleMeta(entry);
      const previous =
        typeof previousPresidentName === 'string'
          ? previousPresidentName
          : 'dem bisherigen Präsidenten';
      return `${subject} ist automatisch Präsident geworden, nachdem ${previous} ausgeschieden ist`;
    }
    case 'DETAILS_CHANGED': {
      const { fields, previousName, newName } = chronicleMeta(entry);
      const labels = (Array.isArray(fields) ? fields : [])
        .map((f) => DETAIL_FIELD_LABELS[String(f)])
        .filter(Boolean)
        .join(', ');
      const rename =
        typeof previousName === 'string' && typeof newName === 'string'
          ? `; Name von „${previousName}“ zu „${newName}“`
          : '';
      return `${actor} hat Allianzdetails geändert${labels ? `: ${labels}` : ''}${rename}`;
    }
    default:
      return 'Unbekanntes Ereignis';
  }
}

const DETAIL_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Beschreibung',
  homepage: 'Homepage',
  color: 'Farbe',
  titles: 'Amtstitel',
  acceptsApplications: 'Bewerbungsannahme',
};

function chronicleMeta(
  entry: AllianceChronicleEntryDto,
): Record<string, unknown> {
  return entry.metadata ?? {};
}

export function AllianceChroniclePage() {
  const { id } = useParams<{ id: string }>();
  // Office names come from the alliance's current titles, not from the entry.
  const { alliance } = useAllianceDetail(id);
  const [chronicle, setChronicle] = useState<AllianceChronicleDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get<AllianceChronicleDto>(`/alliances/${id}/chronicle`)
      .then((response) => {
        if (!cancelled) setChronicle(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            getErrorMessage(err, 'Die Chronik konnte nicht geladen werden.'),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function loadMore() {
    const cursor = chronicle?.nextCursor;
    if (!id || !cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await api.get<AllianceChronicleDto>(
        `/alliances/${id}/chronicle?cursor=${encodeURIComponent(cursor)}`,
      );
      setChronicle((current) =>
        current
          ? {
              entries: [...current.entries, ...response.entries],
              nextCursor: response.nextCursor,
            }
          : response,
      );
    } catch (err) {
      setError(
        getErrorMessage(err, 'Ältere Einträge konnten nicht geladen werden.'),
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4 p-3 md:p-6">
      <BackLink to={`/alliances/${id}`} label="Allianz" />
      <h1 className="text-lg font-bold text-swu-primary">Allianzchronik</h1>
      <ErrorMessage message={error} />
      {chronicle && (
        <section className="space-y-2 border border-swu-border bg-swu-surface p-4">
          {chronicle.entries.length ? (
            <ol className="space-y-2 text-sm">
              {chronicle.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-l-2 border-swu-border pl-3"
                >
                  <p className="font-medium text-swu-text">
                    {allianceChronicleText(entry, alliance?.titles)}
                  </p>
                  <p className="text-xs text-swu-muted">
                    {dateFormatter.format(new Date(entry.occurredAt))}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm italic text-swu-muted">
              Noch keine Einträge vorhanden
            </p>
          )}
          {chronicle.nextCursor && (
            <button
              type="button"
              disabled={loadingMore}
              className={buttonClass}
              onClick={() => void loadMore()}
            >
              {loadingMore
                ? 'Ältere Einträge werden geladen...'
                : 'Ältere Einträge laden'}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

/** Actions of a diplomacy area that differ between alliances and Siedler. */
interface RelationshipActions {
  declareWar: (
    counterpartyId: number,
    counterpartyType: DiplomacyPartyType,
  ) => Promise<unknown>;
  offerPeace: (
    counterpartyId: number,
    counterpartyType: DiplomacyPartyType,
  ) => Promise<unknown>;
}

function partyTypeOf(
  relationship: AllianceRelationshipSummaryDto,
): DiplomacyPartyType {
  return relationship.counterpartyType ?? DiplomacyPartyType.ALLIANCE;
}

function partyTypeLabel(type: DiplomacyPartyType | undefined) {
  if (type === DiplomacyPartyType.PLAYER) return ' (Siedler)';
  if (type === DiplomacyPartyType.ALLIANCE) return ' (Allianz)';
  return '';
}

/** Active relationships with change drafts and end/consent actions, as granted by the server. */
function DiplomacyRelationships({
  relationships,
  permissions,
  busy,
  run,
  actions,
}: {
  relationships: AllianceDiplomacyRelationshipDto[];
  permissions: AllianceDiplomacyManagementDto['permissions'];
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
  actions: RelationshipActions;
}) {
  const [changeDrafts, setChangeDrafts] = useState<
    Record<
      number,
      { contract: string; treatAsFriend: boolean; shareLivePositions: boolean }
    >
  >({});
  return (
    <section className="space-y-3">
      <h2 className="font-bold text-swu-accent">Aktive Beziehungen</h2>
      {relationships.length === 0 ? (
        <p className="text-sm text-swu-muted">Keine aktiven Beziehungen.</p>
      ) : (
        relationships.map(({ relationship, change, capabilities }) => (
          <article
            key={relationship.id}
            className="space-y-3 border border-swu-border bg-swu-surface p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">
                {relationship.counterparty.name}
                {partyTypeLabel(relationship.counterpartyType)}:{' '}
                {relationshipTypeLabel(relationship.type)}
              </h3>
              <div className="flex flex-wrap gap-2">
                {capabilities.declareWar && (
                  <button
                    disabled={busy}
                    className={dangerButtonClass}
                    onClick={() =>
                      void run(() =>
                        actions.declareWar(
                          relationship.counterparty.id,
                          partyTypeOf(relationship),
                        ),
                      )
                    }
                  >
                    Krieg erklären
                  </button>
                )}
                {capabilities.offerPeace && (
                  <button
                    disabled={busy}
                    className={buttonClass}
                    onClick={() =>
                      void run(() =>
                        actions.offerPeace(
                          relationship.counterparty.id,
                          partyTypeOf(relationship),
                        ),
                      )
                    }
                  >
                    Frieden anbieten
                  </button>
                )}
                {capabilities.end && (
                  <button
                    disabled={busy}
                    className={dangerButtonClass}
                    onClick={() =>
                      void run(() =>
                        api.delete(
                          `/alliances/relationships/${relationship.id}`,
                        ),
                      )
                    }
                  >
                    Beenden
                  </button>
                )}
              </div>
            </div>
            {relationship.contract && (
              <BbCodeText text={relationship.contract} className="text-sm" />
            )}
            {capabilities.change && !change && (
              <form
                className="grid gap-2 border-t border-swu-border/50 pt-3 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const draft = changeDrafts[relationship.id] ?? {
                    contract: relationship.contract,
                    treatAsFriend: relationship.permissions.treatAsFriend,
                    shareLivePositions:
                      relationship.permissions.shareLivePositions,
                  };
                  void run(() =>
                    api.post(
                      `/alliances/relationships/${relationship.id}/changes`,
                      {
                        contract: draft.contract,
                        permissions: {
                          treatAsFriend: draft.treatAsFriend,
                          shareLivePositions: draft.shareLivePositions,
                        },
                      },
                    ),
                  );
                }}
              >
                <label className="space-y-1 text-sm md:col-span-2">
                  <span>Änderungsentwurf</span>
                  <textarea
                    aria-label={`Änderungsentwurf ${relationship.counterparty.name}`}
                    className={inputClass}
                    value={
                      changeDrafts[relationship.id]?.contract ??
                      relationship.contract
                    }
                    onChange={(event) =>
                      setChangeDrafts((drafts) => ({
                        ...drafts,
                        [relationship.id]: {
                          contract: event.target.value,
                          treatAsFriend:
                            drafts[relationship.id]?.treatAsFriend ??
                            relationship.permissions.treatAsFriend,
                          shareLivePositions:
                            drafts[relationship.id]?.shareLivePositions ??
                            relationship.permissions.shareLivePositions,
                        },
                      }))
                    }
                    disabled={busy}
                  />
                </label>
                {permissions[relationship.type].treatAsFriend && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        changeDrafts[relationship.id]?.treatAsFriend ??
                        relationship.permissions.treatAsFriend
                      }
                      onChange={(event) =>
                        setChangeDrafts((drafts) => ({
                          ...drafts,
                          [relationship.id]: {
                            contract:
                              drafts[relationship.id]?.contract ??
                              relationship.contract,
                            treatAsFriend: event.target.checked,
                            shareLivePositions:
                              drafts[relationship.id]?.shareLivePositions ??
                              relationship.permissions.shareLivePositions,
                          },
                        }))
                      }
                      disabled={busy}
                    />
                    Als Freund behandeln
                  </label>
                )}
                {permissions[relationship.type].shareLivePositions && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        changeDrafts[relationship.id]?.shareLivePositions ??
                        relationship.permissions.shareLivePositions
                      }
                      onChange={(event) =>
                        setChangeDrafts((drafts) => ({
                          ...drafts,
                          [relationship.id]: {
                            contract:
                              drafts[relationship.id]?.contract ??
                              relationship.contract,
                            treatAsFriend:
                              drafts[relationship.id]?.treatAsFriend ??
                              relationship.permissions.treatAsFriend,
                            shareLivePositions: event.target.checked,
                          },
                        }))
                      }
                      disabled={busy}
                    />
                    Live-Positionen teilen
                  </label>
                )}
                <button type="submit" disabled={busy} className={buttonClass}>
                  Änderung vorschlagen
                </button>
              </form>
            )}
            {change && (
              <div className="space-y-2 border-l-2 border-swu-accent pl-3">
                <p className="text-sm font-semibold">
                  Ausstehende Änderung (
                  {change.direction === 'SENT' ? 'gesendet' : 'empfangen'})
                </p>
                <BbCodeText text={change.contract} className="text-sm" />
                <div className="flex flex-wrap gap-2">
                  {capabilities.accept && (
                    <button
                      disabled={busy}
                      className={primaryButtonClass}
                      onClick={() =>
                        void run(() =>
                          api.post(
                            `/alliances/diplomacy/changes/${change.id}/accept`,
                            {},
                          ),
                        )
                      }
                    >
                      Annehmen
                    </button>
                  )}
                  {capabilities.decline && (
                    <button
                      disabled={busy}
                      className={buttonClass}
                      onClick={() =>
                        void run(() =>
                          api.post(
                            `/alliances/diplomacy/changes/${change.id}/decline`,
                            {},
                          ),
                        )
                      }
                    >
                      Ablehnen
                    </button>
                  )}
                  {capabilities.withdraw && (
                    <button
                      disabled={busy}
                      className={buttonClass}
                      onClick={() =>
                        void run(() =>
                          api.delete(
                            `/alliances/diplomacy/changes/${change.id}`,
                          ),
                        )
                      }
                    >
                      Zurückziehen
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}

/** Pending proposals with accept, decline and withdraw as granted by the server. */
function DiplomacyProposals({
  proposals,
  busy,
  run,
}: {
  proposals: AllianceDiplomacyProposalDto[];
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-bold text-swu-accent">Ausstehende Vorschläge</h2>
      {proposals.length === 0 ? (
        <p className="text-sm text-swu-muted">Keine ausstehenden Vorschläge.</p>
      ) : (
        proposals.map(({ proposal, direction, capabilities }) => (
          <article
            key={proposal.id}
            className="space-y-2 border border-swu-border bg-swu-surface p-4"
          >
            <p className="font-semibold">
              {relationshipTypeLabel(proposal.type)} (
              {direction === 'SENT' ? 'gesendet' : 'empfangen'})
            </p>
            <BbCodeText text={proposal.contract} className="text-sm" />
            <div className="flex flex-wrap gap-2">
              {capabilities.accept && (
                <button
                  disabled={busy}
                  className={primaryButtonClass}
                  onClick={() =>
                    void run(() =>
                      api.post(
                        `/alliances/diplomacy/proposals/${proposal.id}/accept`,
                        {},
                      ),
                    )
                  }
                >
                  Annehmen
                </button>
              )}
              {capabilities.decline && (
                <button
                  disabled={busy}
                  className={buttonClass}
                  onClick={() =>
                    void run(() =>
                      api.post(
                        `/alliances/diplomacy/proposals/${proposal.id}/decline`,
                        {},
                      ),
                    )
                  }
                >
                  Ablehnen
                </button>
              )}
              {capabilities.withdraw && (
                <button
                  disabled={busy}
                  className={buttonClass}
                  onClick={() =>
                    void run(() =>
                      api.delete(
                        `/alliances/diplomacy/proposals/${proposal.id}`,
                      ),
                    )
                  }
                >
                  Zurückziehen
                </button>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}

/** Proposal dialog shared by alliances and Siedler; the counterparty picker is supplied. */
function DiplomacyProposalForm({
  permissions,
  busy,
  picker,
  canSubmit,
  onSubmit,
}: {
  permissions: AllianceDiplomacyManagementDto['permissions'];
  busy: boolean;
  picker: ReactNode;
  canSubmit: boolean;
  onSubmit: (proposal: {
    type: AllianceRelationshipType;
    contract: string;
    permissions: AllianceRelationshipPermissionsDto;
  }) => void;
}) {
  const [type, setType] = useState<AllianceRelationshipType>(
    AllianceRelationshipType.FRIENDSHIP,
  );
  const [contract, setContract] = useState('');
  const [treatAsFriend, setTreatAsFriend] = useState(false);
  const [shareLivePositions, setShareLivePositions] = useState(false);
  const allowedPermissions = permissions[type] ?? {
    treatAsFriend: false,
    shareLivePositions: false,
  };
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          type,
          contract,
          permissions: { treatAsFriend, shareLivePositions },
        });
      }}
    >
      {picker}
      <label className="space-y-1 text-sm">
        <span>Beziehungstyp</span>
        <select
          aria-label="Beziehungstyp"
          className={inputClass}
          value={type}
          onChange={(event) => {
            const next = event.target.value as AllianceRelationshipType;
            setType(next);
            setTreatAsFriend(false);
            setShareLivePositions(false);
          }}
          disabled={busy}
        >
          {Object.values(AllianceRelationshipType).map((value) => (
            <option key={value} value={value}>
              {relationshipTypeLabel(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span>Vertragsentwurf</span>
        <textarea
          aria-label="Vertragsentwurf"
          className={inputClass}
          value={contract}
          onChange={(event) => setContract(event.target.value)}
          disabled={busy}
        />
      </label>
      {allowedPermissions.treatAsFriend && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={treatAsFriend}
            onChange={(event) => setTreatAsFriend(event.target.checked)}
            disabled={busy}
          />
          Als Freund behandeln
        </label>
      )}
      {allowedPermissions.shareLivePositions && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shareLivePositions}
            onChange={(event) => setShareLivePositions(event.target.checked)}
            disabled={busy}
          />
          Live-Positionen teilen
        </label>
      )}
      <button
        type="submit"
        disabled={busy || !canSubmit}
        className={primaryButtonClass}
      >
        Vorschlag senden
      </button>
    </form>
  );
}

interface CounterpartyTarget {
  type: DiplomacyPartyType;
  id: number;
  name: string;
}

/** Search for alliance-less players of the viewer's faction (id and name only), plus optional alliances. */
function SettlerPicker({
  searchPath,
  busy,
  onError,
  setBusy,
  actions,
  alliances = [],
}: {
  searchPath: string;
  busy: boolean;
  onError: (message: string | null) => void;
  setBusy: (busy: boolean) => void;
  actions: {
    negotiate: (target: CounterpartyTarget) => void;
    declareWar?: (target: CounterpartyTarget) => Promise<unknown>;
  };
  alliances?: AllianceRefDto[];
}) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState<string | null>(null);
  const [results, setResults] = useState<SettlerCounterpartyDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  async function search(text: string, cursor: string | null) {
    setBusy(true);
    onError(null);
    try {
      const params = new URLSearchParams({ q: text });
      if (cursor) params.set('cursor', cursor);
      const page = await api.get<SettlerCounterpartyPageDto>(
        `${searchPath}?${params.toString()}`,
      );
      setSearched(text);
      setResults((current) =>
        cursor ? [...current, ...page.players] : page.players,
      );
      setNextCursor(page.nextCursor);
    } catch (err) {
      onError(getErrorMessage(err, 'Die Suche ist fehlgeschlagen.'));
    } finally {
      setBusy(false);
    }
  }

  const rows: CounterpartyTarget[] = [
    ...alliances.map((alliance) => ({
      type: DiplomacyPartyType.ALLIANCE,
      id: alliance.id,
      name: alliance.name,
    })),
    ...results.map((player) => ({
      type: DiplomacyPartyType.PLAYER,
      id: player.id,
      name: player.name,
    })),
  ];

  return (
    <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
      <h2 className="font-bold text-swu-accent">
        Siedler als Gegenpartei wählen
      </h2>
      <p className="text-sm text-swu-muted">
        Es werden nur Siedler ohne Allianz derselben Fraktion angezeigt.
      </p>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search(query.trim(), null);
        }}
      >
        <label className="space-y-1 text-sm">
          <span>Siedler suchen</span>
          <input
            aria-label="Siedler suchen"
            className={inputClass}
            value={query}
            maxLength={40}
            onChange={(event) => setQuery(event.target.value)}
            disabled={busy}
          />
        </label>
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          Suchen
        </button>
      </form>
      {searched !== null && results.length === 0 && (
        <p className="text-sm text-swu-muted">Keine Siedler gefunden.</p>
      )}
      <ul className="space-y-1 text-sm">
        {rows.map((target) => {
          const label =
            target.type === DiplomacyPartyType.ALLIANCE
              ? `Allianz ${target.name}`
              : target.name;
          return (
            <li
              key={`${target.type}-${target.id}`}
              className="flex items-center justify-between gap-2"
            >
              <span>{label}</span>
              <button
                disabled={busy}
                aria-label={`Verhandeln: ${label}`}
                className={buttonClass}
                onClick={() => actions.negotiate(target)}
              >
                Verhandeln
              </button>
              {actions.declareWar && (
                <button
                  disabled={busy}
                  aria-label={`Krieg erklären: ${label}`}
                  className={dangerButtonClass}
                  onClick={() => {
                    void actions.declareWar?.(target).then(() => {
                      setResults([]);
                      setSearched(null);
                      setNextCursor(null);
                    });
                  }}
                >
                  Krieg erklären
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {nextCursor && (
        <button
          disabled={busy}
          className={buttonClass}
          onClick={() => void search(searched ?? '', nextCursor)}
        >
          Mehr laden
        </button>
      )}
    </section>
  );
}

export function AllianceDiplomacyPage() {
  const { id } = useParams<{ id: string }>();
  const [management, setManagement] =
    useState<AllianceDiplomacyManagementDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recipientAllianceId, setRecipientAllianceId] = useState('');
  const [negotiateWith, setNegotiateWith] = useState<CounterpartyTarget | null>(
    null,
  );

  const reload = useCallback(async () => {
    if (!id) return;
    setManagement(
      await api.get<AllianceDiplomacyManagementDto>(
        `/alliances/${id}/diplomacy`,
      ),
    );
  }, [id]);

  useEffect(() => {
    void reload().catch((err) =>
      setError(
        getErrorMessage(
          err,
          'Die Diplomatieverwaltung konnte nicht geladen werden.',
        ),
      ),
    );
  }, [reload]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(
        getErrorMessage(err, 'Die diplomatische Aktion ist fehlgeschlagen.'),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!management && !error) {
    return (
      <p className="p-6 text-swu-muted">Diplomatieverwaltung wird geladen...</p>
    );
  }

  return (
    <div className="max-w-5xl space-y-6 p-3 md:p-6">
      <BackLink to={id ? `/alliances/${id}` : '/alliances'} label="Allianz" />
      <PageTitle>Diplomatieverwaltung</PageTitle>
      <ErrorMessage message={error} />
      {!management ? null : (
        <>
          {management.capabilities.create && !negotiateWith && (
            <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
              <h2 className="font-bold text-swu-accent">
                Beziehung vorschlagen
              </h2>
              <DiplomacyProposalForm
                permissions={management.permissions}
                busy={busy}
                canSubmit={!!id && !!recipientAllianceId}
                onSubmit={(proposal) =>
                  void run(() =>
                    api.post(`/alliances/${id}/diplomacy/proposals`, {
                      recipientAllianceId: Number(recipientAllianceId),
                      ...proposal,
                    }),
                  )
                }
                picker={
                  <label className="space-y-1 text-sm">
                    <span>Zielallianz</span>
                    <select
                      aria-label="Zielallianz"
                      className={inputClass}
                      value={recipientAllianceId}
                      onChange={(event) =>
                        setRecipientAllianceId(event.target.value)
                      }
                      disabled={busy}
                    >
                      <option value="">Bitte wählen</option>
                      {management.targets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.name}
                        </option>
                      ))}
                    </select>
                  </label>
                }
              />
            </section>
          )}

          {management.capabilities.create && negotiateWith && (
            <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
              <h2 className="font-bold text-swu-accent">
                Beziehung vorschlagen
              </h2>
              <DiplomacyProposalForm
                permissions={management.permissions}
                busy={busy}
                canSubmit={!!id}
                onSubmit={(proposal) =>
                  void run(async () => {
                    await api.post(`/alliances/${id}/diplomacy/proposals`, {
                      recipientPlayerId: negotiateWith.id,
                      ...proposal,
                    });
                    setNegotiateWith(null);
                  })
                }
                picker={
                  <div className="space-y-1 text-sm md:col-span-2">
                    <p>
                      Gegenpartei (Siedler):{' '}
                      <strong>{negotiateWith.name}</strong>
                    </p>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => setNegotiateWith(null)}
                    >
                      Abbrechen
                    </button>
                  </div>
                }
              />
            </section>
          )}

          {management.capabilities.create && id && (
            <SettlerPicker
              searchPath={`/alliances/${id}/diplomacy/counterparties`}
              busy={busy}
              onError={setError}
              setBusy={setBusy}
              actions={{
                negotiate: setNegotiateWith,
                declareWar: (target) =>
                  run(() =>
                    api.post(
                      `/alliances/${id}/relationships/players/${target.id}/war`,
                      {},
                    ),
                  ),
              }}
            />
          )}

          <DiplomacyRelationships
            relationships={management.relationships}
            permissions={management.permissions}
            busy={busy}
            run={run}
            actions={{
              declareWar: (counterpartyId, type) =>
                api.post(
                  type === DiplomacyPartyType.PLAYER
                    ? `/alliances/${id}/relationships/players/${counterpartyId}/war`
                    : `/alliances/${id}/relationships/${counterpartyId}/war`,
                  {},
                ),
              offerPeace: (counterpartyId, type) =>
                api.post(`/alliances/${id}/diplomacy/proposals`, {
                  ...(type === DiplomacyPartyType.PLAYER
                    ? { recipientPlayerId: counterpartyId }
                    : { recipientAllianceId: counterpartyId }),
                  type: AllianceRelationshipType.PEACE,
                }),
            }}
          />

          <DiplomacyProposals
            proposals={management.proposals}
            busy={busy}
            run={run}
          />
        </>
      )}
    </div>
  );
}

// --- Siedler diplomacy ---

/** Diplomacy area of an alliance-less player; the server derives the party. */
export function SettlerDiplomacyPage() {
  const [management, setManagement] =
    useState<SettlerDiplomacyManagementDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [negotiateWith, setNegotiateWith] = useState<CounterpartyTarget | null>(
    null,
  );

  const reload = useCallback(async () => {
    setManagement(
      await api.get<SettlerDiplomacyManagementDto>(
        '/alliances/settlers/diplomacy',
      ),
    );
  }, []);

  useEffect(() => {
    void reload().catch((err) =>
      setError(
        getErrorMessage(
          err,
          'Die Siedler-Diplomatie konnte nicht geladen werden.',
        ),
      ),
    );
  }, [reload]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(
        getErrorMessage(err, 'Die diplomatische Aktion ist fehlgeschlagen.'),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!management && !error) {
    return (
      <p className="p-6 text-swu-muted">Siedler-Diplomatie wird geladen...</p>
    );
  }

  return (
    <div className="max-w-5xl space-y-6 p-3 md:p-6">
      <BackLink to="/alliances/list" label="Allianzen" />
      <PageTitle>Siedler-Diplomatie</PageTitle>
      <ErrorMessage message={error} />
      {!management ? null : (
        <>
          {(management.capabilities.create ||
            management.capabilities.declareWar) && (
            <SettlerPicker
              searchPath="/alliances/settlers/counterparties"
              busy={busy}
              onError={setError}
              setBusy={setBusy}
              alliances={management.targets ?? []}
              actions={{
                negotiate: setNegotiateWith,
                ...(management.capabilities.declareWar
                  ? {
                      declareWar: (target: CounterpartyTarget) =>
                        run(() =>
                          api.post(
                            target.type === DiplomacyPartyType.ALLIANCE
                              ? `/alliances/settlers/alliances/${target.id}/war`
                              : `/alliances/settlers/${target.id}/war`,
                            {},
                          ),
                        ),
                    }
                  : {}),
              }}
            />
          )}

          {management.capabilities.create && negotiateWith && (
            <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
              <h2 className="font-bold text-swu-accent">
                Beziehung vorschlagen
              </h2>
              <DiplomacyProposalForm
                permissions={management.permissions}
                busy={busy}
                canSubmit
                onSubmit={(proposal) =>
                  void run(async () => {
                    await api.post('/alliances/settlers/diplomacy/proposals', {
                      ...(negotiateWith.type === DiplomacyPartyType.ALLIANCE
                        ? { recipientAllianceId: negotiateWith.id }
                        : { recipientPlayerId: negotiateWith.id }),
                      ...proposal,
                    });
                    setNegotiateWith(null);
                  })
                }
                picker={
                  <p className="text-sm md:col-span-2">
                    Gegenpartei:{' '}
                    <strong>
                      {negotiateWith.type === DiplomacyPartyType.ALLIANCE
                        ? `Allianz ${negotiateWith.name}`
                        : negotiateWith.name}
                    </strong>
                  </p>
                }
              />
            </section>
          )}

          <DiplomacyRelationships
            relationships={management.relationships}
            permissions={management.permissions}
            busy={busy}
            run={run}
            actions={{
              declareWar: (counterpartyId, type) =>
                api.post(
                  type === DiplomacyPartyType.ALLIANCE
                    ? `/alliances/settlers/alliances/${counterpartyId}/war`
                    : `/alliances/settlers/${counterpartyId}/war`,
                  {},
                ),
              offerPeace: (counterpartyId, type) =>
                api.post('/alliances/settlers/diplomacy/proposals', {
                  ...(type === DiplomacyPartyType.ALLIANCE
                    ? { recipientAllianceId: counterpartyId }
                    : { recipientPlayerId: counterpartyId }),
                  type: AllianceRelationshipType.PEACE,
                }),
            }}
          />

          <DiplomacyProposals
            proposals={management.proposals}
            busy={busy}
            run={run}
          />
        </>
      )}
    </div>
  );
}

export function AllianceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { alliance, loadError, reload } = useAllianceDetail(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contracts, setContracts] = useState<Record<number, string>>({});
  const [loadingContractId, setLoadingContractId] = useState<number | null>(
    null,
  );
  const [chronicle, setChronicle] =
    useState<AllianceDiplomacyChronicleDto | null>(null);
  const [loadingMoreChronicle, setLoadingMoreChronicle] = useState(false);
  const [chronicleLoadMoreError, setChronicleLoadMoreError] = useState<
    string | null
  >(null);

  const reloadChronicle = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get<AllianceDiplomacyChronicleDto>(
        `/alliances/${id}/diplomacy/chronicle`,
      );
      setChronicle(Array.isArray(response?.entries) ? response : null);
      setChronicleLoadMoreError(null);
    } catch {
      setChronicle(null);
    }
  }, [id]);

  async function loadMoreChronicle() {
    const cursor = chronicle?.nextCursor;
    if (!id || !cursor || loadingMoreChronicle) return;

    setLoadingMoreChronicle(true);
    setChronicleLoadMoreError(null);
    try {
      const response = await api.get<AllianceDiplomacyChronicleDto>(
        `/alliances/${id}/diplomacy/chronicle?cursor=${encodeURIComponent(cursor)}`,
      );
      if (!Array.isArray(response?.entries)) return;
      setChronicle((current) =>
        current
          ? {
              entries: [...current.entries, ...response.entries],
              nextCursor: response.nextCursor,
            }
          : current,
      );
    } catch (err) {
      setChronicleLoadMoreError(
        getErrorMessage(
          err,
          'Weitere Chronik-Einträge konnten nicht geladen werden.',
        ),
      );
    } finally {
      setLoadingMoreChronicle(false);
    }
  }

  useEffect(() => {
    if (!alliance) return;
    void reloadChronicle();
  }, [alliance, reloadChronicle]);

  async function loadContract(relationship: AllianceRelationshipSummaryDto) {
    if (!id || contracts[relationship.id] !== undefined) return;
    setLoadingContractId(relationship.id);
    setError(null);
    try {
      const result = await api.get<AllianceRelationshipContractDto>(
        `/alliances/${id}/relationships/${relationship.id}/contract`,
      );
      setContracts((current) => ({
        ...current,
        [relationship.id]: result.contract,
      }));
    } catch (err) {
      setError(
        getErrorMessage(err, 'Das Vertragswerk konnte nicht geladen werden.'),
      );
    } finally {
      setLoadingContractId(null);
    }
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await Promise.all([reload(), reloadChronicle()]);
    } catch (err) {
      setError(getErrorMessage(err, 'Die Aktion ist fehlgeschlagen.'));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4 p-3 md:p-6">
        <BackLink to="/alliances/list" label="Allianzen" />
        <p className="text-swu-muted">{loadError}</p>
      </div>
    );
  }
  if (!alliance) {
    return (
      <div className="p-3 text-swu-muted md:p-6">Allianz wird geladen...</div>
    );
  }

  const base = `/alliances/${alliance.id}`;
  const { actions } = alliance.viewer;

  return (
    <div className="space-y-4 p-3 md:p-6">
      <BackLink to="/alliances/list" label="Allianzen" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <main className="min-w-0 space-y-4">
      {alliance.banner && (
        <img
          src={alliance.banner.url}
          alt={`Banner von ${alliance.name}`}
          className="mx-auto h-auto max-w-full border border-swu-border"
        />
      )}

      <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageTitle color={alliance.color}>{alliance.name}</PageTitle>
          <div className="flex flex-wrap gap-2">
            {actions.apply && (
              <button
                type="button"
                disabled={busy}
                className={primaryButtonClass}
                onClick={() =>
                  void run(() => api.post(`${base}/applications`, {}))
                }
              >
                Bewerben
              </button>
            )}
            {actions.withdrawApplication && (
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
                onClick={() =>
                  void run(() => api.delete(`${base}/applications/mine`))
                }
              >
                Bewerbung zurückziehen
              </button>
            )}
            {alliance.viewer.role !== null && (
              <Link to="/alliances/list" className={buttonClass}>
                Allianzliste
              </Link>
            )}
            {actions.manageApplications && (
              <Link to={`${base}/applications`} className={buttonClass}>
                Bewerbungen anzeigen
              </Link>
            )}
            {(actions.editDetails ||
              actions.manageBanner ||
              actions.leave ||
              actions.dissolve ||
              alliance.members.some((member) =>
                Object.values(member.actions).some(Boolean),
              )) && (
              <Link to={`${base}/edit`} className={buttonClass}>
                Editieren
              </Link>
            )}
            {actions.readForum && (
              <Link to={`${base}/forum`} className={buttonClass}>
                Forum
              </Link>
            )}
            {actions.viewMemberOperations && (
              <Link to={`${base}/member-overview`} className={buttonClass}>
                Mitgliederübersicht öffnen
              </Link>
            )}
            {actions.viewChronicle && (
              <Link to={`${base}/chronicle`} className={buttonClass}>
                Chronik lesen
              </Link>
            )}
            {actions.manageDiplomacy && (
              <Link to={`${base}/diplomacy`} className={buttonClass}>
                Diplomatieverwaltung
              </Link>
            )}
          </div>
        </div>
        <ErrorMessage message={error} />
      </section>

      <section className="border border-swu-border bg-swu-surface p-4">
        {alliance.renderedDescription.trim() ? (
          <BbCodeText
            text={alliance.renderedDescription}
            allowBannerImages
            className="text-sm text-swu-text whitespace-pre-wrap"
          />
        ) : (
          <p className="text-sm italic text-swu-muted">
            Keine Allianz-Beschreibung hinterlegt
          </p>
        )}
      </section>

      <section className="space-y-2 border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold text-swu-primary">
          Diplomatie-Chronik
        </h2>
        {chronicle?.entries.length ? (
          <ol className="space-y-2 text-sm">
            {chronicle.entries.map((entry) => (
              <li key={entry.id} className="border-l-2 border-swu-border pl-3">
                <p className="font-medium text-swu-text">
                  {chronicleEventLabel(entry)}: {entry.firstAlliance.name} –{' '}
                  {entry.secondAlliance.name}
                  {entry.relationship.vassalage &&
                    ` (${entry.relationship.vassalage.lordAllianceId === alliance.id ? 'Lehnsherr' : 'Vasall'})`}
                </p>
                <p className="text-xs text-swu-muted">
                  {entry.actor?.name ?? 'Unbekannt'} ·{' '}
                  {dateFormatter.format(new Date(entry.occurredAt))}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm italic text-swu-muted">
            Keine öffentlichen Diplomatieereignisse vorhanden
          </p>
        )}
        {chronicleLoadMoreError && (
          <p role="alert" className="text-sm text-red-300">
            {chronicleLoadMoreError}
          </p>
        )}
        {chronicle?.nextCursor && (
          <button
            type="button"
            disabled={loadingMoreChronicle}
            className={buttonClass}
            onClick={() => void loadMoreChronicle()}
          >
            {loadingMoreChronicle
              ? 'Ältere Ereignisse werden geladen...'
              : 'Ältere Ereignisse laden'}
          </button>
        )}
      </section>

      {alliance.relationships.length > 0 && (
        <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
          <h2 className="text-sm font-bold text-swu-primary">
            Aktive Beziehungen
          </h2>
          <ul className="divide-y divide-swu-border/40">
            {alliance.relationships.map((relationship) => {
              const isLord =
                relationship.vassalage?.lordAllianceId === alliance.id;
              const isVassal =
                relationship.vassalage?.vassalAllianceId === alliance.id;
              const labels = [
                relationship.permissions.treatAsFriend
                  ? 'Als Freund behandeln'
                  : null,
                relationship.permissions.shareLivePositions
                  ? 'Live-Kartenpositionen teilen'
                  : null,
              ].filter(Boolean);
              return (
                <li key={relationship.id} className="space-y-2 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      to={
                        relationship.counterpartyType ===
                        DiplomacyPartyType.PLAYER
                          ? `/players/${relationship.counterparty.id}`
                          : `/alliances/${relationship.counterparty.id}`
                      }
                      className="font-bold text-swu-primary hover:text-swu-accent"
                      style={{
                        color: relationship.counterparty.color ?? undefined,
                      }}
                    >
                      {relationship.counterparty.name}
                    </Link>
                    <span>{relationshipTypeLabel(relationship.type)}</span>
                    <span className="text-xs text-swu-muted">
                      seit{' '}
                      {dateFormatter.format(new Date(relationship.startedAt))}
                    </span>
                  </div>
                  {relationship.vassalage && (
                    <p className="text-xs text-swu-muted">
                      {isLord
                        ? `Lehnsherr von ${relationship.counterparty.name}`
                        : isVassal
                          ? `Vasall von ${relationship.counterparty.name}`
                          : null}
                    </p>
                  )}
                  {labels.length > 0 && (
                    <p className="text-xs text-swu-muted">
                      {labels.join(' · ')}
                    </p>
                  )}
                  {relationship.hasContract && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={loadingContractId === relationship.id}
                        className={buttonClass}
                        onClick={() => void loadContract(relationship)}
                      >
                        {loadingContractId === relationship.id
                          ? 'Vertragswerk wird geladen...'
                          : 'Vertragswerk anzeigen'}
                      </button>
                      {contracts[relationship.id] !== undefined && (
                        <BbCodeText
                          text={contracts[relationship.id]}
                          className="border border-swu-border/60 bg-swu-bg/50 p-3 text-sm whitespace-pre-wrap"
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

        </main>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <AllianceMembersSection
            title="Leitung"
            members={alliance.members.filter(
              (member) => member.role !== AllianceRole.NONE,
            )}
          />
          <AllianceMembersSection
            title="Mitglieder"
            members={alliance.members.filter(
              (member) => member.role === AllianceRole.NONE,
            )}
          />
          <section className="space-y-2 border border-swu-border bg-swu-surface p-4">
            <h2 className="text-sm font-bold text-swu-primary">Fakten</h2>
            <dl className="grid gap-x-3 gap-y-1 text-sm grid-cols-[auto_1fr]">
              <dt className="text-swu-muted">Fraktion</dt>
              <dd className="text-swu-primary">{alliance.factionName}</dd>
              <dt className="text-swu-muted">Gegründet</dt>
              <dd>{dateFormatter.format(new Date(alliance.foundedAt))}</dd>
              <dt className="text-swu-muted">Mitglieder</dt>
              <dd>{alliance.memberCount}</dd>
              <dt className="text-swu-muted">Aufnahme</dt>
              <dd>{alliance.acceptsApplications ? 'offen' : 'geschlossen'}</dd>
              {alliance.homepage && (
                <>
                  <dt className="text-swu-muted">Homepage</dt>
                  <dd className="truncate">
                    <a
                      href={alliance.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="text-swu-accent underline hover:text-swu-primary"
                    >
                      {alliance.homepage}
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

// --- Applications ---

export function AllianceApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const { alliance, loadError, reload } = useAllianceDetail(id);
  const [applications, setApplications] = useState<
    AllianceApplicationDto[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reloadApplications = useCallback(async () => {
    if (!id) return;
    setApplications(
      await api.get<AllianceApplicationDto[]>(`/alliances/${id}/applications`),
    );
  }, [id]);

  useEffect(() => {
    if (!alliance?.viewer.actions.manageApplications) return;
    void reloadApplications().catch((err) =>
      setError(
        getErrorMessage(err, 'Bewerbungen konnten nicht geladen werden.'),
      ),
    );
  }, [alliance, reloadApplications]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await Promise.all([reload(), reloadApplications()]);
    } catch (err) {
      setError(getErrorMessage(err, 'Die Aktion ist fehlgeschlagen.'));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4 p-3 md:p-6">
        <BackLink to="/alliances/list" label="Allianzen" />
        <p className="text-swu-muted">{loadError}</p>
      </div>
    );
  }
  if (!alliance) {
    return (
      <div className="p-3 text-swu-muted md:p-6">Allianz wird geladen...</div>
    );
  }
  if (!alliance.viewer.actions.manageApplications) {
    return (
      <div className="space-y-4 p-3 md:p-6">
        <BackLink to={`/alliances/${alliance.id}`} label={alliance.name} />
        <p className="text-swu-muted">
          Du darfst die Bewerbungen dieser Allianz nicht verwalten.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4 p-3 md:p-6">
      <BackLink to={`/alliances/${alliance.id}`} label={alliance.name} />
      <PageTitle>Bewerbungen</PageTitle>
      <ErrorMessage message={error} />
      {applications === null && !error ? (
        <p className="text-swu-muted">Bewerbungen werden geladen...</p>
      ) : applications?.length === 0 ? (
        <p className="text-sm italic text-swu-muted">
          Keine offenen Bewerbungen
        </p>
      ) : (
        <ul className="divide-y divide-swu-border/40 border border-swu-border bg-swu-surface px-4">
          {applications?.map((application) => (
            <li
              key={application.id}
              className="flex flex-wrap items-center gap-3 py-3 text-sm"
            >
              <Link
                to={`/players/${application.userId}`}
                className="font-bold text-swu-primary hover:text-swu-accent"
              >
                {application.name}
              </Link>
              <span className="text-xs text-swu-muted">
                {dateFormatter.format(new Date(application.createdAt))}
              </span>
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={primaryButtonClass}
                  onClick={() =>
                    void run(() =>
                      api.post(
                        `/alliances/applications/${application.id}/accept`,
                        {},
                      ),
                    )
                  }
                >
                  Annehmen
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={dangerButtonClass}
                  onClick={() =>
                    void run(() =>
                      api.post(
                        `/alliances/applications/${application.id}/decline`,
                        {},
                      ),
                    )
                  }
                >
                  Ablehnen
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Edit ---

export function AllianceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alliance, loadError, reload } = useAllianceDetail(id);
  const [form, setForm] = useState<Required<UpdateAllianceRequest> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!alliance) return;
    setForm({
      name: alliance.name,
      description: alliance.description,
      homepage: alliance.homepage,
      color: alliance.color ?? '',
      acceptsApplications: alliance.acceptsApplications,
      titles: { ...alliance.titles },
    });
  }, [alliance]);

  if (loadError) {
    return (
      <div className="space-y-4 p-3 md:p-6">
        <BackLink to="/alliances/list" label="Allianzen" />
        <p className="text-swu-muted">{loadError}</p>
      </div>
    );
  }
  if (!alliance || !form) {
    return (
      <div className="p-3 text-swu-muted md:p-6">Allianz wird geladen...</div>
    );
  }
  const canEdit =
    alliance.viewer.actions.editDetails ||
    alliance.viewer.actions.manageBanner ||
    alliance.viewer.actions.leave ||
    alliance.viewer.actions.dissolve ||
    alliance.members.some((member) =>
      Object.values(member.actions).some(Boolean),
    );
  if (!canEdit) {
    return (
      <div className="space-y-4 p-3 md:p-6">
        <BackLink to={`/alliances/${alliance.id}`} label={alliance.name} />
        <p className="text-swu-muted">
          Du darfst diese Allianz nicht bearbeiten.
        </p>
      </div>
    );
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });
  const setTitle = (key: keyof typeof form.titles, value: string) =>
    setForm({ ...form, titles: { ...form.titles, [key]: value } });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || !alliance) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/alliances/${alliance.id}`, form);
      navigate(`/alliances/${alliance.id}`);
    } catch (err) {
      setError(
        getErrorMessage(err, 'Die Allianz konnte nicht gespeichert werden.'),
      );
      setBusy(false);
    }
  }

  async function run(
    action: () => Promise<unknown>,
    after: 'reload' | 'list' = 'reload',
  ) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (after === 'list') {
        navigate('/alliances/list');
        return;
      }
      await reload();
    } catch (err) {
      setError(getErrorMessage(err, 'Die Aktion ist fehlgeschlagen.'));
    } finally {
      setBusy(false);
    }
  }

  const memberActions = (member: AllianceMemberDto) => {
    const buttons: ReactNode[] = [];
    const roleButton = (role: AllianceRole, label: string) => (
      <button
        key={label}
        type="button"
        disabled={busy}
        className={buttonClass}
        onClick={() =>
          void run(() =>
            api.put(`/alliances/${alliance.id}/members/${member.userId}/role`, {
              role,
            }),
          )
        }
      >
        {label}
      </button>
    );
    if (member.actions.appointVice) {
      buttons.push(
        roleButton(AllianceRole.VICE, `Zum ${alliance.titles.vice} ernennen`),
      );
    }
    if (member.actions.appointDiplomat) {
      buttons.push(
        roleButton(
          AllianceRole.DIPLOMAT,
          `Zum ${alliance.titles.diplomat} ernennen`,
        ),
      );
    }
    if (member.actions.dismiss) {
      buttons.push(roleButton(AllianceRole.NONE, 'Amt entziehen'));
    }
    if (member.actions.transferPresidency) {
      buttons.push(
        <button
          key="transfer"
          type="button"
          disabled={busy}
          className={buttonClass}
          onClick={() => {
            if (
              !window.confirm(
                `Das Amt ${alliance.titles.president} an ${member.name} übergeben? Du wirst danach Mitglied ohne Amt.`,
              )
            )
              return;
            void run(() =>
              api.post(
                `/alliances/${alliance.id}/members/${member.userId}/transfer-presidency`,
                {},
              ),
            );
          }}
        >
          Präsidentenamt übergeben
        </button>,
      );
    }
    if (member.actions.kick) {
      buttons.push(
        <button
          key="kick"
          type="button"
          disabled={busy}
          className={dangerButtonClass}
          onClick={() => {
            if (
              !window.confirm(`${member.name} wirklich aus der Allianz werfen?`)
            )
              return;
            void run(() =>
              api.delete(`/alliances/${alliance.id}/members/${member.userId}`),
            );
          }}
        >
          Rauswerfen
        </button>,
      );
    }
    return buttons;
  };

  return (
    <div className="max-w-2xl space-y-4 p-3 md:p-6">
      <BackLink to={`/alliances/${alliance.id}`} label={alliance.name} />
      <PageTitle>Allianz bearbeiten</PageTitle>
      <ErrorMessage message={error} />
      {alliance.viewer.actions.editDetails && (
        <form
          onSubmit={submit}
          className="space-y-3 border border-swu-border bg-swu-surface p-4"
        >
          <Field label="Name" hint="5 bis 40 Zeichen">
            {(fieldId) => (
              <input
                id={fieldId}
                value={form.name}
                maxLength={40}
                onChange={(e) => set('name', e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field
            label="Beschreibung"
            hint="BBCode erlaubt, höchstens 10.000 Zeichen. Platzhalter: $ALLIANCE_PRESIDENT, $ALLIANCE_VICEPRESIDENT, $ALLIANCE_FOREIGNMINISTER, $ALLIANCE_HOMEPAGE_LINK"
          >
            {(fieldId) => (
              <textarea
                id={fieldId}
                value={form.description}
                rows={10}
                maxLength={10000}
                onChange={(e) => set('description', e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Homepage" hint="Leer oder mit http:// bzw. https://">
            {(fieldId) => (
              <input
                id={fieldId}
                value={form.homepage}
                onChange={(e) => set('homepage', e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Farbe" hint="Leer oder #rrggbb, z. B. #11ff67">
            {(fieldId) => (
              <span className="flex items-center gap-2">
                <input
                  id={fieldId}
                  value={form.color}
                  maxLength={7}
                  placeholder="#rrggbb"
                  onChange={(e) => set('color', e.target.value)}
                  className={inputClass}
                />
                <span
                  aria-hidden
                  className="size-7 shrink-0 border border-swu-border"
                  style={{
                    backgroundColor: /^#[0-9a-f]{6}$/i.test(form.color)
                      ? form.color
                      : 'transparent',
                  }}
                />
              </span>
            )}
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.acceptsApplications}
              onChange={(e) => set('acceptsApplications', e.target.checked)}
            />
            Bewerbungen annehmen
          </label>
          {alliance.acceptsApplications && !form.acceptsApplications && (
            <p className="text-xs text-swu-warning">
              Beim Schließen werden alle offenen Bewerbungen abgelehnt.
            </p>
          )}
          <fieldset className="space-y-2 border border-swu-border/60 p-3">
            <legend className="px-1 text-xs uppercase tracking-wider text-swu-muted">
              Amtstitel (je 3 bis 30 Zeichen)
            </legend>
            <Field label="Titel Präsident">
              {(fieldId) => (
                <input
                  id={fieldId}
                  value={form.titles.president}
                  maxLength={30}
                  onChange={(e) => setTitle('president', e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="Titel Vize">
              {(fieldId) => (
                <input
                  id={fieldId}
                  value={form.titles.vice}
                  maxLength={30}
                  onChange={(e) => setTitle('vice', e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="Titel Diplomat">
              {(fieldId) => (
                <input
                  id={fieldId}
                  value={form.titles.diplomat}
                  maxLength={30}
                  onChange={(e) => setTitle('diplomat', e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
          </fieldset>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            Speichern
          </button>
        </form>
      )}

      {alliance.viewer.actions.manageBanner && (
        <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
          <h2 className="text-sm font-bold text-swu-primary">Allianzlogo</h2>
          {alliance.banner && (
            <img
              src={alliance.banner.url}
              alt={`Banner von ${alliance.name}`}
              className="h-auto max-w-full border border-swu-border"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <label className={`${buttonClass} cursor-pointer`}>
              {alliance.banner ? 'Banner ersetzen' : 'Banner hochladen'}
              <input
                type="file"
                accept="image/png"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  const upload = new FormData();
                  upload.append('file', file);
                  void run(() =>
                    api.postForm(`/alliances/${alliance.id}/banner`, upload),
                  );
                }}
              />
            </label>
            {alliance.banner && (
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
                onClick={() => {
                  if (!window.confirm('Das Banner wirklich entfernen?')) return;
                  void run(() =>
                    api.delete(`/alliances/${alliance.id}/banner`),
                  );
                }}
              >
                Banner entfernen
              </button>
            )}
          </div>
        </section>
      )}

      {alliance.members.some((member) =>
        Object.values(member.actions).some(Boolean),
      ) && (
        <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
          <h2 className="text-sm font-bold text-swu-primary">
            Mitgliederverwaltung
          </h2>
          <AllianceMembersSection
            title="Leitung"
            members={alliance.members.filter(
              (member) => member.role !== AllianceRole.NONE,
            )}
            actions={memberActions}
          />
          <AllianceMembersSection
            title="Mitglieder"
            members={alliance.members.filter(
              (member) => member.role === AllianceRole.NONE,
            )}
            actions={memberActions}
          />
        </section>
      )}

      {(alliance.viewer.actions.leave || alliance.viewer.actions.dissolve) && (
        <section className="space-y-3 border border-swu-danger/70 bg-swu-surface p-4">
          <h2 className="text-sm font-bold text-red-400">Gefahrenbereich</h2>
          <div className="flex flex-wrap gap-2">
            {alliance.viewer.actions.leave && (
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
                onClick={() => {
                  const last = alliance.memberCount === 1;
                  if (
                    !window.confirm(
                      last
                        ? `Du bist das letzte Mitglied. Mit dem Austritt wird ${alliance.name} aufgelöst. Fortfahren?`
                        : `${alliance.name} wirklich verlassen?`,
                    )
                  )
                    return;
                  void run(() => api.post('/alliances/leave', {}), 'list');
                }}
              >
                Allianz verlassen
              </button>
            )}
            {alliance.viewer.actions.dissolve && (
              <button
                type="button"
                disabled={busy}
                className={dangerButtonClass}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Die Allianz ${alliance.name} endgültig auflösen? Alle Mitglieder verlieren ihre Mitgliedschaft.`,
                    )
                  )
                    return;
                  void run(
                    () => api.delete(`/alliances/${alliance.id}`),
                    'list',
                  );
                }}
              >
                Allianz auflösen
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// --- Public Siedler diplomacy (part of the player profile) ---

/** Public active relationships, Vertragswerk and chronicle of an alliance-less player. */
export function SettlerPublicDiplomacy({ playerId }: { playerId: number }) {
  const [view, setView] = useState<SettlerPublicDiplomacyDto | null>(null);
  const [chronicle, setChronicle] =
    useState<AllianceDiplomacyChronicleDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Record<number, string>>({});
  const [contractError, setContractError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const base = `/alliances/settlers/${playerId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<SettlerPublicDiplomacyDto>(`${base}/diplomacy`),
      api.get<AllianceDiplomacyChronicleDto>(`${base}/diplomacy/chronicle`),
    ])
      .then(([diplomacy, history]) => {
        if (cancelled) return;
        setView(diplomacy);
        setChronicle(history);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setView(null);
        setError('Diplomatie konnte nicht geladen werden.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [base]);

  async function loadMore() {
    const cursor = chronicle?.nextCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const response = await api.get<AllianceDiplomacyChronicleDto>(
        `${base}/diplomacy/chronicle?cursor=${encodeURIComponent(cursor)}`,
      );
      setChronicle((current) =>
        current
          ? {
              entries: [...current.entries, ...response.entries],
              nextCursor: response.nextCursor,
            }
          : current,
      );
    } catch (err) {
      setLoadMoreError(
        getErrorMessage(
          err,
          'Weitere Chronik-Einträge konnten nicht geladen werden.',
        ),
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadContract(relationshipId: number) {
    setContractError(null);
    try {
      const result = await api.get<AllianceRelationshipContractDto>(
        `${base}/relationships/${relationshipId}/contract`,
      );
      setContracts((current) => ({
        ...current,
        [relationshipId]: result.contract,
      }));
    } catch (err) {
      setContractError(
        getErrorMessage(err, 'Das Vertragswerk konnte nicht geladen werden.'),
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-swu-muted">Diplomatie wird geladen...</p>;
  }
  if (error || !view) {
    return (
      <p role="alert" className="text-sm text-red-300">
        {error ?? 'Diplomatie konnte nicht geladen werden.'}
      </p>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold text-swu-primary">Diplomatie</h2>
      {view.relationships.length === 0 ? (
        <p className="text-sm italic text-swu-muted">
          Keine aktiven Beziehungen
        </p>
      ) : (
        <ul className="divide-y divide-swu-border/40">
          {view.relationships.map((relationship) => (
            <li key={relationship.id} className="space-y-2 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  to={
                    relationship.counterpartyType === DiplomacyPartyType.PLAYER
                      ? `/players/${relationship.counterparty.id}`
                      : `/alliances/${relationship.counterparty.id}`
                  }
                  className="font-bold text-swu-primary hover:text-swu-accent"
                  style={{
                    color: relationship.counterparty.color ?? undefined,
                  }}
                >
                  {relationship.counterparty.name}
                </Link>
                <span>{relationshipTypeLabel(relationship.type)}</span>
                <span className="text-xs text-swu-muted">
                  seit {dateFormatter.format(new Date(relationship.startedAt))}
                </span>
              </div>
              {relationship.hasContract && (
                <div className="space-y-2">
                  {contracts[relationship.id] === undefined ? (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => void loadContract(relationship.id)}
                    >
                      Vertragswerk anzeigen
                    </button>
                  ) : (
                    <BbCodeText
                      text={contracts[relationship.id]}
                      className="border border-swu-border/60 bg-swu-bg/50 p-3 text-sm whitespace-pre-wrap"
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {contractError && (
        <p role="alert" className="text-sm text-red-300">
          {contractError}
        </p>
      )}

      <h3 className="text-sm font-bold text-swu-primary">Diplomatie-Chronik</h3>
      {chronicle?.entries.length ? (
        <ol className="space-y-2 text-sm">
          {chronicle.entries.map((entry) => (
            <li key={entry.id} className="border-l-2 border-swu-border pl-3">
              <p className="font-medium text-swu-text">
                {chronicleEventLabel(entry)}: {entry.firstAlliance.name} –{' '}
                {entry.secondAlliance.name}
              </p>
              <p className="text-xs text-swu-muted">
                {entry.actor?.name ?? 'Unbekannt'} ·{' '}
                {dateFormatter.format(new Date(entry.occurredAt))}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm italic text-swu-muted">
          Keine öffentlichen Diplomatieereignisse vorhanden
        </p>
      )}
      {loadMoreError && (
        <p role="alert" className="text-sm text-red-300">
          {loadMoreError}
        </p>
      )}
      {chronicle?.nextCursor && (
        <button
          type="button"
          disabled={loadingMore}
          className={buttonClass}
          onClick={() => void loadMore()}
        >
          {loadingMore
            ? 'Ältere Ereignisse werden geladen...'
            : 'Ältere Ereignisse laden'}
        </button>
      )}
    </section>
  );
}
