# bissel-modern Runbook

Operational notes and developer guide for working on the bot.

---

## ⚙️ Prerequisites

- Node.js LTS (v20+ recommended)
- npm v9+
- Discord application with bot token

---

## 🛠️ Setup

1. Clone repo
2. Install dependencies:

   ```bash
   npm install
    ```

3. Copy `.env.example` to `.env`  & `config.example.json` to `config.json`.
4. Fill in the required secrets in `.env` (Discord bot token).
5. Configure `config.json` (guild IDs, roles, prefixes, level curve).
6. (Optional) Install `pm2` or set up a `systemd` service for process management.


---

## ▶️ Running Locally

```bash
# Build once (Production mode)
npm run build

# Start the bot (Production mode, runs compiled JS)
npm start

# Start the bot in development mode (with hot reload)
npm run dev
```

Expected output:

```bash
"Ready! Logged in as Bissel Modern#1234" in Console
```

## 🛠️ Release & Deploy

1. Ensure all changes are committed and pushed to main.
2. Tag a new release in Git (e.g., `v0.1.0`).
3. Install dependencies:

   ```bash
   git pull origin main
    ```

4. Install any new dependencies:

   ```bash
   npm install 
   # or
   npm ci
   ```

5. Build the project:

   ```bash
   npm run build
   ```

6. Restart the bot process:
  
    ```bash
    pm2 restart bissel-modern
    # or
    systemctl restart bissel-modern
    ```

---

## 🔑 Secrets

- `.env` is **not committed**.
- Example:

  ```bash
  DISCORD_TOKEN=your-bot-token-here
  ```

---

## 🔄 Common Commands

- `npm run dev` — start development bot
- `npm run lint` — lint with ESLint
- `npm run format` — format with Prettier
- `npm run build` — compile TypeScript
- `npm start` — start production bot
- `npm prestart` — build before starting in production mode

---

## 📂 File Structure

```plain
/src        → bot source code
/docs       → documentation
.env        → secrets (ignored)
```

---

## 🚨 Notes

- Do not commit `.env`.
- Update `config.json` instead of hardcoding guild/role IDs.
- Keep personality strings in `/src/personality/`.
