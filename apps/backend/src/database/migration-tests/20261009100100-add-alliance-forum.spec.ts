import { QueryRunner } from 'typeorm';
import { AddAllianceForum20261009100100 } from '../migrations/20261009100100-add-alliance-forum';

const compact = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

function recordingQueryRunner() {
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(compact(sql));
    }),
  } as unknown as QueryRunner;
  return { queries, queryRunner };
}

describe('AddAllianceForum20261009100100 migration', () => {
  it('creates cascading board, topic and post tables with soft-delete and edit columns', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceForum20261009100100().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "alliance_forum_boards"');
    expect(sql).toContain('CREATE TABLE "alliance_forum_topics"');
    expect(sql).toContain('CREATE TABLE "alliance_forum_posts"');
    expect(sql).toContain(
      'FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE',
    );
    expect(sql).toContain(
      'FOREIGN KEY ("boardId") REFERENCES "alliance_forum_boards"("id") ON DELETE CASCADE',
    );
    expect(sql).toContain(
      'FOREIGN KEY ("topicId") REFERENCES "alliance_forum_topics"("id") ON DELETE CASCADE',
    );
    expect(sql).toContain(
      'FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL',
    );
    for (const column of [
      '"deletedAt" TIMESTAMP',
      '"deletedByUserId" integer',
      '"deletedByName" varchar(255)',
      '"editedAt" TIMESTAMP',
      '"authorName" varchar(255) NOT NULL',
      '"lastActivityAt" TIMESTAMP NOT NULL',
    ]) {
      expect(sql).toContain(column);
    }
  });

  it('adds indexes for topic lists, post pages and recent topics', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceForum20261009100100().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('IDX_alliance_forum_topics_board_order');
    expect(sql).toContain('IDX_alliance_forum_topics_alliance_recent');
    expect(sql).toContain('IDX_alliance_forum_posts_topic_order');
  });

  it('mirrors the business length limits in CHECK constraints', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceForum20261009100100().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('char_length("name") BETWEEN 5 AND 80');
    expect(sql).toContain('char_length("title") BETWEEN 1 AND 120');
    expect(sql).toContain('char_length("text") BETWEEN 1 AND 20000');
  });

  it('drops children before parents', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceForum20261009100100().down(queryRunner);

    expect(queries).toEqual([
      'DROP TABLE "alliance_forum_posts"',
      'DROP TABLE "alliance_forum_topics"',
      'DROP TABLE "alliance_forum_boards"',
    ]);
  });
});
