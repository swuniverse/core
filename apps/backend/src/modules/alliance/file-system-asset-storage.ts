import { Injectable } from '@nestjs/common';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AllianceAssetStorage } from './alliance-asset.port';

const KEY_PATTERN = /^[0-9a-f]{32}$/;

/** Local file system adapter of the alliance asset storage (development). */
@Injectable()
export class FileSystemAssetStorage implements AllianceAssetStorage {
  private readonly directory =
    process.env.ALLIANCE_ASSET_DIR ||
    join(process.cwd(), 'data', 'alliance-assets');

  async save(key: string, data: Buffer): Promise<void> {
    const target = this.pathOf(key);
    await mkdir(this.directory, { recursive: true });
    const temporary = `${target}.tmp`;
    await writeFile(temporary, data);
    await rename(temporary, target);
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathOf(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private pathOf(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new Error('Invalid asset key');
    return join(this.directory, `${key}.png`);
  }
}
