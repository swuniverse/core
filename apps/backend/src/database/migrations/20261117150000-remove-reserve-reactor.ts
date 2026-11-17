import { MigrationInterface, QueryRunner } from 'typeorm';
import { ReserveReactor1794888000000 } from './20261117040000-reserve-reactor';

/** SPEC-6 was withdrawn before any reserve cores or associated goods existed. */
export class RemoveReserveReactor1794927600000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'DROP TRIGGER IF EXISTS "TR_reserve_reactor_module" ON spacecraft_modules',
    );
    await q.query(
      'DROP FUNCTION IF EXISTS synchronize_reserve_reactor_module()',
    );
    await q.query('DROP TRIGGER IF EXISTS "TR_reserve_reactor" ON spacecraft');
    await q.query('DROP FUNCTION IF EXISTS maintain_reserve_reactor()');
  }

  async down(q: QueryRunner): Promise<void> {
    await new ReserveReactor1794888000000().up(q);
  }
}
