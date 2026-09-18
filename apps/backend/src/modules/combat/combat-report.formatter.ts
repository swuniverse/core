import { Injectable } from '@nestjs/common';
import { CombatAction, CombatResult } from './combat.engine';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';

@Injectable()
export class CombatReportFormatter {
  format(result: CombatResult, attacker: Spacecraft, defender: Spacecraft) {
    const names = { attacker: attacker.name, defender: defender.name };
    return {
      attacker: { id: attacker.id, name: attacker.name },
      defender: { id: defender.id, name: defender.name },
      rounds: result.rounds.map((round) => ({
        number: round.round,
        lines: round.log.map((entry) => ({
          kind: entry.action,
          text: this.line(entry, names),
          emphasis: [
            CombatAction.DESTROYED,
            CombatAction.SYSTEM_DAMAGED,
            CombatAction.SYSTEM_DISABLED,
          ].includes(entry.action)
            ? 'critical'
            : [CombatAction.HULL_DAMAGE, CombatAction.CRITICAL_HIT].includes(
                  entry.action,
                )
              ? 'warning'
              : 'neutral',
        })),
      })),
      outcome: {
        winner: result.winner,
        attackerDestroyed: result.attackerDestroyed,
        defenderDestroyed: result.defenderDestroyed,
      },
    };
  }

  private line(
    entry: CombatResult['rounds'][number]['log'][number],
    names: Record<'attacker' | 'defender', string>,
  ) {
    const source = names[entry.source];
    const target = entry.target ? names[entry.target] : names[entry.source];
    switch (entry.action) {
      case CombatAction.ENERGY_HIT:
        return `${source} feuert mit ${entry.weapon} auf ${target}.`;
      case CombatAction.PROJECTILE_HIT:
        return `${source} feuert einen ${entry.weapon} auf ${target}.`;
      case CombatAction.ENERGY_MISS:
        return `${source} feuert mit ${entry.weapon} auf ${target}, verfehlt jedoch.`;
      case CombatAction.PROJECTILE_MISS:
        return `${source} feuert einen ${entry.weapon} auf ${target}, verfehlt jedoch.`;
      case CombatAction.SHIELD_ABSORB:
        return `Schildschaden: ${entry.value ?? 0} · Status: ${entry.remaining ?? 0}`;
      case CombatAction.HULL_DAMAGE:
        return `Hüllenschaden: ${entry.value ?? 0} · Status: ${entry.remaining ?? 0}`;
      case CombatAction.SYSTEM_DAMAGED:
        return `Folgendes System wurde beschädigt: ${entry.detail ?? 'Unbekannt'}`;
      case CombatAction.SYSTEM_DISABLED:
        return `Folgendes System wurde deaktiviert: ${entry.detail ?? 'Unbekannt'}`;
      case CombatAction.CRITICAL_HIT:
        return `Kritischer Treffer!`;
      case CombatAction.ARMOR_ABSORB:
        return `Panzerung absorbiert ${entry.value ?? 0} Schaden.`;
      case CombatAction.SHIELD_REGEN:
        return `${source} regeneriert ${entry.value ?? 0} Schildenergie.`;
      case CombatAction.DESTROYED:
        return `${source} wurde zerstört.`;
      default:
        return entry.detail ?? entry.action;
    }
  }
}
