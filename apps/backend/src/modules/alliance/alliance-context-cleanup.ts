/**
 * Narrow port for consumers outside the alliance module (future depot and
 * access-privilege systems) that hold data tied to an alliance context.
 *
 * Callbacks run inside the transaction of the lifecycle event that caused
 * them. A consumer that throws aborts that transaction, so no partial state
 * remains. Consumers that write must use `transaction` (for the TypeORM store
 * an `EntityManager`) to join it. Without registered consumers the port is a
 * no-op. Contract: `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`
 * ("Integrationsvertrag: Allianzdepots" and "Zugangsprivilegien").
 */
/** Handle of the surrounding transaction; opaque to the alliance module. */
export type AllianceTransactionHandle = unknown;

export interface AllianceContextCleanupContext {
  transaction: AllianceTransactionHandle;
}

export interface AllianceDissolvedEvent {
  allianceId: number;
  memberUserIds: number[];
}

export interface AllianceMemberRemovedEvent {
  allianceId: number;
  userId: number;
}

export interface AllianceContextCleanupConsumer {
  /** The alliance is being dissolved; all its members lose the context. */
  allianceDissolved?(
    event: AllianceDissolvedEvent,
    context: AllianceContextCleanupContext,
  ): Promise<void>;
  /** One member left or was kicked (not called per member on dissolution). */
  memberRemoved?(
    event: AllianceMemberRemovedEvent,
    context: AllianceContextCleanupContext,
  ): Promise<void>;
  /** All alliance data is being reset. */
  reset?(context: AllianceContextCleanupContext): Promise<void>;
}

export const ALLIANCE_CONTEXT_CLEANUP = Symbol('ALLIANCE_CONTEXT_CLEANUP');

/** Registry of cleanup consumers; the alliance module calls it, consumers register. */
export class AllianceContextCleanup {
  private readonly consumers: AllianceContextCleanupConsumer[] = [];

  register(consumer: AllianceContextCleanupConsumer): void {
    if (!this.consumers.includes(consumer)) this.consumers.push(consumer);
  }

  async allianceDissolved(
    event: AllianceDissolvedEvent,
    context: AllianceContextCleanupContext,
  ): Promise<void> {
    for (const c of this.consumers) await c.allianceDissolved?.(event, context);
  }

  async memberRemoved(
    event: AllianceMemberRemovedEvent,
    context: AllianceContextCleanupContext,
  ): Promise<void> {
    for (const c of this.consumers) await c.memberRemoved?.(event, context);
  }

  async reset(context: AllianceContextCleanupContext): Promise<void> {
    for (const c of this.consumers) await c.reset?.(context);
  }
}
