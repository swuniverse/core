import {
  InfoSection,
  OperatorPlaceholder,
  PublicInfoLayout,
} from '../components/legal/PublicInfoLayout';

export function ImprintPage() {
  return (
    <PublicInfoLayout title="Impressum" eyebrow="RECHTLICHE INFORMATIONEN">
      <p className="border border-amber-400/50 bg-amber-400/10 p-3 text-amber-100">
        Die hervorgehobenen Angaben sind Betreiber-Platzhalter und müssen vor einem
        öffentlichen Betrieb ersetzt werden.
      </p>

      <InfoSection title="Angaben gemäß § 5 DDG">
        <address className="not-italic">
          <OperatorPlaceholder>[[BETREIBER: Name]]</OperatorPlaceholder>
          <br />
          <OperatorPlaceholder>[[BETREIBER: Straße und Hausnummer]]</OperatorPlaceholder>
          <br />
          <OperatorPlaceholder>[[BETREIBER: Postleitzahl und Ort]]</OperatorPlaceholder>
          <br />
          <OperatorPlaceholder>[[BETREIBER: Land]]</OperatorPlaceholder>
        </address>
      </InfoSection>

      <InfoSection title="Kontakt">
        <p>
          E-Mail: <OperatorPlaceholder>[[BETREIBER: E-Mail-Adresse]]</OperatorPlaceholder>
          <br />
          Telefon: <OperatorPlaceholder>[[BETREIBER: Telefonnummer]]</OperatorPlaceholder>
        </p>
      </InfoSection>

      <InfoSection title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <address className="not-italic">
          <OperatorPlaceholder>[[BETREIBER: Verantwortliche Person]]</OperatorPlaceholder>
          <br />
          <OperatorPlaceholder>[[BETREIBER: Anschrift der verantwortlichen Person]]</OperatorPlaceholder>
        </address>
      </InfoSection>

      <InfoSection title="Hinweis zum Fan-Projekt">
        <p>
          Star Wars und die zugehörigen Namen, Figuren und Kennzeichen sind Marken
          beziehungsweise Eigentum von Lucasfilm Ltd. Dieses nicht kommerzielle
          Fan-Projekt steht in keiner Verbindung zu Lucasfilm Ltd. oder The Walt Disney
          Company und wird von diesen weder betrieben noch unterstützt.
        </p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
