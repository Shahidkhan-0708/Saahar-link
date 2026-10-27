import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FabricStore } from "./store.js";
import { buildFabric } from "./app.js";
import { runCycle } from "./sync-worker.js";

const port = Number(process.env.PORT ?? 3002);
const dataDir =
  process.env.FABRIC_DB ??
  fileURLToPath(new URL("../data/fabric.sqlite", import.meta.url));
mkdirSync(new URL(".", `file://${dataDir}`), { recursive: true });

const store = new FabricStore(dataDir);
const app = buildFabric({ store });

await app.listen({ port, host: "0.0.0.0" });

// Sync loop: every 5s online; exponential backoff 5s → 60s on failure (§5).
let intervalMs = 5_000;
let stopped = false;

async function tick(): Promise<void> {
  if (stopped) return;
  try {
    if (store.getKv("paired") === "1") {
      await runCycle(store, {
        cloud_url: store.getKv("cloud_url")!,
        fabric_token: store.getKv("fabric_token")!,
      });
      store.setKv("last_sync_at", new Date().toISOString());
      intervalMs = 5_000;
    }
  } catch {
    store.requeueStale();
    intervalMs = Math.min(intervalMs * 2, 60_000);
  } finally {
    setTimeout(() => void tick(), intervalMs);
  }
}

void tick();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopped = true;
    store.close();
    void app.close().then(() => process.exit(0));
  });
}

app.log?.info?.({ port }, "fabric listening");
console.log(`sahakar-fabric listening on http://localhost:${port} (db: ${dataDir})`);
