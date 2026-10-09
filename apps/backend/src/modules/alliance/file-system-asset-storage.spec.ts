import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSystemAssetStorage } from './file-system-asset-storage';

const KEY_A = 'a'.repeat(32);
const KEY_B = 'b'.repeat(32);
const KEY_C = 'c'.repeat(32);

describe('FileSystemAssetStorage', () => {
  let directory: string;
  let storage: FileSystemAssetStorage;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'alliance-assets-'));
    process.env.ALLIANCE_ASSET_DIR = directory;
    storage = new FileSystemAssetStorage();
  });

  afterEach(async () => {
    delete process.env.ALLIANCE_ASSET_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it('lists an empty list for a missing directory', async () => {
    await rm(directory, { recursive: true });
    expect(await storage.list()).toEqual([]);
  });

  it('lists final files and stale temporary files, ignoring foreign files', async () => {
    await storage.save(KEY_A, Buffer.from('a'));
    await writeFile(join(directory, `${KEY_B}.png.tmp`), 'interrupted');
    await writeFile(join(directory, `${KEY_A}.png.tmp`), 'interrupted');
    await writeFile(join(directory, 'notes.txt'), 'foreign');

    expect((await storage.list()).sort()).toEqual([KEY_A, KEY_B]);
  });

  it('removes leftovers of interrupted saves when every listed key is deleted, idempotently', async () => {
    await storage.save(KEY_A, Buffer.from('a'));
    await writeFile(join(directory, `${KEY_B}.png.tmp`), 'interrupted');
    await writeFile(join(directory, `${KEY_C}.png`), 'final');
    await writeFile(join(directory, 'notes.txt'), 'foreign');

    for (let run = 0; run < 2; run += 1) {
      for (const key of await storage.list()) await storage.delete(key);
    }

    expect(await readdir(directory)).toEqual(['notes.txt']);
    expect(await storage.list()).toEqual([]);
  });

  it('answers null for a missing asset and rejects invalid keys', async () => {
    expect(await storage.read(KEY_A)).toBeNull();
    await expect(storage.read('../x')).rejects.toThrow('Invalid asset key');
  });
});
