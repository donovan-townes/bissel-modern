import { initDb } from "../db/index.js";
console.log("🏃‍♂️ Initializing DB...");

initDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
