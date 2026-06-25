import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { getPool, query, withTransaction } from "../server/postgres/db";

interface MigrationRow {
  name: string;
}

const migrationsDir = path.join(process.cwd(), "db", "migrations");

const ensureMigrationsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

const checksum = async (content: string) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(content).digest("hex");
};

const listMigrationFiles = () => {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migration directory does not exist: ${migrationsDir}`);
  }

  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
};

const migrate = async () => {
  await ensureMigrationsTable();
  const files = listMigrationFiles();
  const applied = await query<MigrationRow>("SELECT name FROM schema_migrations ORDER BY name");
  const appliedNames = new Set(applied.rows.map((row) => row.name));
  const executed: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (appliedNames.has(file)) {
      skipped.push(file);
      continue;
    }

    const absolutePath = path.join(migrationsDir, file);
    const sql = readFileSync(absolutePath, "utf8");
    const sqlChecksum = await checksum(sql);

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
        [file, sqlChecksum]
      );
    });
    executed.push(file);
  }

  console.log(JSON.stringify({
    ok: true,
    database: "postgres",
    migrationsDir,
    executed,
    skipped,
  }, null, 2));
};

migrate()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end().catch(() => undefined);
  });
