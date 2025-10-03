import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

export type Sqlite = Database<sqlite3.Database, sqlite3.Statement>;
let _db: Sqlite | null = null;

const DEFAULT_DB = process.env.DB_FILE || path.resolve(process.cwd(), 'data/charlog.sqlite');
const FUND_ID = process.env.GUILD_FUND_ID || 'sys:fund:remnant';

export async function initDb(dbFile = DEFAULT_DB) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = await open({ filename: dbFile, driver: sqlite3.Database });

  await db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA wal_autocheckpoint = 1000;

    CREATE TABLE IF NOT EXISTS charlog (
      userId TEXT PRIMARY KEY,
      name   TEXT NOT NULL,
      level  INTEGER NOT NULL,
      xp     INTEGER NOT NULL,
      cp     INTEGER NOT NULL,
      tp     INTEGER NOT NULL
    );
  `);

  
  // create the fund row if missing
  await db.run(
    `INSERT INTO charlog (userId, name, level, xp, cp, tp)
     VALUES (?, 'Adventurers Guild Fund', 20, 305000, 500000, 0)
     ON CONFLICT(userId) DO NOTHING`,
    FUND_ID
  );


  _db = db;
    console.log(`📂 Database initialized: ${dbFile}`);
  return db;
}


export function getDb(): Sqlite {
  if (!_db) throw new Error('DB not initialized — call initDb() before using getDb()');
  return _db;
}