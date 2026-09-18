## Browservergleich: zusätzliche Befunde

### STU-Schiffdetailseite

STU verwendet eine sehr dichte, tabellarische Drei-Spaltenstruktur:

```text
Schiffskopf
├── Aktionen
├── Module als Iconleiste
├── Systemzustand als Iconleiste
├── Navigation/LSS
├── Feld-/Koloniekontext
└── Reaktor, Batterie, Lager
```

Direkt beobachtet:

- Kommandos befinden sich in einer kompakten Toolbar.
- Verbaute Module sind eine durchgehende 20px-Iconleiste mit Tooltipnamen.
- Laufzeitsysteme sind eine zweite Iconleiste mit Icon und Status/Tooltip.
- Navigation ist in einem kleinen Raster integriert.
- Koloniebox und Systembox befinden sich direkt im Navigationskontext.
- Lagerraum ist kompakt und zeigt primär Icons/Mengen.

SWU ist funktional vergleichbar, aber stärker in eigenständige Cards getrennt. Das ist responsiver, erzeugt aber mehr vertikalen Raum und weniger STU-Informationsdichte.

### STU-Kolonieliste vs. SWU-Kolonieliste

STU zeigt in der Übersicht zusätzlich:

- Signaturen;
- Crewman;
- Bevölkerung;
- Energie;
- Lager;
- Planet-/Systemkontext in derselben Namenszelle.

SWU zeigt aktuell:

- Koloniename;
- Planetname;
- Crew;
- Bevölkerung;
- Energie;
- Lager;
- Produktionsübersicht darunter.

Konkrete Differenz:

```text
STU: Signaturen-Spalte fehlt bei SWU.
SWU: Produktionsübersicht ist sichtbarer und moderner strukturiert.
```

Empfehlung: Signaturen später ergänzen, sobald Kolonie-/Orbit-Signaturen ein echtes Modell besitzen. Keine Fakezahl einführen.

### STU-Orbitansicht

STU rendert eine Orbit-Schiffskarte als vollständigen klickbaren Tabellenkasten:

- Name und Besitzer als Link zum Schiff;
- Schiffbild;
- Hülle;
- Schilde;
- EPS;
- Hyperantrieb;
- Crew;
- Transferpfeile separat;
- Schiffsliste separat;
- Orbitalmanagement separat.

SWU ist diesem Muster inzwischen nahe:

- kompakte Orbitkarte;
- eigene Schiffskarte verlinkt zur Schiffdetailseite;
- Transferaktionen außerhalb des Kartenlinks;
- Auswahlmodal bleibt Auswahlmodal.

Noch sichtbar:

- STU zeigt mehr Werte direkt auf der Orbitkarte.
- SWU verwendet größere Status-Chips.
- SWU nutzt `IDLE` technisch korrekt; STU benutzt keinen falschen allgemeinen Dockingstatus.

### STU-Lagerraum

STU nutzt eine sehr kompakte zweispaltige Icon-/Mengenansicht:

```text
[Icon] 1     [Icon] 1
[Icon] 1     [Icon] 1
```

Namen sind hauptsächlich Tooltipinformationen.

SWU wurde bereits auf ein flexibles Icon-/Mengenraster umgestellt. Der Backend-Cargoendpoint liefert jetzt benannte Waren; dadurch ist die Darstellung fachlich konsistent.

### Browserzugang / technische Einschränkung

Die lokale Browserprüfung funktioniert für STU und SWU. STU-Schiff- und Kolonieansichten konnten vollständig inspiziert werden.

Die SWU-Schiffdetailseite blieb während eines Browserlaufs bei `Schiff wird geladen...`, obwohl die Schiffsliste und Kolonieübersicht funktionierten. Das deutet auf eine separate API-/Datenantwort oder einen laufenden Request für genau diese Schiffroute hin. Die bestehenden Quellcode-/Testprüfungen bleiben für die UI-Bewertung ergänzend notwendig.

---

## Konkrete spätere UI-Arbeitspakete

### P1 – Schiffsliste verdichten

- Signaturen nur mit echtem Signaturmodell ergänzen.
- Reaktortreibstoff und Batterie als kompakte Zusatzwerte prüfen.
- Laufzeitsysteme als kleine Iconleiste ergänzen.
- STU-ähnliche Statusdichte ohne Desktop-Überbreite herstellen.

### P1 – Schiffdetailseite

- Abstände zwischen Cards bei Desktop reduzieren.
- Toolbar-/Iconleisten weiter als kompakte Gruppen behandeln.
- Reaktor-, Navigation- und Feldkontextbreiten aneinander ausrichten.
- Mobile Darstellung weiter mit STU-Dichte vergleichen.

### P1 – System-/API-Robustheit

- Schiffdetail-API im Browser mit Network-/Responsedaten prüfen.
- Systemeintritt immer ausschließlich aus aktuellem Galaxiefeld bestimmen.
- Alte `starSystem`-Relationen außerhalb von Systemen bereinigen.
- `entrySystem` und sichtbarer Buttonname synchron halten.

### P2 – Orbit

- Hyperantriebs-/Batteriewerte in der kompakten Orbitkarte ergänzen.
- Status-Chips kleiner und tabellarischer machen.
- Fremd-/Eigenstatus optisch wie STU neben den Namen setzen.

### P2 – Kolonien

- Signaturen-Spalte erst mit echtem Modell ergänzen.
- Planet/System/Colony-Name in der Tabellenzeile weiter STU-kompakt zusammenhalten.
- Ruinenstatus in Liste und Planetbox klar sichtbar machen.

### P3 – Spätere Mechaniken

- Scan-Logbuch-Snapshot;
- Tarn-/Tachyon-Signaturen;
- Anomalien und Bojen;
- echte Stationen und Docking;
- Shuttle-/Landeablauf;
- Intercept/Tracking.
