# Fly.io setup: step-by-step

This guide gets the **pipeline worker** (Blender + Rodin) running on Fly.io from scratch: install CLI, log in, prepare the repo, create the app, set secrets, and deploy.

---

## 1. Install the Fly CLI

You need **flyctl** (the Fly.io CLI). Use one of the options below.

**macOS (Homebrew):**
```bash
brew install flyctl
```

**macOS / Linux (install script):**
```bash
curl -L https://fly.io/install.sh | sh
```
Then restart your terminal or run `source ~/.bashrc` (or `source ~/.zshrc`) so `fly` is on your PATH.

**Windows (PowerShell):**
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

Check it works:
```bash
fly version
```

---

## 2. Log in to Fly.io

Authenticate the CLI with the same account you use on the Fly.io website:

```bash
fly auth login
```

A browser window will open. Sign in (or sign up) and approve the CLI. When it says you’re logged in, you’re done.

Optional check:
```bash
fly auth whoami
```

---

## 3. Rig template (`templates/rig.fbx`)

The worker needs a **rig template** at `templates/rig.fbx` for the Blender rig-transfer step. The repo expects this path but **does not commit** `rig.fbx` (it’s in `.gitignore`).

- **If you already have `templates/rig.fbx` locally** (e.g. you use it with the Python server), you’re set. When you run `fly deploy` from this machine, the Docker build uses your local files, so `rig.fbx` will be included in the image.
- **If you don’t have it:** put your base rig file at `templates/rig.fbx` (the same rig you use for rig transfer locally), then run `fly deploy` from the repo root.
- **If you deploy from CI or a clean clone** (where `rig.fbx` isn’t present because it’s gitignored), you’ll need to add a build step that provides `templates/rig.fbx` (e.g. from a secret or artifact) before building the image.

Without a valid `templates/rig.fbx` in the build context, the image build still succeeds, but the **rig transfer** step will fail at runtime until you add it and redeploy.

---

## 4. Go to the project root

All Fly commands must be run from the **repo root** (where `fly.toml`, `scripts/`, `worker/`, and `templates/` live), not from `worker/`:

```bash
cd /path/to/avatar-creator
```

---

## 5. Create the Fly app (first time only)

From the repo root:

```bash
fly launch
```

The CLI will:

1. **Detect Dockerfile** – It should find `worker/Dockerfile` from `fly.toml` (build.dockerfile = "worker/Dockerfile").
2. **Ask for an app name** – You can press Enter to accept the default from `fly.toml` (`avatar-creator-worker`), or type another name (e.g. `my-avatar-worker`). The name becomes part of the URL: `https://<app-name>.fly.dev`.
3. **Ask for a region** – Choose a region close to you (e.g. `iad` for US East, `lhr` for London). You can change it later.
4. **Ask to create a Postgres or Redis** – Answer **No** (we don’t need them; KV is on Vercel).
5. **Deploy** – It may run a first deploy. You can let it run or cancel; we’ll set secrets and redeploy in the next steps.

If it says “app already exists” or you’ve already run `fly launch` before, skip to step 6 and use `fly deploy` when we deploy.

---

## 6. Gather values for secrets

You’ll set these as **Fly secrets** (they’re encrypted and not visible in the dashboard). Collect:

| Secret | Where to get it |
|--------|------------------|
| **WORKER_SECRET** | Same string you set on **Vercel** for `WORKER_SECRET`. Use a long random value, e.g. `openssl rand -hex 32`. |
| **APP_URL** | Your Vercel app URL, e.g. `https://avatar-creator-xxxx.vercel.app` (no trailing slash). |
| **MESHY_API_KEY** | Your Meshy API key for image-to-3D generation ([Meshy](https://www.meshy.ai/) dashboard). |
| **KV_REST_API_URL** | From **Vercel** → your project → **Storage** → your KV/Redis store → copy “REST URL” or the URL from the store’s env vars. |
| **KV_REST_API_TOKEN** | From the same KV store → “REST Token” or the token from the store’s env vars. |
| **BLOB_READ_WRITE_TOKEN** | From Vercel → Storage → your Blob store (same token as in Vercel). Required for large uploads; avoids 413. |

Make sure **WORKER_SECRET** is identical on Vercel and Fly.

---

## 7. Set secrets on the Fly app

From the repo root, run (replace the placeholders with your real values):

```bash
fly secrets set WORKER_SECRET="your-same-secret-as-on-vercel"
fly secrets set APP_URL="https://your-vercel-app.vercel.app"
fly secrets set MESHY_API_KEY="your-meshy-api-key"
fly secrets set KV_REST_API_URL="https://xxx.upstash.io"
fly secrets set KV_REST_API_TOKEN="your-kv-token"
fly secrets set BLOB_READ_WRITE_TOKEN="your-blob-token-from-vercel"
```

You can set them one by one (as above) or in one go:

```bash
fly secrets set \
  WORKER_SECRET="your-secret" \
  APP_URL="https://your-app.vercel.app" \
  MESHY_API_KEY="your-meshy-api-key" \
  KV_REST_API_URL="https://xxx.upstash.io" \
  KV_REST_API_TOKEN="your-kv-token" \
  BLOB_READ_WRITE_TOKEN="your-blob-token"
```

**Note:** Setting a secret triggers a new deploy. After the first deploy (step 8), you can add or change secrets anytime with the same commands.

---

## 8. Deploy the worker

From the repo root:

```bash
fly deploy
```

This will:

- Build the Docker image (Ubuntu + Blender + Python + your `scripts/`, `worker/`, `templates/`).
- Push it to Fly and start the app.
- Expose it at `https://<your-app-name>.fly.dev`.

The first build can take several minutes (Blender and dependencies are large). Watch the logs; when it says the release is complete, the app is live.

---

## 9. Get the worker URL and check it

1. **Worker URL**
   ```bash
   fly status
   ```
   Or open the app in the browser:
   ```bash
   fly open
   ```
   The URL is: **`https://<app-name>.fly.dev`** (e.g. `https://avatar-creator-worker.fly.dev`).

2. **Set it on Vercel**  
   In your **Vercel** project → **Settings → Environment Variables**, add or update:
   - **WORKER_URL** = `https://<your-app-name>.fly.dev` (no trailing slash).

3. **Optional: quick health check**  
   The worker only responds to `POST /run` with the right secret, so a plain browser open might show “Not Found” or similar. That’s expected. What matters is that Vercel can reach this URL when it calls the worker.

---

## 10. View logs (optional)

To watch worker logs (e.g. when you run a 3D job):

```bash
fly logs
```

Press Ctrl+C to stop. To stream logs in real time:

```bash
fly logs -a avatar-creator-worker
```

(Use your app name if you chose a different one.)

---

## Summary checklist

- [ ] **flyctl** installed and **fly auth login** done.
- [ ] **templates/rig.fbx** present locally (so it’s in the Docker build when you run `fly deploy`), or accept that rig transfer will fail until you add it.
- [ ] In repo root: **fly launch** (once), then **fly secrets set** for all six vars (including **BLOB_READ_WRITE_TOKEN** for large uploads).
- [ ] **fly deploy** and wait for a successful release.
- [ ] Note **worker URL** and set **WORKER_URL** on Vercel to that URL (no trailing slash).

After that, when someone uses “Generate 3D” on the Vercel app, Vercel will call this Fly app with the job; the worker will run Rodin + Blender and push results back to Vercel Blob and KV.
