import { MigrationInterface, QueryRunner } from 'typeorm';
import { AddUserCharacters1792756800000 } from './20261023120000-add-user-characters';
import {
  characterMigrationId,
  PREVIOUS_CALENDAR_CHARACTER_MIGRATION,
} from './support/character-migration-history';

/** Bridge the legacy epoch timestamp to the calendar-ordered migrations. */
export class PrepareUserCharacters20261023110000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const legacy = await characterMigrationId(
      queryRunner,
      'AddUserCharacters1792756800000',
    );
    const previousCalendar = await characterMigrationId(
      queryRunner,
      PREVIOUS_CALENDAR_CHARACTER_MIGRATION,
    );
    if (legacy !== undefined || previousCalendar !== undefined) {
      if (!(await queryRunner.hasTable('user_characters'))) {
        throw new Error(
          'Legacy character migration is recorded but user_characters is missing',
        );
      }
      return;
    }
    await new AddUserCharacters1792756800000().up(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const legacy = await characterMigrationId(
      queryRunner,
      'AddUserCharacters1792756800000',
    );
    const previousCalendar = await characterMigrationId(
      queryRunner,
      PREVIOUS_CALENDAR_CHARACTER_MIGRATION,
    );
    if (legacy === undefined && previousCalendar === undefined)
      await queryRunner.query('DROP TABLE IF EXISTS "user_characters"');
  }
}
