import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetShipClassShuttleSlots20260707083000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 4 })
      .where('key = :key', { key: 'REBEL_CORVETTE_GR75' })
      .execute();

    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 3 })
      .where('key = :key', { key: 'REBEL_FREIGHTER' })
      .execute();

    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 4 })
      .where('key = :key', { key: 'EMPIRE_FRIGATE_SENTINEL' })
      .execute();

    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 3 })
      .where('key = :key', { key: 'EMPIRE_FREIGHTER' })
      .execute();

    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 4 })
      .where('key = :key', { key: 'REBEL_CORVETTE_CR90_COLONIZER' })
      .execute();

    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 4 })
      .where('key = :key', { key: 'EMPIRE_LAMBDA_SETTLEMENT_SHUTTLE' })
      .execute();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .update('ship_class_defs')
      .set({ shuttleSlots: 0 })
      .where('key IN (:...keys)', {
        keys: [
          'REBEL_CORVETTE_GR75',
          'REBEL_FREIGHTER',
          'EMPIRE_FRIGATE_SENTINEL',
          'EMPIRE_FREIGHTER',
          'REBEL_CORVETTE_CR90_COLONIZER',
          'EMPIRE_LAMBDA_SETTLEMENT_SHUTTLE',
        ],
      })
      .execute();
  }
}
