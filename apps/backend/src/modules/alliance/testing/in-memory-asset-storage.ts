import type { AllianceAssetStorage } from '../alliance-asset.port';

/** In-memory {@link AllianceAssetStorage} for tests, with failure injection. */
export class InMemoryAssetStorage implements AllianceAssetStorage {
  private readonly files = new Map<string, Buffer>();
  failNextSave = false;
  failNextDelete = false;

  get size(): number {
    return this.files.size;
  }

  keys(): string[] {
    return [...this.files.keys()];
  }

  async save(key: string, data: Buffer): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('asset storage unavailable');
    }
    this.files.set(key, Buffer.from(data));
  }

  async delete(key: string): Promise<void> {
    if (this.failNextDelete) {
      this.failNextDelete = false;
      throw new Error('asset storage unavailable');
    }
    this.files.delete(key);
  }

  async list(): Promise<string[]> {
    return this.keys();
  }

  async read(key: string): Promise<Buffer | null> {
    return this.files.get(key) ?? null;
  }
}
