import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetShipClassShuttleSlots20260707083000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 5 })
      .where('key = :key', { key: 'REBEL_COLONIZER_CR90' })
      .execute();

    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 5 })
      .where('key = :key', { key: 'EMPIRE_COLONIZER_LAMBDA_SETTLEMENT' })
      .execute();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 0 })
      .where('key IN (:...keys)', {
        keys: ['REBEL_COLONIZER_CR90', 'EMPIRE_COLONIZER_LAMBDA_SETTLEMENT'],
      })
      .execute();
  }
}
