# Avatar Creator API (v1)

External apps can generate a character image from a prompt, then generate a 3D model (GLB) from that image.

**Base URL:** `https://your-app.vercel.app` (your Vercel deployment).

---

## Authentication (optional)

If you set **`API_SECRET`** or **`AVATAR_API_KEY`** in your Vercel project env, all v1 endpoints require:

```http
Authorization: Bearer <your-api-secret>
```

If neither env var is set, the v1 endpoints are open (no auth).

---

## 1. Generate image from prompt

**`POST /api/v1/image`**

Returns a character image generated from a text prompt (and optional base image).

### Request

- **Content-Type:** `application/json`
- **Body:**
  - `prompt` (string, required) – e.g. `"a red haired warrior"`
  - `image` (string, optional) – base64-encoded PNG/JPEG. If omitted, **`DEFAULT_CHARACTER_IMAGE_URL`** must be set in Vercel env (we fetch that image as the base).

### Response

- **200** – `{ "image": "<base64>", "image_url": "<optional public URL>" }`  
  - `image_url` is set when we upload the result to Blob; use it for the next step to avoid re-sending base64.

- **400** – Missing prompt, invalid image, or no image and no default URL.
- **401** – Invalid or missing API key (if auth is enabled).
- **503** – `GEMINI_API_KEY` not configured.

### Example

```bash
curl -X POST "https://your-app.vercel.app/api/v1/image" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -d '{"prompt": "a red haired warrior"}'
```

Use the returned `image` (base64) or `image_url` in the next step.

---

## 2. Generate 3D model from image

**`POST /api/v1/model`**

Starts 3D model generation (Rodin → scale → rig). Returns a **job ID**; poll for completion, then use **`result.glb_url`** for the GLB.

### Request

- **Content-Type:** `application/json`
- **Body (one of):**
  - `image` (string) – base64-encoded PNG.
  - `image_url` (string) – public URL of the image (e.g. from step 1’s `image_url`).

### Response

- **200** – `{ "job_id": "1234567890-abc12345" }`
- **400** – No image or image_url.
- **401** – Invalid or missing API key (if auth is enabled).
- **503** – Worker not configured (`WORKER_URL` / `WORKER_SECRET`).

### Poll for result

**`GET /api/job/:id`**

- Replace `:id` with `job_id` from the previous response.
- **200** – Job object, e.g.:
  - `status`: `"queued"` | `"submitting"` | `"rigging"` | … | `"done"` | `"error"`
  - When **`status === "done"`**: `result.glb_url` (GLB), `result.fbx_url` (FBX), optionally `result.blend_url`.
  - When **`status === "error"`**: `error` (string).

Poll every few seconds until `status` is `"done"` or `"error"`, then use `result.glb_url` to download the GLB.

### Example

```bash
# Start model generation (use image_url from step 1)
curl -X POST "https://your-app.vercel.app/api/v1/model" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -d '{"image_url": "https://xxx.public.blob.vercel-storage.com/v1/preview-xxx.png"}'

# Poll (replace JOB_ID)
curl "https://your-app.vercel.app/api/job/JOB_ID"
```

---

## End-to-end flow

1. **POST /api/v1/image** with `{ "prompt": "your description" }` (and optional `image` or set `DEFAULT_CHARACTER_IMAGE_URL`).
2. User sees the returned image (or `image_url`). If they’re happy, continue.
3. **POST /api/v1/model** with `{ "image_url": "<from step 1>" }` or `{ "image": "<base64>" }`.
4. **GET /api/job/:job_id** until `status === "done"`.
5. Download the GLB from `result.glb_url`.

---

## Environment variables (Vercel)

| Variable | Required for v1 | Description |
|----------|------------------|-------------|
| `GEMINI_API_KEY` | Image step | Gemini for image generation |
| `DEFAULT_CHARACTER_IMAGE_URL` | Image step (if no image in body) | Public URL of a base character image |
| `WORKER_URL` / `WORKER_SECRET` | Model step | Fly.io worker |
| `API_SECRET` or `AVATAR_API_KEY` | Optional | If set, required as `Authorization: Bearer <value>` on v1 endpoints |
