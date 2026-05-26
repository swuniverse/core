# ShipSystemInstance Anschlussplanung

Status: Folgeplanung nach Post-Onboarding-Core-Loop. In diesem Sprint nicht implementieren.

## Ziel

`SpacecraftModule` bleibt aktuell installierte Ausrüstung. `ShipSystemInstance` wird später die Runtime-Schicht für STU-artige Schiffssysteme:

- Zustand eines Systems pro Schiff
- Aktivierung/Deaktivierung
- Gesundheit/Schaden
- Energieverbrauch
- Cooldowns und Spezialzustände

## Vorgeschlagene Entity

```ts
@Entity('ship_system_instances')
@Index(['spacecraftId', 'systemKey'], { unique: true })
export class ShipSystemInstance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column({ length: 64 })
  systemKey: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  moduleType: string | null;

  @Column({ default: 100 })
  health: number;

  @Column({ default: 100 })
  maxHealth: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: 0 })
  energyUse: number;

  @Column({ default: 0 })
  cooldown: number;

  @Column({ type: 'jsonb', default: {} })
  statePayload: Record<string, unknown>;
}
```

## Erste Systemkeys für später gebaute Schiffe

- `HULL`
- `EPS`
- `IMPULSE`
- `HYPERDRIVE`
- `SHIELDS`
- `SENSORS`
- `CARGO`
- `LIFE_SUPPORT`
- `WEAPON_PRIMARY`

## Seed-/Erzeugungslogik

Beim späteren Schiffbau:

1. `Spacecraft` erstellen.
2. Module/ShipClassDef lesen.
3. Basissysteme aus ShipClassDef und Standardmodulen ableiten.
4. `ShipSystemInstance` für jeden Systemkey anlegen.
5. `ShipDetailDTOv2` auf Systems-Projektion umstellen.

## Migration

Additive Migration:

- Tabelle `ship_system_instances`
- Unique Index `(spacecraftId, systemKey)`
- FK zu `spacecraft(id)` mit Cascade Delete

Keine bestehende `spacecraft_modules`-Tabelle entfernen.

## Nicht in diesem Sprint

- Keine Combat-Umschaltung auf `ShipSystemInstance`
- Keine Movement-Checks über Systeme
- Keine Energieverbrauch-Tick-Handler
- Keine Migration/Entity-Registrierung

Erst nach stabilem Pfad: Homeworld → Forschung → Werfthub → erstes Schiff.
