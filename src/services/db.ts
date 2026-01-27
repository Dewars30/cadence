import Database from "@tauri-apps/plugin-sql";
import { appDataDir, join } from "@tauri-apps/api/path";
import schemaSql from "../../schema/sqlite.sql?raw";

type DbLike = {
  execute: (sql: string, params?: unknown[]) => Promise<void>;
  select: <T>(sql: string, params?: unknown[]) => Promise<T>;
};

class MemoryDb implements DbLike {
  private tables = new Map<string, Record<string, unknown>[]>();

  private getTable(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }

  async execute(sql: string, params: unknown[] = []) {
    const insertMatch = sql.match(/INSERT INTO (\w+) \(([^)]+)\)/i);
    if (insertMatch) {
      const table = insertMatch[1];
      const columns = insertMatch[2].split(",").map((c) => c.trim());
      const record: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        record[col] = params[idx];
      });
      this.getTable(table).push(record);
      return;
    }

    const updateMatch = sql.match(/UPDATE (\w+) SET (.+) WHERE (\w+) = \?/i);
    if (updateMatch) {
      const table = updateMatch[1];
      const setClause = updateMatch[2];
      const whereCol = updateMatch[3];
      const setParts = setClause.split(",").map((part) => part.trim());
      const setCols = setParts.map((part) => part.split("=")[0].trim());
      const whereVal = params[params.length - 1];
      const rows = this.getTable(table);
      rows.forEach((row) => {
        if (row[whereCol] === whereVal) {
          setCols.forEach((col, idx) => {
            row[col] = params[idx];
          });
        }
      });
      return;
    }

    const deleteMatch = sql.match(/DELETE FROM (\w+) WHERE (\w+) = \?/i);
    if (deleteMatch) {
      const table = deleteMatch[1];
      const whereCol = deleteMatch[2];
      const whereVal = params[0];
      const rows = this.getTable(table);
      this.tables.set(
        table,
        rows.filter((row) => row[whereCol] !== whereVal),
      );
    }
  }

  async select<T>(sql: string, params: unknown[] = []) {
    const selectMatch = sql.match(/SELECT \* FROM (\w+)(?: WHERE (\w+) = \?)?(?: ORDER BY (\w+) (ASC|DESC))?/i);
    if (!selectMatch) return [] as T;
    const table = selectMatch[1];
    const whereCol = selectMatch[2];
    const orderCol = selectMatch[3];
    const orderDir = selectMatch[4];
    let rows = [...this.getTable(table)];
    if (whereCol) {
      rows = rows.filter((row) => row[whereCol] === params[0]);
    }
    if (orderCol) {
      rows.sort((a, b) => {
        const av = a[orderCol] as string;
        const bv = b[orderCol] as string;
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * (orderDir === "DESC" ? -1 : 1);
      });
    }
    return rows as T;
  }
}

let db: DbLike | null = null;
let initPromise: Promise<DbLike> | null = null;
let dbPathCache: string | null = null;

async function openDb(): Promise<DbLike> {
  if (db) return db;
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  if (!isTauri) {
    db = new MemoryDb();
    return db;
  }
  const dir = await appDataDir();
  const dbPath = await join(dir, "cadence.db");
  dbPathCache = dbPath;
  db = await Database.load(`sqlite:${dbPath}`);
  return db;
}

async function runMigrations(database: DbLike) {
  const statements = schemaSql
    .split(";")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await database.execute(statement);
  }
}

export async function initDb(): Promise<DbLike> {
  if (!initPromise) {
    initPromise = (async () => {
      const database = await openDb();
      const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
      if (isTauri) {
        await runMigrations(database);
      }
      return database;
    })();
  }
  return initPromise;
}
export async function getDb(): Promise<DbLike> {
  return initDb();
}

export async function getDbPath(): Promise<string> {
  if (dbPathCache) return dbPathCache;
  const dir = await appDataDir();
  const dbPath = await join(dir, "cadence.db");
  dbPathCache = dbPath;
  return dbPath;
}
