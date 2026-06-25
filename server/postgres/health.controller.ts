import { Router } from "express";
import { query } from "./db";
import { asyncHandler } from "./errors";

interface HealthRow {
  now: string;
  current_database: string;
}

interface MigrationRow {
  count: number;
}

export const createPostgresHealthRouter = () => {
  const router = Router();

  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      const startedAt = Date.now();
      const [health, migrations] = await Promise.all([
        query<HealthRow>("SELECT now()::text, current_database()::text"),
        query<MigrationRow>(`
          SELECT count(*)::int AS count
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN (
              'users',
              'user_profiles',
              'ai_history',
              'orders',
              'memberships',
              'refresh_tokens'
            )
        `),
      ]);

      res.json({
        ok: true,
        service: "life-kline-postgres-api",
        database: health.rows[0]?.current_database,
        requiredTablesReady: Number(migrations.rows[0]?.count || 0) >= 6,
        latencyMs: Date.now() - startedAt,
        time: health.rows[0]?.now || new Date().toISOString(),
      });
    })
  );

  return router;
};
