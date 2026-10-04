import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SWU-Gasplaneten (Typ 15, Varianten A-D) waren mit landable=false als nicht
 * kolonisierbar generiert. Wie die alten STU-Q-Planeten sollen sie ueber ein
 * einziges Plattformfeld (H919-H949) mit einer Koloniezentrale gegruendet
 * werden koennen. Neue Systeme erben das aus dem Archetyp; hier werden die
 * bereits generierten Objekte nachgezogen. Synthetische classId =
 * 90000 + typeId*10 + variantIndex (siehe buildSwuTestClassId), also 90150-90153.
 */
export class MakeSwuGasPlanetsColonizable20261004100000
  implements MigrationInterface
{
  name = 'MakeSwuGasPlanetsColonizable20261004100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "celestial_objects" SET "isColonizable" = true WHERE "classId" BETWEEN 90150 AND 90153`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "celestial_objects" SET "isColonizable" = false WHERE "classId" BETWEEN 90150 AND 90153`,
    );
  }
}
