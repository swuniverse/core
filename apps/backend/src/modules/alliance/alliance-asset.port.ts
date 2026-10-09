export const ALLIANCE_ASSET_STORAGE = Symbol('ALLIANCE_ASSET_STORAGE');

/**
 * Swappable file storage for alliance assets (banners). Keys are opaque,
 * lowercase hexadecimal and independent of the owning alliance. Adapters:
 * local file system and in-memory (tests).
 */
export interface AllianceAssetStorage {
  save(key: string, data: Buffer): Promise<void>;
  /** Deleting a missing asset succeeds. */
  delete(key: string): Promise<void>;
  /**
   * Keys of everything the adapter holds, referenced or not, including
   * leftovers of interrupted saves (full reset deletes each key).
   */
  list(): Promise<string[]>;
  /** Null when the asset does not exist. */
  read(key: string): Promise<Buffer | null>;
}
