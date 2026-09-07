import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../../../", import.meta.url));
export async function createTestDatabase() {
  const cache = path.join(root, ".cache");
  await mkdir(path.join(cache, "tmp"), { recursive: true });
  process.env.TMPDIR = path.join(cache, "tmp");
  process.env.MONGOMS_DOWNLOAD_DIR = path.join(cache, "mongodb");
  const directory = await mkdtemp(path.join(cache, "mongo-test-"));
  const { MongoMemoryReplSet } = await import("mongodb-memory-server");
  const database = await MongoMemoryReplSet.create({ binary: { version: "7.0.24" }, instanceOpts: [{ dbPath: directory }], replSet: { count: 1, storageEngine: "wiredTiger" } });
  return { uri: database.getUri("adflow_test"), stop: async () => { await database.stop(); await rm(directory, { recursive: true, force: true }); } };
}
