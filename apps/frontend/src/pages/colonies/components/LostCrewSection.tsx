import { useState } from 'react';
import type {
  LostCrewPodDto,
  LostCrewTradePostDto,
  LostCrewShipDto,
} from '@swuniverse/shared';
import { api } from '../../../services/api';

/** "Verschollene Crew": escape pods that hold crew of the player. */
export function LostCrewSection() {
  const [pods, setPods] = useState<LostCrewPodDto[] | null>(null);
  const [posts, setPosts] = useState<LostCrewTradePostDto[]>([]);
  const [ships, setShips] = useState<LostCrewShipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (pods) {
      setPods(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [pods, posts, ships] = await Promise.all([
        api.get<LostCrewPodDto[]>('/spacecraft/lost-crew'),
        api.get<LostCrewTradePostDto[]>('/spacecraft/lost-crew/trade-posts'),
        api.get<LostCrewShipDto[]>('/spacecraft/lost-crew/ships'),
      ]);
      setPods(pods);
      setPosts(posts);
      setShips(ships);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Verschollene Crew nicht verfügbar',
      );
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (member: LostCrewShipDto) => {
    setLoading(true);
    setError(null);
    try {
      await api.post(
        `/spacecraft/${member.shipId}/crew/${member.crewId}/release`,
        {},
      );
      setShips(await api.get<LostCrewShipDto[]>('/spacecraft/lost-crew/ships'));
      setPods(await api.get<LostCrewPodDto[]>('/spacecraft/lost-crew'));
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Crew konnte nicht abgezogen werden',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-swu-border bg-swu-surface px-2 py-1.5 text-xs space-y-1">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="text-[10px] font-bold text-swu-accent uppercase hover:underline"
      >
        Verschollene Crew
      </button>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {pods &&
        pods.length === 0 &&
        posts.length === 0 &&
        ships.length === 0 && (
          <p className="text-[10px] text-swu-muted">
            Keine deiner Crewmitglieder ist verschollen.
          </p>
        )}
      {pods && pods.length > 0 && (
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left text-swu-muted">
              <th>Kapsel</th>
              <th>Herkunft</th>
              <th>Crew</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr key={pod.podId}>
                <td>{pod.displayName}</td>
                <td>{pod.originShipName}</td>
                <td className="font-mono">{pod.crewCount}</td>
                <td className="font-mono">
                  {pod.location
                    ? pod.location.scope === 'SYSTEM'
                      ? `System ${pod.location.systemId} (${pod.location.x}|${pod.location.y})`
                      : `${pod.location.x}|${pod.location.y}`
                    : '?'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pods && posts.length > 0 && (
        <section aria-label="Crew an Handelsposten">
          <h3 className="font-bold">Handelsposten</h3>
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th>Posten</th>
                <th>Crew</th>
                <th>Sektor</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.tradePostId}>
                  <td>{post.name}</td>
                  <td>{post.crewCount}</td>
                  <td>
                    {post.location
                      ? `${post.location.x}|${post.location.y}`
                      : '?'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {pods && ships.length > 0 && (
        <section aria-label="Crew auf fremden Schiffen">
          <h3 className="font-bold">Crew auf fremden Schiffen</h3>
          {ships.map((member) => (
            <div key={member.crewId}>
              {member.name} · {member.shipName}{' '}
              <button
                disabled={loading}
                onClick={() => void withdraw(member)}
                aria-label={`${member.name} abziehen`}
                className="text-swu-accent"
              >
                Abziehen
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
