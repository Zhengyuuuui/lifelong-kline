import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getBackendConfig } from "./env";

let pool: Pool | null = null;

export const getPool = () => {
  if (pool) return pool;
  const config = getBackendConfig();
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.pgPoolMax,
    idleTimeoutMillis: config.pgIdleTimeoutMs,
    statement_timeout: config.pgStatementTimeoutMs,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
  });
  return pool;
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
) => {
  return getPool().query<T>(text, values);
};

export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
