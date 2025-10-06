import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
const DB_FILE = process.env.DB_FILE || './data/remnant.sqlite';

async function main() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  await db.exec(`DROP TABLE IF EXISTS charlog;`);
  console.log('✅ Dropped charlog table');

  await db.exec(`DROP TABLE IF EXISTS lfg_status;`);
  console.log('✅ Dropped lfg_status table');
  
  await db.exec(`DROP TABLE IF EXISTS guild_state;`);
  console.log('✅ Dropped guild_state table');

  // Future use tables
  await db.exec(`DROP TABLE IF EXISTS xp_audit;`); 
  console.log('✅ Dropped xp_audit table');

  await db.exec(`DROP TABLE IF EXISTS lfg_requests;`);
  console.log('✅ Dropped lfg_requests table');

  await db.exec(`DROP TABLE IF EXISTS lfg_audit;`);
  console.log('✅ Dropped lfg_audit table');

  await db.exec(`DROP TABLE IF EXISTS guild_audit;`);
  console.log('✅ Dropped guild_audit table');

  await db.close();
  console.log('✅ Wiped all tables in', DB_FILE);
}

main().catch(err => { console.error(err); process.exit(1); });
