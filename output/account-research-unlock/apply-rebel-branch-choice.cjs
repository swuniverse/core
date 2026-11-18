const fs = require('fs');
const yaml = require('js-yaml');
const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function main() {
  const requested = JSON.parse(process.argv[2]);
  const dir = 'output/account-research-unlock';
  const journalPath = `${dir}/rebel-branch-choices.json`;
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
  const all = ['rebels', 'imperials'].flatMap(f =>
    yaml.load(fs.readFileSync(`game-data/data/research/${f}.yaml`, 'utf8')).technologies);
  const own = new Map();
  for (const tech of all) {
    if (['REBEL_ALLIANCE', 'SHARED'].includes(tech.faction) && !own.has(tech.id)) own.set(tech.id, tech);
  }
  const selected = own.get(requested.techId);
  if (!selected || typeof requested.group !== 'string') throw new Error('Invalid branch selection');
  const conflicts = new Map([...own.keys()].map(id => [id, new Set()]));
  for (const tech of own.values()) {
    for (const dep of tech.dependencies.filter(d => d.type === 'EXCLUDE')) {
      for (const id of dep.techIds) {
        if (!own.has(id)) continue;
        conflicts.get(tech.id).add(id);
        conflicts.get(id).add(tech.id);
      }
    }
  }
  const decisions = journal.choices.filter(c => c.group !== requested.group);
  decisions.push({
    group: requested.group, selectedTechId: selected.id, selectedName: selected.name,
    excludedTechIds: [...conflicts.get(selected.id)], confirmedAt: new Date().toISOString(),
  });
  const confirmed = new Set(decisions.map(c => c.selectedTechId));
  const required = new Set();
  function requireTech(id) {
    if (required.has(id)) return;
    const tech = own.get(id);
    if (!tech) throw new Error('Missing required technology');
    required.add(id);
    for (const dep of tech.dependencies.filter(d => d.type === 'REQUIRE')) {
      for (const ancestor of dep.techIds) requireTech(ancestor);
    }
  }
  for (const id of confirmed) requireTech(id);
  for (const id of required) {
    if ([...conflicts.get(id)].some(other => required.has(other))) throw new Error('Selection or its prerequisites conflict with an earlier confirmed choice');
  }
  const initialPath = fs.readdirSync(dir).filter(f => /^rebel-2026.*\.json$/.test(f)).sort()[0];
  const original = JSON.parse(fs.readFileSync(`${dir}/${initialPath}`, 'utf8'));
  const originalIds = original.previous.filter(r => r.status === 'COMPLETED').map(r => r.techId);
  const sorted = [...own.values()].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id);
  const dependenciesMet = (tech, keep) => tech.dependencies.every(dep =>
    dep.type === 'EXCLUDE' ||
    (dep.type === 'REQUIRE' ? dep.techIds.every(id => keep.has(id)) :
      dep.type === 'REQUIRE_SOME' ? dep.techIds.some(id => keep.has(id)) : false));
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const user = (await client.query('SELECT id,username,faction FROM users WHERE id=$1 FOR UPDATE', [4])).rows[0];
    if (user?.username !== 'Rebel' || user.faction !== 'REBEL_ALLIANCE') throw new Error('Account mismatch');
    const before = (await client.query('SELECT * FROM research WHERE "userId"=$1 FOR UPDATE', [4])).rows;
    if (before.some(r => r.status !== 'COMPLETED' || !own.has(r.techId))) throw new Error('Unexpected research state');
    if (!originalIds.every(id => before.some(r => r.techId === id))) throw new Error('Original research missing');
    const confirmedBans = new Set([...required].flatMap(id => [...conflicts.get(id)]));
    const fixed = new Set(before.filter(r => conflicts.get(r.techId).size && !confirmedBans.has(r.techId)).map(r => r.techId));
    for (const id of required) fixed.add(id);
    let keep;
    while (true) {
      const banned = new Set([...fixed].flatMap(id => [...conflicts.get(id)]));
      keep = new Set(originalIds);
      let changed = true;
      while (changed) {
        changed = false;
        for (const tech of sorted) {
          if (keep.has(tech.id) || banned.has(tech.id) ||
            [...conflicts.get(tech.id)].some(id => keep.has(id)) || !dependenciesMet(tech, keep)) continue;
          keep.add(tech.id);
          changed = true;
        }
      }
      const unreachable = [...fixed].filter(id => !keep.has(id));
      if (!unreachable.length) break;
      if (unreachable.some(id => required.has(id))) throw new Error('Confirmed branch cannot be reached');
      for (const id of unreachable) fixed.delete(id);
    }
    for (const id of keep) {
      if (!dependenciesMet(own.get(id), keep) || [...conflicts.get(id)].some(other => keep.has(other))) throw new Error('Plan validation failed');
    }
    const previousIds = new Set(before.map(r => r.techId));
    const remove = before.filter(r => !keep.has(r.techId)).map(r => r.techId);
    const add = [...keep].filter(id => !previousIds.has(id));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(`${dir}/rebel-before-choice-${stamp}.json`, JSON.stringify({ user, research: before, decisions, add, remove }, null, 2), { flag: 'wx', mode: 0o600 });
    await client.query('DELETE FROM research WHERE "userId"=$1 AND "techId"=ANY($2::int[])', [4, remove]);
    for (const id of add) {
      const tech = own.get(id);
      const points = tech.effort ?? (tech.duration ?? 1) * 10;
      await client.query(`INSERT INTO research ("userId","techId",status,progress,"remainingPoints","spentPoints","completedAt") VALUES ($1,$2,'COMPLETED',$3,0,$3,now())`, [4, id, points]);
    }
    const actual = (await client.query('SELECT "techId" FROM research WHERE "userId"=$1 AND status=$2', [4, 'COMPLETED'])).rows;
    if (actual.length !== keep.size || actual.some(r => !keep.has(r.techId))) throw new Error('Database verification failed');
    await client.query('COMMIT');
    journal.choices = decisions;
    fs.writeFileSync(`${journalPath}.tmp`, JSON.stringify(journal, null, 2));
    fs.renameSync(`${journalPath}.tmp`, journalPath);
    console.log(JSON.stringify({ selected: selected.name, completed: keep.size, added: add.map(id => ({ id, name: own.get(id).name })), removed: remove.map(id => ({ id, name: own.get(id).name })), conflicts: 0, missingPrerequisites: 0 }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
