import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";

const uri = process.env.DATABASE_URL;
const archiveArg = process.argv[2];
if (!uri) throw new Error("DATABASE_URL is required");
if (!archiveArg) throw new Error("Usage: npm run restore:mongodb -- <backup.archive.gz>");
if (process.env.ALLOW_DATABASE_RESTORE !== "true") {
  throw new Error("Set ALLOW_DATABASE_RESTORE=true explicitly before restoring a database backup");
}

const archive = resolve(archiveArg);
await access(archive);
const args = ["--uri", uri, `--archive=${archive}`, "--gzip"];
if (process.env.RESTORE_DROP_EXISTING === "true") args.push("--drop");

await new Promise((resolvePromise, reject) => {
  const child = spawn(process.env.MONGORESTORE_BIN || "mongorestore", args, {
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0 ? resolvePromise() : reject(new Error(`mongorestore exited with ${code}`)),
  );
});

console.log(JSON.stringify({ event: "restore_complete", archive, droppedExisting: process.env.RESTORE_DROP_EXISTING === "true" }));
