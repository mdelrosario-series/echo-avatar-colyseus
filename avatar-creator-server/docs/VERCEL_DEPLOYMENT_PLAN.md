# Plan: Running Avatar Creator on Vercel

This document outlines how to turn the avatar-creator directory into a service that can run on Vercel, based on the current [README](../README.md) and implementation.

---

## 1. How the project works today

From the README and codebase:

- **Pipeline**: 2D character image → **Gemini** (image prep) → **3D API** (Rodin/Hunyuan/Trellis) → **Blender** (scale, retopo, rig transfer) → final rigged model (FBX/GLB/blend).
- **Web app** (`web/server.py`): Python `HTTPServer` that:
  - Serves static files from `web/` (index.html, admin, admin_login).
  - **APIs**: `/api/process` (Gemini only), `/api/generate3d` (full pipeline), `/api/job/<id>`, `/api/outputs`, `/api/generate-blend`, plus admin login/config/settings/cleanup.
- **Heavy parts**:
  - **Blender** is invoked via `subprocess` for: scale (`step3_scale.py`), rig transfer (`step5_rig_transfer.py`), and comparison blend (`save_comparison_blend.py`). Timeouts are 300s.
  - **Rodin** flow: submit task → poll status (up to 300s) → download results.
  - **State**: In-memory `jobs` dict and `admin_sessions`, and **filesystem** (`models/`, `output/`, `templates/`, `.env` read/write).

So the app depends on: **Blender binary**, **long-running work** (minutes), **persistent filesystem**, and **in-process state**.

---

## 2. Vercel constraints (why you can’t “lift and shift”)

| Constraint | Impact on this project |
|------------|------------------------|
| **Serverless functions** | No long-lived process; each request is a new invocation. Default timeout 10s (Hobby), 60s (Pro), 300s (Enterprise). |
| **No persistent filesystem** | `models/`, `output/`, `.env` writes are ephemeral. You cannot rely on writing files and serving them later from the same deployment. |
| **No Blender** | You cannot install or run Blender in Vercel’s runtime. Scale, rig transfer, and .blend creation require Blender. |
| **Stateless** | In-memory `jobs` and `admin_sessions` are lost between invocations. You need external storage (DB, KV, or external service). |
| **Request/response model** | The “submit job → poll /api/job/<id>” pattern can stay, but the **work** must run somewhere else or be split across multiple serverless calls with external state. |

So: **the full pipeline as implemented today cannot run entirely on Vercel.** You need to split “what runs on Vercel” from “what runs elsewhere (Blender + long-running 3D pipeline).”

---

## 3. Possible approaches

### Option A: Vercel for frontend + “light” API only

- **On Vercel**: Static site (existing `web/*.html`) + serverless API that only does:
  - **Gemini image processing** (`/api/process`) — fits in a single serverless request (seconds).
- **Not on Vercel**: Full 3D pipeline (Rodin + Blender) stays on a machine where you run `web/server.py` (e.g. your laptop, a VPS, or Railway/Fly.io). Users who want 3D use the “full” server; Vercel is for demos or Gemini-only flows.

**Pros**: Minimal changes; clear split.  
**Cons**: 3D generation is not on Vercel; you run two “modes” (Vercel vs full server).

---

### Option B: Vercel + external “pipeline worker” (recommended for “service on Vercel”)

- **On Vercel**:
  - **Static**: Serve `web/index.html`, `web/admin.html`, `web/admin_login.html` (and assets) via Vercel’s static hosting or a catch-all.
  - **Serverless API** (Python or Node):
    - **Auth**: Admin login/logout; store sessions in **Vercel KV** (or cookies + signed tokens and KV for revocation).
    - **Config**: Read config from **env vars** only (no `.env` file writes). Optional: store non-secret settings in Vercel KV.
    - **Gemini**: `/api/process` — call Gemini and return the result (no Blender, no Rodin in this path).
    - **3D “submit”**: `/api/generate3d` — validate input, generate a **job ID**, store job metadata (e.g. “pending”) in **Vercel KV** (or a small DB), push a message to a **queue** (e.g. **Inngest**, **Trigger.dev**, or **QStash**) with job ID + image (or URL to image in **Vercel Blob** / S3). Return `{ job_id }` immediately.
    - **Polling**: `/api/job/<id>` — read job status and result URLs from KV/DB. When the worker has finished, it writes “done” and output URLs (e.g. Blob or external storage) into the same store.
    - **Outputs list**: `/api/outputs` — list from KV/DB or from external storage (e.g. list Blob objects by prefix).
    - **File download**: Either redirect to **Vercel Blob** (or S3) URLs, or a tiny serverless function that proxies the download from your storage.
  - **No Blender, no long Rodin polling** on Vercel.

- **Off Vercel (pipeline worker)**:
  - One long-running process (or a worker that runs on a schedule or is triggered by the queue): same logic as today’s `generate_3d_rodin()` in `server.py`: Rodin submit → poll → download → **run Blender** (scale, rig, blend) on a **VM or container** that has Blender installed (e.g. Railway, Fly.io, or a small VPS).
  - Worker reads job from queue, downloads image from Blob (or URL), runs pipeline, uploads results (GLB, FBX, blend) to **Vercel Blob** (or S3), then updates job in KV/DB to “done” with file URLs.

**Pros**: “The service” is on Vercel (frontend + API + job queue + storage); only the heavy, Blender-dependent part runs elsewhere.  
**Cons**: You must run and maintain the pipeline worker and storage (Blob/S3).

---

### Option C: Don’t use Vercel for the pipeline

- Keep the current `web/server.py` and run it on **Railway**, **Fly.io**, **Render**, or a **VPS** where Blender is installed.
- Use Vercel only if you want a separate marketing/frontend site that links to this backend.

**Pros**: Fewest code changes.  
**Cons**: The “service” is not on Vercel; it’s on another platform.

---

## 4. Recommended direction: Option B (Vercel + pipeline worker)

To have a **single service** that “lives” on Vercel but still does the full pipeline:

1. **Vercel**
   - Static: `web/` as the frontend.
   - Serverless: implement the API routes above (process, generate3d, job, outputs, config, admin) using **Vercel KV** for jobs and sessions, **Vercel Blob** (or S3) for uploaded images and output files, and **env vars** for secrets (no `.env` file).
   - No Blender, no subprocess; no writing to local disk for persistence.

2. **Pipeline worker**
   - Deploy the current Blender-based pipeline (Rodin + `step3_scale`, `step5_rig_transfer`, `save_comparison_blend`) on a host that has Blender (e.g. Docker image with Blender + Python, on Railway/Fly/VM).
   - Worker is triggered by queue (e.g. Inngest/Trigger.dev/QStash) or by HTTP from Vercel (with a secret); it pulls job payload, runs `generate_3d_rodin`-style steps, uploads artifacts to Blob/S3, updates job in KV.

3. **Templates**
   - `templates/rig.fbx` must be available to the worker (bundle in the worker image or fetch from a known URL/Blob at startup).

---

## 5. Implementation steps (high level)

### Phase 1: Run “Gemini only” on Vercel (fast path)

1. Add **Vercel** to the project:
   - `vercel.json`: static from `web/`, rewrites for `/api/*` to serverless.
   - `api/` directory with serverless handlers (e.g. `api/process.py` or `api/process/index.py` for `/api/process`).
2. Implement **one** serverless function that:
   - Loads `GEMINI_API_KEY` from env.
   - Parses multipart body (image + prompt), calls existing Gemini logic (e.g. copy from `server.py` + `lib/gemini.py`), returns JSON with base64 image.
3. No job store yet; no 3D. Frontend can call this so “Process with Gemini” works on Vercel.

### Phase 2: Add storage and job model

4. Create **Vercel KV** store; add `KV_REST_API_*` and `BLOB_READ_WRITE_TOKEN` (or S3) to env.
5. Define job schema in KV (e.g. `job:<id>`: `{ status, createdAt, result?: { glb_url, fbx_url, ... } }`).
6. Implement **admin session** in KV (e.g. `session:<token>` with TTL) so login state survives across serverless invocations.

### Phase 3: 3D submit and poll (no worker yet)

7. **POST /api/generate3d**: Decode image, upload to **Vercel Blob**, create `job:<id>` in KV with `status: "queued"`, return `job_id`. (Do **not** run Rodin/Blender yet.)
8. **GET /api/job/<id>**: Read from KV and return status/result. For now, jobs stay “queued” or you simulate “error” (e.g. “worker not configured”).

### Phase 4: Pipeline worker

9. **Worker repo/container**: Script or small app that:
   - Listens to queue (e.g. Inngest event) or HTTP endpoint with secret.
   - Payload: `job_id`, image URL (Blob).
   - Runs: download image → Rodin submit → poll → download GLB → Blender scale → Blender rig → (optional) save_comparison_blend.
   - Uploads GLB/FBX/blend to Blob; sets `job:<id>` in KV to `done` with `glb_url`, `fbx_url`, etc.
10. Deploy worker to Railway/Fly/VM with Blender; configure queue or webhook from Vercel (e.g. Inngest client in serverless “generate3d” to enqueue the job).

### Phase 5: Wire frontend and admin

11. **Frontend**: Ensure `index.html` and admin pages call the same API paths; base URL can be relative so it works on Vercel.
12. **Config**: Admin config (API keys, prompt prefix) stored in KV or env; no `.env` file writes. Use Vercel project env vars for secrets.
13. **Outputs**: `/api/outputs` reads from KV or lists Blob by prefix; download links point to Blob URLs (or a proxy that streams from Blob).

### Phase 6: Cleanup and docs

14. Remove or guard any code that assumes a single long-lived process (e.g. in-memory `jobs`/`admin_sessions`) or writing to local `models/` or `output/` in production.
15. Document in README: “Production: deploy frontend + API to Vercel; run pipeline worker separately with Blender.”

---

## 6. File and config changes (summary)

| Area | Current | On Vercel |
|------|--------|-----------|
| **Config** | `.env` file read/write | Env vars only; optional KV for non-secret settings |
| **Jobs** | In-memory `jobs` dict | Vercel KV (or DB) |
| **Sessions** | In-memory `admin_sessions` | Vercel KV with TTL |
| **Uploaded image** | `models/job{id}_source.png` | Vercel Blob (or S3) |
| **Output files** | `output/`, `models/` on disk | Vercel Blob (or S3); URLs in job result |
| **Templates** | `templates/rig.fbx` on disk | In worker image or fetched from Blob/URL |
| **Blender** | `subprocess.run(["blender", ...])` | Only in pipeline worker (not on Vercel) |
| **Server** | Single `HTTPServer` in `server.py` | Vercel serverless functions under `api/` |

---

## 7. What stays off Vercel

- **Blender** and any script that runs inside Blender (`step3_scale.py`, `step5_rig_transfer.py`, `save_comparison_blend.py`, `lib/blender_utils.py`) — run only in the pipeline worker.
- **Long Rodin polling** (e.g. 300s) — run in the worker, not in a serverless function (to avoid timeout and cost).
- **Persistent disk** for `models/` and `output/` — replaced by Blob (or S3) and optionally a small DB or KV for metadata.

---

## 8. Minimal Vercel layout (for Phase 1)

Example structure:

```text
avatar-creator/
  vercel.json
  api/
    process/
      index.py      # or index.ts — handles POST /api/process (Gemini only)
    job/
      [id].py      # GET /api/job/<id> (reads from KV later)
  web/
    index.html
    admin.html
    admin_login.html
  scripts/
    lib/
      gemini.py    # used by api/process
```

`vercel.json` example:

```json
{
  "buildCommand": null,
  "outputDirectory": "web",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/(.*)", "destination": "/$1" }
  ]
}
```

(Exact rewrites depend on whether you use `api/` with file-based routing; adjust so `/api/process` and `/api/job/[id]` map to the right serverless handlers.)

---

## 9. Summary

- **README**: Pipeline = Gemini → 3D API → Blender (scale, retopo, rig) → outputs.
- **Blender and long-running 3D work cannot run on Vercel.** To run “the service” on Vercel you split it into:
  - **Vercel**: Frontend + serverless API (Gemini, job submit/poll, admin, config) + KV + Blob.
  - **Pipeline worker** (elsewhere): Rodin + Blender steps, then upload results to Blob and update job in KV.

The plan above (Option B + phased steps) is a concrete path to turn this directory into a Vercel-hosted service with the full pipeline running in a separate worker.
