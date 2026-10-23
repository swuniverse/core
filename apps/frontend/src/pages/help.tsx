import { InfoSection, PublicInfoLayout } from '../components/legal/PublicInfoLayout';

const WIKI_URL = 'https://wiki.swuniverse.net';
const DISCORD_URL = 'https://discord.com/invite/vvUwR6UZbB';

export function HelpPage() {
  return (
    <PublicInfoLayout title="Hilfe" eyebrow="ERSTE SCHRITTE">
      <p>
        Du brauchst Hilfe? Keine Panik. Diese Kurzanleitung führt durch die wichtigsten
        Spielbereiche. Ausführliche Daten und Tipps findest du im{' '}
        <a className="text-swu-accent underline" href={WIKI_URL} target="_blank" rel="noopener noreferrer">
          Wiki
        </a>{' '}
        und Unterstützung aus der Community im{' '}
        <a className="text-swu-accent underline" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
          Discord
        </a>.
      </p>

      <InfoSection title="1. Registrierung und Fraktion">
        <p>
          Lege ein Konto an, wähle ein sicheres Passwort und entscheide dich für die
          Rebellenallianz oder das Galaktische Imperium. Deine Fraktion bestimmt deine
          Seite im galaktischen Konflikt.
        </p>
      </InfoSection>

      <InfoSection title="2. Heimatwelt beanspruchen">
        <p>
          Nach dem ersten Login führt dich die Heimatwelt-Auswahl zu deiner ersten
          Kolonie. Prüfe Standort und Planetenklasse und beanspruche anschließend die Welt.
        </p>
      </InfoSection>

      <InfoSection title="3. Kolonie entwickeln">
        <p>
          Baue Energieversorgung, Lager und Produktionsgebäude auf geeigneten Feldern.
          Behalte Energie, Bevölkerung, Arbeiter und Waren im Blick; der Haupttick führt
          Bauaufträge und Produktion weiter.
        </p>
      </InfoSection>

      <InfoSection title="4. Forschung planen">
        <p>
          Forschung schaltet neue Gebäude, Schiffsklassen und Systeme frei. Wähle ein
          Forschungsziel; die Queue plant fehlende Voraussetzungen und arbeitet sie
          nacheinander ab.
        </p>
      </InfoSection>

      <InfoSection title="5. Schiffe einsetzen">
        <p>
          Baue Schiffe in einer aktiven Werft, weise Crew zu und prüfe Energie, Hülle,
          Schilde und Systeme. Nutze Sensoren und die Karte, bevor du navigierst oder einen
          Kampf beginnst.
        </p>
      </InfoSection>

      <InfoSection title="6. HoloNet nutzen">
        <p>
          Im HoloNet veröffentlichst du Nachrichten und Diskussionen für die Community.
          Persönliche Nachrichten eignen sich für direkte Absprachen mit anderen Spielern.
        </p>
      </InfoSection>

      <InfoSection title="7. Allianz finden">
        <p>
          Eine Allianz verbindet Spieler derselben Fraktion. Du kannst dich bewerben oder
          selbst eine Allianz gründen. Präsident, Vize und Diplomat verwalten Mitglieder,
          Ämter und diplomatische Beziehungen.
        </p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
