import { spawn } from "node:child_process";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { resolve } from "node:path";

const uri = process.env.DATABASE_URL;
if (!uri) throw new Error("DATABASE_URL is required");
const dir = resolve(process.env.BACKUP_DIR || "./backups");
await mkdir(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = resolve(dir, `bio-cleaning-${stamp}.archive.gz`);
await new Promise((resolvePromise, reject) => {
  const child = spawn(process.env.MONGODUMP_BIN || "mongodump", ["--uri", uri, "--archive=" + target, "--gzip"], { stdio: ["ignore", "inherit", "inherit"] });
  child.on("error", reject);
  child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`mongodump exited with ${code}`)));
});
const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS || 14));
const cutoff = Date.now() - retentionDays * 86400000;
for (const name of await readdir(dir)) {
  if (!name.startsWith("bio-cleaning-") || !name.endsWith(".archive.gz")) continue;
  const file = resolve(dir, name);
  if ((await stat(file)).mtimeMs < cutoff) await unlink(file);
}
console.log(JSON.stringify({ event: "backup_complete", target, retentionDays }));
