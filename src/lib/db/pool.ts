import { readFileSync } from "node:fs";
import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for the PostgreSQL backend");
    }

    // pg connection-string SSL options override ssl, including a supplied CA.
    const url = new URL(connectionString);
    const caSetting = process.env.DATABASE_CA;
    const ca = caSetting
      ? caSetting.includes("-----BEGIN CERTIFICATE-----")
        ? caSetting
        : readFileSync(caSetting, "utf8")
      : undefined;
    if (ca) {
      for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
        url.searchParams.delete(key);
      }
    }

    pool = new Pool({
      connectionString: url.toString(),
      connectionTimeoutMillis: 10000,
      ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
    });
  }
  return pool;
}
