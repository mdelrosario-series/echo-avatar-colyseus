# Deploying Avatar Creator: Vercel + Fly.io

The app is split so that **Vercel** hosts the frontend and serverless API (Gemini, job queue, admin), and **Fly.io** runs the **pipeline worker** (Blender + Meshy) that does 3D generation.

---

## 1. What runs where

| Component | Platform | Notes |
|-----------|----------|--------|
| Static site (`web/*.html`) | Vercel | Served from `web/` |
| `/api/process` (Gemini image) | Vercel | Serverless, needs `GEMINI_API_KEY` |
| `/api/generate3d`, `/api/job/:id`, `/api/outputs` | Vercel | Job state in Vercel KV; images/outputs in Vercel Blob |
| Admin APIs (login, config, settings, cleanup) | Vercel | Sessions and settings in Vercel KV |
| Pipeline worker (Meshy → Scale → Rig → Blend) | Fly.io | One machine with Blender; triggered by Vercel |

---

## 2. Deploy to Vercel

### 2.1 Prerequisites

- Vercel account
- In the Vercel project: create **Vercel KV** (Redis) and **Vercel Blob** stores (Storage tab). This gives you `KV_REST_API_URL`, `KV_REST_API_TOKEN`, and `BLOB_READ_WRITE_TOKEN` (auto-added to env).

### 2.2 Environment variables (Vercel)

In the Vercel project **Settings → Environment Variables**, set:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | For `/api/process` (Gemini image step) |
| `GEMINI_PROMPT_PREFIX` | No | Default prompt prefix (optional) |
| `GEMINI_MODEL` | No | Default `gemini-3-pro-image-preview` |
| `ADMIN_USER` | No | Admin login username (default `admin`) |
| `ADMIN_PASS` | Yes (for admin) | Admin login password |
| `WORKER_URL` | Yes (for 3D) | Full URL of the Fly.io worker, e.g. `https://avatar-creator-worker.fly.dev` |
| `WORKER_SECRET` | Yes (for 3D) | Shared secret; same value must be set on Fly.io |

KV and Blob env vars are added automatically when you create those stores and link them to the project.

### 2.3 Deploy

From the repo root:

```bash
npm install
vercel
# or: vercel --prod
```

Static files are served from `web/`; API routes live under `api/`.

### 2.4 Optional: base character image

The main page can load a base character image from `/base_character.png`. Put a file at `web/base_character.png` if you want that.

---

## 3. Deploy the worker to Fly.io

**Detailed walkthrough:** See **[docs/FLY_IO_SETUP.md](FLY_IO_SETUP.md)** for step-by-step Fly.io setup (CLI install, login, rig template, secrets, deploy).

### 3.1 Prerequisites

- Fly.io account and `flyctl` installed
- **Meshy API key** (for image-to-3D generation)
- **Templates**: add your rig template so the worker can do rig transfer:
  - Create or ensure `templates/` exists and add `templates/rig.fbx` (your base rig). The repo has `templates/.gitkeep`; add `rig.fbx` there before building.

### 3.2 Environment variables (Fly.io)

Set secrets on the Fly app (same `WORKER_SECRET` as on Vercel, KV for job status, and Blob token for uploads):

```bash
fly secrets set WORKER_SECRET="<same-as-vercel>"
fly secrets set APP_URL="https://<your-vercel-app>.vercel.app"
fly secrets set MESHY_API_KEY="<your-meshy-api-key>"
fly secrets set KV_REST_API_URL="<from-vercel-kv-store>"
fly secrets set KV_REST_API_TOKEN="<from-vercel-kv-store>"
fly secrets set BLOB_READ_WRITE_TOKEN="<from-vercel-blob-store>"
```

Get `KV_REST_API_URL` and `KV_REST_API_TOKEN` from the Vercel dashboard (Storage → your KV store).  
Get **`BLOB_READ_WRITE_TOKEN`** from Storage → your Blob store (same value as in Vercel). The worker uses it to upload GLB/FBX/blend **directly** to Blob, avoiding Vercel’s 4.5 MB API body limit (otherwise you get 413 on large files).

### 3.3 Deploy

From the **repo root** (so `scripts/`, `worker/`, and `templates/` are in build context):

```bash
fly launch   # first time only: creates app, use existing fly.toml
# or if app already exists:
fly deploy
```

The Dockerfile is `worker/Dockerfile`; it installs Blender and Python, copies `scripts/`, `worker/`, and `templates/`, and runs the worker HTTP server.

### 3.4 Worker URL

After deploy, note the app URL (e.g. `https://avatar-creator-worker.fly.dev`). Set this in Vercel as **`WORKER_URL`** (no trailing slash).

---

## 4. End-to-end flow

1. User opens the Vercel app → static site and API are on Vercel.
2. **Process with Gemini**: `POST /api/process` runs on Vercel (serverless), returns processed image.
3. **Generate 3D**: `POST /api/generate3d` on Vercel:
   - Stores the image in Vercel Blob
   - Creates a job in Vercel KV with status `queued`
   - Calls the Fly.io worker at `WORKER_URL/run` with `job_id` and `image_url`
   - Returns `job_id` to the client
4. Client polls `GET /api/job/:id` on Vercel; job state is updated in KV by the worker.
5. Worker (Fly.io):
   - Downloads the image from the Blob URL
   - Runs Meshy → Scale → Rig → Blend (Blender)
   - Uploads GLB/FBX/blend to Vercel Blob via `POST /api/worker/upload` (with `WORKER_SECRET`)
   - Updates the job in KV to `done` with result URLs
6. Frontend uses the result URLs (Blob) for download and GLB viewer.

---

## 5. Local development

- **Vercel (frontend + API)**: `vercel dev` from repo root (uses `web/` and `api/`).
- **Worker**: Run the Python server locally with the same env vars (and Blender installed):

  ```bash
  cd worker
  pip install -r requirements.txt
  export WORKER_SECRET=dev SECRET
  export APP_URL=http://localhost:3000
  export MESHY_API_KEY=...
  export KV_REST_API_URL=...
  export KV_REST_API_TOKEN=...
  python server.py
  ```

  Then set Vercel’s `WORKER_URL` to your tunnel (e.g. ngrok) to that server if you want to test 3D from local Vercel.

- **Monolith (unchanged)**: You can still run `python web/server.py` locally for the original single-server setup (no Vercel/Fly).

---

## 6. Checklist

- [ ] Vercel: KV + Blob stores created and linked
- [ ] Vercel: `GEMINI_API_KEY`, `ADMIN_PASS`, `WORKER_URL`, `WORKER_SECRET` set
- [ ] Fly.io: `WORKER_SECRET`, `APP_URL`, `MESHY_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `BLOB_READ_WRITE_TOKEN` set
- [ ] `templates/rig.fbx` present before building the worker image
- [ ] After first Fly deploy, set Vercel’s `WORKER_URL` to the Fly app URL
