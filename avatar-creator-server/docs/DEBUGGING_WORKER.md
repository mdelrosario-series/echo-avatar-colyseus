# Debugging the Fly worker pipeline

When the pipeline fails (e.g. "rigged FBX not found" after step5, or scale step producing no file), use this to see **what** is failing instead of guessing.

## What we added for debugging

1. **Blender stdout/stderr in logs** – The worker now prints Blender’s full stdout and stderr for every Blender run, so you see script prints and any Blender errors.
2. **Python exceptions in step3/step5** – The GLB import in step3 and step5 is wrapped in `try/except`. If the failure is a **Python exception** (e.g. in the glTF importer), you’ll see `STEP3 IMPORT FAILED (Python exception):` or `STEP5 IMPORT NEW MESH FAILED (Python exception):` plus a full traceback in the Fly logs.
3. **Minimal repro script** – `scripts/debug_import_glb.py` only imports one GLB. Use it to isolate whether the failure is in the import itself and whether it’s Python vs C-level.

## How to interpret the logs

- **You see a Python traceback** (e.g. `STEP5 IMPORT NEW MESH FAILED` + traceback)  
  → The failure is in Python (e.g. glTF addon, our code). Fix the exception or the code path it points to.

- **You see "About to import..." / "Importing new mesh..." but then "Blender quit" and no traceback**  
  → The process is exiting or crashing **inside** the import (often C-level, e.g. Blender’s glTF importer or driver). Python never gets to raise. Next steps:
  - Run the **minimal debug script** with the same GLB (on Fly or in the same Docker image) to confirm it’s the import.
  - Try the same GLB in Blender locally (same or newer version) to see if it’s environment-specific (e.g. headless, libs).
  - If the debug script also quits with no traceback after "About to import...", it’s almost certainly a crash in Blender’s C code when loading that file (or that file on that environment).

## Running the minimal debug script

Use this to test “does importing this one GLB work?” in the same environment as the worker.

### On Fly (SSH into the worker)

1. Deploy the app so the machine has the latest code (including `scripts/debug_import_glb.py`).
2. Get a GLB to test. For example, from a failed job you can download the raw GLB from the job’s `raw.glb` URL (Vercel Blob) and upload it somewhere the worker can reach, or use a known-good path if you already have one on the volume.
3. SSH into the Fly machine and run Blender with the debug script:

   ```bash
   fly ssh console -a <your-worker-app-name>
   ```

   Then inside the console (paths may differ; adjust if your app uses different dirs):

   ```bash
   # If you have a GLB at /tmp/models from a recent job:
   blender --background --python /app/scripts/debug_import_glb.py -- /tmp/models/job1772191584986-lrg9e77n_raw_base_basic_pbr.glb
   ```

   Or download a GLB first (if you have a URL):

   ```bash
   curl -o /tmp/test.glb "https://your-blob-url/raw.glb"
   blender --background --python /app/scripts/debug_import_glb.py -- /tmp/test.glb
   ```

4. Check the output:
   - **"Import OK"** and mesh counts → import works in this environment; the bug is likely elsewhere (e.g. later in the script or a different code path).
   - **Traceback** → Python exception; fix that.
   - **"About to import..." then process exits with no traceback** → Likely C-level crash or Blender quit during import; try same file locally or different Blender/env.

### Locally (same Docker image as Fly)

Build and run the worker image, then run the debug script with a GLB path that exists in the container (e.g. bind-mount a file):

```bash
docker build -t avatar-worker -f worker/Dockerfile .
docker run --rm -v /path/to/your/file.glb:/tmp/test.glb avatar-worker \
  blender --background --python /app/scripts/debug_import_glb.py -- /tmp/test.glb
```

Interpret the output the same way as on Fly.

### Locally (Blender installed on your machine)

If your coworker runs Blender 4.3 locally and it works, they can run the same script with the failing GLB:

```bash
blender --background --python scripts/debug_import_glb.py -- /path/to/job..._raw_base_basic_pbr.glb
```

If it **succeeds** locally but **fails on Fly** (no traceback, just quit), the difference is environment (headless, libs, or Blender build). If it **fails the same way** locally, they’ll see the traceback or crash there, which you can use to fix the importer or the file.

## Summary

| What you see in logs | Likely cause | What to do next |
|----------------------|--------------|------------------|
| Python traceback after "IMPORT FAILED" | Exception in our code or glTF addon | Fix the code path in the traceback |
| "Importing new mesh" / "About to import" then "Blender quit", no traceback | Crash or quit inside Blender (often C) | Run `debug_import_glb.py` with same GLB; compare Blender version and environment (Fly vs local) |
| "STEP3: import_model() returned" or "STEP5: import_model(new mesh) returned" | Import succeeded | Failure is later in the pipeline; check logs after that line |
