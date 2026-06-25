import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDatabase } from "../server/database";

const command = process.argv[2] || "stats";
const database = createDatabase();

const quoteSqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

const tableNames = () =>
  database.db
    .prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    .all()
    .map((row) => String(row.name));

const printStats = () => {
  const stats = tableNames().map((name) => {
    const row = database.db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get();
    return { table: name, rows: Number(row?.count ?? 0) };
  });
  console.log(JSON.stringify({ db: database.sqlitePath, stats }, null, 2));
};

const backup = () => {
  const backupDir = path.join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(backupDir, `life-kline-${stamp}.sqlite`);
  database.db.exec(`VACUUM INTO ${quoteSqlString(target)}`);
  console.log(JSON.stringify({ ok: true, backup: target }, null, 2));
};

const vacuum = () => {
  database.db.exec("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;");
  console.log(JSON.stringify({ ok: true, action: "vacuum", db: database.sqlitePath }, null, 2));
};

const purge = () => {
  const retentionDays = Number(process.env.DATA_RETENTION_DAYS || 180);
  const before = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const ai = database.db
    .prepare("DELETE FROM ai_request_logs WHERE created_at < ?")
    .run(before);
  const audit = database.db
    .prepare("DELETE FROM audit_events WHERE created_at < ?")
    .run(before);
  console.log(JSON.stringify({
    ok: true,
    before,
    deleted: {
      aiRequestLogs: ai.changes,
      auditEvents: audit.changes,
    },
  }, null, 2));
};

if (command === "stats") {
  printStats();
} else if (command === "backup") {
  backup();
} else if (command === "vacuum") {
  vacuum();
} else if (command === "purge") {
  purge();
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
