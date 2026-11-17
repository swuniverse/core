import {
  InfoSection,
  OperatorPlaceholder,
  PublicInfoLayout,
} from '../components/legal/PublicInfoLayout';

export function PrivacyPage() {
  return (
    <PublicInfoLayout title="Datenschutzerklärung" eyebrow="DATENSCHUTZ">
      <p className="border border-amber-400/50 bg-amber-400/10 p-3 text-amber-100">
        Die hervorgehobenen Betreiberangaben sind Platzhalter und müssen vor einem
        öffentlichen Betrieb ersetzt werden.
      </p>

      <InfoSection title="1. Verantwortlicher">
        <p>
          <OperatorPlaceholder>[[BETREIBER: Name]]</OperatorPlaceholder>,{' '}
          <OperatorPlaceholder>[[BETREIBER: Anschrift]]</OperatorPlaceholder>
          <br />
          Kontakt: <OperatorPlaceholder>[[BETREIBER: E-Mail-Adresse]]</OperatorPlaceholder>
        </p>
      </InfoSection>

      <InfoSection title="2. Verarbeitete Daten">
        <p>
          Wir verarbeiten die bei der Registrierung angegebenen Kontodaten einschließlich
          Benutzername und E-Mail-Adresse, Authentifizierungs- und Sicherheitshinweise,
          den im Spiel erzeugten Spielstand, Nachrichten und sonstige freiwillig
          eingestellte Inhalte sowie die letzte Aktivität. Beim Zugriff können Server-Logs
          mit IP-Adresse, Zeitpunkt, aufgerufener Ressource, Browserkennung und
          Fehlerangaben entstehen.
        </p>
      </InfoSection>

      <InfoSection title="3. Zwecke und Rechtsgrundlagen">
        <p>
          Die Datenverarbeitung dient der Einrichtung und Durchführung des Spielkontos,
          der Bereitstellung der persistenten Spielwelt, der Kommunikation zwischen
          Spielern, der technischen Sicherheit und Fehleranalyse sowie der Bearbeitung
          von Supportanfragen. Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. b
          DSGVO für die Bereitstellung des Spiels und Art. 6 Abs. 1 lit. f DSGVO für
          Betriebssicherheit und Missbrauchsprävention. Soweit eine Einwilligung eingeholt
          wird, beruht die Verarbeitung auf Art. 6 Abs. 1 lit. a DSGVO.
        </p>
      </InfoSection>

      <InfoSection title="4. Speicherdauer und Inaktivitätslöschung">
        <p>
          Kontodaten und Spielstände werden grundsätzlich für die Dauer des Spielkontos
          gespeichert. Inaktive und unbestätigte Konten werden nach den geltenden Fristen
          und vorheriger Ankündigung automatisch gelöscht. Server-Logs
          werden nur so lange aufbewahrt, wie dies für Sicherheit und Fehleranalyse
          erforderlich ist. Gesetzliche Aufbewahrungspflichten bleiben unberührt.
        </p>
      </InfoSection>

      <InfoSection title="5. E-Mail-Versand">
        <p>
          E-Mails werden für E-Mail-Bestätigung, Passwort-Wiederherstellung sowie
          Sicherheits- und Kontohinweise versandt. Nachrichtenbenachrichtigungen
          berücksichtigen die persönlichen Einstellungen. Eine
          werbliche Nutzung erfolgt nicht ohne gesonderte Einwilligung.
        </p>
      </InfoSection>

      <InfoSection title="6. Empfänger und Übermittlung">
        <p>
          Daten werden nicht verkauft. Technische Dienstleister erhalten Daten nur,
          soweit dies für Hosting, Mailversand oder Betrieb notwendig und rechtlich
          abgesichert ist. Eine Übermittlung an Behörden erfolgt nur bei gesetzlicher
          Verpflichtung.
        </p>
      </InfoSection>

      <InfoSection title="7. Rechte betroffener Personen">
        <p>
          Betroffene Personen haben nach Maßgabe der DSGVO das Recht auf Auskunft,
          Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
          und Widerspruch. Eine Einwilligung kann jederzeit mit Wirkung für die Zukunft
          widerrufen werden. Außerdem besteht ein Beschwerderecht bei einer zuständigen
          Datenschutzaufsichtsbehörde. Anfragen können an die oben genannte Kontaktadresse
          gerichtet werden.
        </p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
