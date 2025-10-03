import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
const DB_FILE = process.env.DB_FILE || './data/charlog.sqlite';

async function main() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  await db.exec(`DROP TABLE IF EXISTS charlog;`);
  await db.close();
  console.log('Wiped charlog table in', DB_FILE);
}

main().catch(err => { console.error(err); process.exit(1); });
