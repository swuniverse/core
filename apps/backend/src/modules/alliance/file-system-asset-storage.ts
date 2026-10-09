import { Injectable } from '@nestjs/common';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AllianceAssetStorage } from './alliance-asset.port';

const KEY = '[0-9a-f]{32}';
const KEY_PATTERN = new RegExp(`^${KEY}$`);
/** Final files and the temporary files of an interrupted save. */
const FILE_PATTERN = new RegExp(`^(${KEY})\\.png(\\.tmp)?$`);

const isMissing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException).code === 'ENOENT';

/** Local file system adapter of the alliance asset storage (development). */
@Injectable()
export class FileSystemAssetStorage implements AllianceAssetStorage {
  private readonly directory =
    process.env.ALLIANCE_ASSET_DIR ||
    join(process.cwd(), 'data', 'alliance-assets');

  async save(key: string, data: Buffer): Promise<void> {
    const target = this.pathOf(key);
    await mkdir(this.directory, { recursive: true });
    const temporary = this.temporaryPathOf(key);
    await writeFile(temporary, data);
    await rename(temporary, target);
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
    await rm(this.temporaryPathOf(key), { force: true });
  }

  /** Keys of final files and of stale temporary files, each key once. */
  async list(): Promise<string[]> {
    try {
      const names = await readdir(this.directory);
      const keys = names
        .map((name) => FILE_PATTERN.exec(name)?.[1])
        .filter((key): key is string => key !== undefined);
      return [...new Set(keys)];
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathOf(key));
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  private pathOf(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new Error('Invalid asset key');
    return join(this.directory, `${key}.png`);
  }

  private temporaryPathOf(key: string): string {
    return `${this.pathOf(key)}.tmp`;
  }
}
