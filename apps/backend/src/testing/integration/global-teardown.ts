export default async function globalTeardown(): Promise<void> {
  try {
    await globalThis.__INTEGRATION_CONTAINER__?.stop();
  } finally {
    const previous = globalThis.__INTEGRATION_PREVIOUS_ENV__;
    if (previous) {
      if (previous.seed === undefined)
        delete process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
      else process.env.SWU_MIGRATION_BUILDING_SEED_PATH = previous.seed;
      if (previous.url === undefined)
        delete process.env.INTEGRATION_DATABASE_URL;
      else process.env.INTEGRATION_DATABASE_URL = previous.url;
    }
    globalThis.__INTEGRATION_CONTAINER__ = undefined;
    globalThis.__INTEGRATION_PREVIOUS_ENV__ = undefined;
  }
}
