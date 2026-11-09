import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('TypeORM migration config', () => {
  it('builds metadata for every registered entity relation', () => {
    const workspaceRoot = resolve(__dirname, '../../../..');
    const script = `
      const dataSource = require('./apps/backend/src/database/typeorm-migration.config.ts').default;
      const { User: AppUser } = require('./apps/backend/src/modules/auth/user.entity');
      const { User: MigrationUser } = require('./apps/backend/src/database/migration-entities/user.entity');
      const { LayerKnowledge } = require('./apps/backend/src/modules/starmap/entities/layer-knowledge.entity');
      const { News } = require('./apps/backend/src/modules/news/entities/news.entity');
      const { ProfileVisit } = require('./apps/backend/src/modules/profile-visitor/entities/profile-visit.entity');
      const { MigrationAccountToken } = require('./apps/backend/src/database/migration-entities/account-token.entity');

      async function assertRelationTarget(entity, property, target) {
        const relation = dataSource.getMetadata(entity).relations.find(
          (candidate) => candidate.propertyName === property,
        );
        if (!relation || relation.inverseEntityMetadata.target !== target) {
          throw new Error(
            'Unexpected relation target for ' + entity.name + '.' + property + ': ' + (relation?.inverseEntityMetadata.targetName ?? 'missing'),
          );
        }
      }

      dataSource.buildMetadatas().then(async () => {
        await assertRelationTarget(LayerKnowledge, 'user', AppUser);
        await assertRelationTarget(News, 'author', AppUser);
        await assertRelationTarget(ProfileVisit, 'visitor', AppUser);
        await assertRelationTarget(ProfileVisit, 'profileUser', AppUser);
        await assertRelationTarget(MigrationAccountToken, 'user', MigrationUser);
      }).catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;
    const result = spawnSync(
      process.execPath,
      [
        '--require',
        'ts-node/register',
        '--require',
        'tsconfig-paths/register',
        '-e',
        script,
      ],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://swuniverse:devpassword@127.0.0.1:5490/swuniverse',
          TS_NODE_PROJECT: 'apps/backend/tsconfig.app.json',
        },
        encoding: 'utf8',
      },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || 'Metadata build failed');
    }
    expect(result.status).toBe(0);
  });
});
