import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AllianceRelationshipType,
  AllianceRole,
  type AllianceApplicationDto,
  type AllianceDetailDto,
  type AllianceMemberDto,
  type AllianceRelationshipContractDto,
  type AllianceRelationshipProposalDto,
  type AllianceRelationshipSummaryDto,
  type AllianceSummaryDto,
  type MyAllianceDto,
  type UpdateAllianceRequest,
} from '@swuniverse/shared';
import { BbCodeText } from '../components/BbCodeText';
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

// --- List ---

export function AllianceListPage() {
  const [alliances, setAlliances] = useState<AllianceSummaryDto[] | null>(null);
  const [mine, setMine] = useState<MyAllianceDto['alliance']>(null);
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
        <div className="overflow-x-auto border border-swu-border bg-swu-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-swu-border text-xs uppercase tracking-wider text-swu-muted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Fraktion</th>
                <th className="px-3 py-2 text-right">Mitglieder</th>
                <th className="px-3 py-2">Aufnahme</th>
              </tr>
            </thead>
            <tbody>
              {alliances.map((alliance) => (
                <tr
                  key={alliance.id}
                  data-alliance-color={alliance.color ?? undefined}
                  className="border-b border-swu-border/40 last:border-0"
                >
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full border border-swu-border"
                        style={{
                          backgroundColor: alliance.color ?? 'transparent',
                        }}
                      />
                      <Link
                        to={`/alliances/${alliance.id}`}
                        className="font-bold text-swu-primary hover:text-swu-accent"
                        style={{ color: alliance.color ?? undefined }}
                      >
                        {alliance.name}
                      </Link>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-swu-muted">
                    {alliance.factionName}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {alliance.memberCount}
                  </td>
                  <td className="px-3 py-2 text-swu-muted">
                    {alliance.acceptsApplications ? 'offen' : 'geschlossen'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <BackLink to="/alliances" label="Allianzen" />
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

export function AllianceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alliance, loadError, reload } = useAllianceDetail(id);
  const [applications, setApplications] = useState<AllianceApplicationDto[]>(
    [],
  );
  const [proposals, setProposals] = useState<AllianceRelationshipProposalDto[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contracts, setContracts] = useState<Record<number, string>>({});
  const [loadingContractId, setLoadingContractId] = useState<number | null>(
    null,
  );
  const [warTargetId, setWarTargetId] = useState('');
  const [proposalRecipientId, setProposalRecipientId] = useState('');
  const [proposalType, setProposalType] = useState<AllianceRelationshipType>(
    AllianceRelationshipType.FRIENDSHIP,
  );
  const [proposalContract, setProposalContract] = useState('');
  const [proposalTreatAsFriend, setProposalTreatAsFriend] = useState(false);
  const [proposalShareLivePositions, setProposalShareLivePositions] =
    useState(false);

  const canManageApplications =
    alliance?.viewer.actions.manageApplications ?? false;
  const canManageDiplomacy = alliance?.viewer.actions.manageDiplomacy ?? false;

  const reloadProposals = useCallback(async () => {
    if (!id || !canManageDiplomacy) {
      setProposals([]);
      return;
    }
    setProposals(
      await api.get<AllianceRelationshipProposalDto[]>(
        `/alliances/${id}/diplomacy/proposals`,
      ),
    );
  }, [id, canManageDiplomacy]);

  useEffect(() => {
    void reloadProposals().catch(() => undefined);
  }, [reloadProposals]);

  const reloadApplications = useCallback(async () => {
    if (!id || !canManageApplications) {
      setApplications([]);
      return;
    }
    setApplications(
      await api.get<AllianceApplicationDto[]>(`/alliances/${id}/applications`),
    );
  }, [id, canManageApplications]);

  useEffect(() => {
    void reloadApplications().catch(() => undefined);
  }, [reloadApplications]);

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

  async function run(
    action: () => Promise<unknown>,
    after: 'reload' | 'list' = 'reload',
  ) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (after === 'list') {
        navigate('/alliances');
        return;
      }
      await Promise.all([reload(), reloadApplications(), reloadProposals()]);
    } catch (err) {
      setError(getErrorMessage(err, 'Die Aktion ist fehlgeschlagen.'));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4 p-3 md:p-6">
        <BackLink to="/alliances" label="Allianzen" />
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
            api.put(`${base}/members/${member.userId}/role`, { role }),
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
                `${base}/members/${member.userId}/transfer-presidency`,
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
            void run(() => api.delete(`${base}/members/${member.userId}`));
          }}
        >
          Rauswerfen
        </button>,
      );
    }
    return buttons;
  };

  return (
    <div className="space-y-4 p-3 md:p-6">
      <BackLink to="/alliances" label="Allianzen" />

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
            {actions.editDetails && (
              <Link to={`${base}/edit`} className={buttonClass}>
                Bearbeiten
              </Link>
            )}
            {actions.declareWar && (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!warTargetId) return;
                  void run(() =>
                    api.post(`${base}/relationships/${warTargetId}/war`, {}),
                  );
                }}
              >
                <label className="sr-only" htmlFor="war-target-alliance">
                  Zielallianz
                </label>
                <select
                  id="war-target-alliance"
                  value={warTargetId}
                  disabled={busy}
                  onChange={(event) => setWarTargetId(event.target.value)}
                  className="border border-swu-border bg-swu-bg px-2 py-1 text-xs"
                >
                  <option value="">Zielallianz wählen</option>
                  {actions.warTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busy || !warTargetId}
                  className={dangerButtonClass}
                >
                  Krieg erklären
                </button>
              </form>
            )}
            {actions.leave && (
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
            {actions.dissolve && (
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
                  void run(() => api.delete(base), 'list');
                }}
              >
                Allianz auflösen
              </button>
            )}
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-swu-muted">Fraktion</dt>
          <dd className="text-swu-primary">{alliance.factionName}</dd>
          <dt className="text-swu-muted">Gegründet</dt>
          <dd>{dateFormatter.format(new Date(alliance.foundedAt))}</dd>
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
        <ErrorMessage message={error} />
      </section>

      <section className="border border-swu-border bg-swu-surface p-4">
        {alliance.renderedDescription.trim() ? (
          <BbCodeText
            text={alliance.renderedDescription}
            className="text-sm text-swu-text whitespace-pre-wrap"
          />
        ) : (
          <p className="text-sm italic text-swu-muted">
            Keine Allianz-Beschreibung hinterlegt
          </p>
        )}
      </section>

      {canManageDiplomacy && (
        <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
          <h2 className="text-sm font-bold text-swu-primary">
            Vertrauliche Beziehungsvorschläge
          </h2>
          <form
            className="grid gap-3 border border-swu-border/60 bg-swu-bg/40 p-3 text-sm md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!proposalRecipientId) return;
              void run(async () => {
                await api.post(`${base}/diplomacy/proposals`, {
                  recipientAllianceId: Number(proposalRecipientId),
                  type: proposalType,
                  contract: proposalContract,
                  permissions: {
                    treatAsFriend: proposalTreatAsFriend,
                    shareLivePositions:
                      proposalType === 'ALLIANCE' && proposalShareLivePositions,
                  },
                });
                setProposalContract('');
                setProposalTreatAsFriend(false);
                setProposalShareLivePositions(false);
              });
            }}
          >
            <label className="space-y-1">
              <span className="text-swu-muted">Empfängerallianz</span>
              <select
                value={proposalRecipientId}
                disabled={busy}
                onChange={(event) => setProposalRecipientId(event.target.value)}
                className={inputClass}
              >
                <option value="">Zielallianz wählen</option>
                {actions.warTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-swu-muted">Beziehungsart</span>
              <select
                value={proposalType}
                disabled={busy}
                onChange={(event) => {
                  const type = event.target.value as AllianceRelationshipType;
                  setProposalType(type);
                  if (type !== 'ALLIANCE') setProposalShareLivePositions(false);
                }}
                className={inputClass}
              >
                <option value="FRIENDSHIP">Freundschaft</option>
                <option value="ALLIANCE">Bündnis</option>
                <option value="TRADE_AGREEMENT">Handelsabkommen</option>
                <option value="VASSALAGE">Vasallenschaft</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-swu-muted">Vertragstext</span>
              <textarea
                value={proposalContract}
                disabled={busy}
                maxLength={20_000}
                rows={4}
                onChange={(event) => setProposalContract(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-swu-muted">
              <input
                type="checkbox"
                checked={proposalTreatAsFriend}
                disabled={busy}
                onChange={(event) =>
                  setProposalTreatAsFriend(event.target.checked)
                }
              />
              Als Freund behandeln
            </label>
            <label className="flex items-center gap-2 text-xs text-swu-muted">
              <input
                type="checkbox"
                checked={proposalShareLivePositions}
                disabled={busy || proposalType !== 'ALLIANCE'}
                onChange={(event) =>
                  setProposalShareLivePositions(event.target.checked)
                }
              />
              Live-Kartenpositionen teilen (nur Bündnis)
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy || !proposalRecipientId}
                className={primaryButtonClass}
              >
                Vorschlag senden
              </button>
            </div>
          </form>
          {proposals.length > 0 && (
            <ul className="divide-y divide-swu-border/40">
              {proposals.map((proposal) => {
                const received = proposal.recipientAllianceId === alliance.id;
                return (
                  <li key={proposal.id} className="space-y-2 py-3 text-sm">
                    <p>
                      {received ? 'Eingegangen' : 'Gesendet'}:{' '}
                      {relationshipTypeLabel(proposal.type)}
                    </p>
                    {proposal.contract && (
                      <BbCodeText
                        text={proposal.contract}
                        className="text-sm text-swu-text whitespace-pre-wrap"
                      />
                    )}
                    <div className="flex flex-wrap gap-2">
                      {received ? (
                        <>
                          <button
                            type="button"
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
                          <button
                            type="button"
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
                        </>
                      ) : (
                        <button
                          type="button"
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
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

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
                      to={`/alliances/${relationship.counterparty.id}`}
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

      {canManageApplications && (
        <section className="space-y-2 border border-swu-border bg-swu-surface p-4">
          <h2 className="text-sm font-bold text-swu-primary">Bewerbungen</h2>
          {applications.length === 0 ? (
            <p className="text-sm italic text-swu-muted">
              Keine offenen Bewerbungen
            </p>
          ) : (
            <ul className="divide-y divide-swu-border/40">
              {applications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center gap-3 py-2 text-sm"
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
        </section>
      )}

      <section className="space-y-2 border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold text-swu-primary">
          Mitglieder{' '}
          <span className="font-normal text-swu-muted">
            ({alliance.memberCount})
          </span>
        </h2>
        <ul className="divide-y divide-swu-border/40">
          {alliance.members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center gap-3 py-2 text-sm"
            >
              <Link
                to={`/players/${member.userId}`}
                className="font-bold text-swu-primary hover:text-swu-accent"
              >
                {member.name}
              </Link>
              {member.roleTitle && (
                <span className="border border-swu-accent/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-swu-accent">
                  {member.roleTitle}
                </span>
              )}
              <span className="ml-auto flex flex-wrap gap-2">
                {memberActions(member)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// --- Edit ---

export function AllianceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alliance, loadError } = useAllianceDetail(id);
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
        <BackLink to="/alliances" label="Allianzen" />
        <p className="text-swu-muted">{loadError}</p>
      </div>
    );
  }
  if (!alliance || !form) {
    return (
      <div className="p-3 text-swu-muted md:p-6">Allianz wird geladen...</div>
    );
  }
  if (!alliance.viewer.actions.editDetails) {
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

  return (
    <div className="max-w-2xl space-y-4 p-3 md:p-6">
      <BackLink to={`/alliances/${alliance.id}`} label={alliance.name} />
      <PageTitle>Allianz bearbeiten</PageTitle>
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
        <ErrorMessage message={error} />
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          Speichern
        </button>
      </form>
    </div>
  );
}
