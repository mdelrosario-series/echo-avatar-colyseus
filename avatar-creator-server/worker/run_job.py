#!/usr/bin/env python3
"""Run the full 3D pipeline for a job: Meshy -> Scale -> Rig -> Blend, then upload and update KV."""
import os
import sys
import time
import subprocess
from pathlib import Path

# Repo root (parent of worker/)
REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from lib.meshy import submit_task, poll_status, download_results

MODELS_DIR = Path(os.environ.get("WORKER_MODELS_DIR", "/tmp/models"))
OUTPUT_DIR = Path(os.environ.get("WORKER_OUTPUT_DIR", "/tmp/output"))
TEMPLATES_DIR = Path(os.environ.get("TEMPLATES_DIR", str(REPO_ROOT / "templates")))


def run_blender_script(script_name: str, args: list, label: str = "") -> tuple[bool, str]:
    script = str(SCRIPTS_DIR / script_name)
    cmd = ["blender", "--background", "--python", script, "--"] + [str(a) for a in args]
    print(f"[{label}] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, cwd=str(REPO_ROOT))
    # Always surface Blender stdout/stderr so we can see what went wrong (e.g. FBX export errors)
    if result.stdout:
        tail = result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout
        print(f"[{label}] Blender stdout:\n{tail}")
    if result.stderr:
        tail = result.stderr[-3000:] if len(result.stderr) > 3000 else result.stderr
        print(f"[{label}] Blender stderr:\n{tail}")
    if result.returncode != 0:
        err = (result.stderr or "Blender failed")[-500:]
        print(f"[{label}] FAILED (exit %s): %s" % (result.returncode, err))
        return False, err
    print(f"[{label}] Done")
    return True, result.stdout or ""


def run_pipeline(job_id: str, image_bytes: bytes, source_image_path: str, upload_fn, kv_update_fn) -> None:
    """Run Meshy -> Scale -> Rig -> Blend, upload artifacts, update KV. Raises on failure."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    meshy_key = os.environ.get("MESHY_API_KEY")
    if not meshy_key:
        raise RuntimeError("MESHY_API_KEY not set")

    # Try meshy-4 first (faster/more reliable), fall back to meshy-5 on failure
    MESHY_MODELS = ["meshy-4", "meshy-5"]
    meshy_success = False
    task_id = None

    kv_update_fn(job_id, status="submitting")
    for attempt, model in enumerate(MESHY_MODELS):
        try:
            task = submit_task(
                api_key=meshy_key,
                image_bytes=image_bytes,
                filename="character.png",
                mime_type="image/png",
                ai_model=model,
            )
            task_id = task["job_id"]
            print(f"[Job {job_id}] Meshy attempt {attempt + 1} ({model}), task ID: {task_id}")
            kv_update_fn(job_id, status="generating")
            if poll_status(meshy_key, task_id, timeout_sec=300):
                meshy_success = True
                break
            print(f"[Job {job_id}] Meshy attempt {attempt + 1} ({model}) failed.")
        except Exception as e:
            print(f"[Job {job_id}] Meshy attempt {attempt + 1} ({model}) exception: {e}")
        if attempt < len(MESHY_MODELS) - 1:
            print(f"[Job {job_id}] Retrying with next model in 10s...")
            time.sleep(10)

    if not meshy_success:
        fallback_url = os.environ.get(
            "FALLBACK_GLB_URL",
            "https://avatar-creator-virid.vercel.app/characters/base_error.glb",
        )
        print(f"[Job {job_id}] All Meshy attempts failed. Using fallback avatar: {fallback_url}")
        kv_update_fn(job_id, status="done", result={
            "glb_url": fallback_url,
            "glb_filename": "base_error.glb",
            "fbx_url": None,
            "fbx_filename": None,
            "is_fallback": True,
            "fallback_reason": "meshy_failed",
        })
        return

    kv_update_fn(job_id, status="downloading")
    downloaded = download_results(meshy_key, task_id, str(MODELS_DIR))

    raw_glb = None
    for src_path in downloaded:
        name = os.path.basename(src_path)
        dest = MODELS_DIR / f"job{job_id}_raw_{name}"
        if src_path != str(dest):
            os.rename(src_path, dest)
        if name.endswith(".glb"):
            raw_glb = dest

    if not raw_glb:
        raise RuntimeError("No GLB file in Meshy output")
    print(f"[Job {job_id}] STEP Meshy DONE: {raw_glb}")

    # Scale
    scaled_glb = MODELS_DIR / f"job{job_id}_scaled.glb"
    if source_image_path and Path(source_image_path).exists():
        kv_update_fn(job_id, status="scaling")
        ok, msg = run_blender_script(
            "step3_scale.py", [str(raw_glb), str(scaled_glb), source_image_path], label=f"Job {job_id} Scale"
        )
        if not ok:
            scaled_glb = raw_glb
    else:
        scaled_glb = raw_glb

    # Use scaled GLB if produced; otherwise use raw (scale step can fail in headless when glTF export has no UI)
    if scaled_glb.exists():
        retopo_glb = scaled_glb
        print(f"[Job {job_id}] STEP Scale DONE: using {retopo_glb}")
    else:
        print(f"[Job {job_id}] STEP Scale SKIP (no file); using raw GLB for rig: {raw_glb}")
        retopo_glb = raw_glb
    rig_path = TEMPLATES_DIR / "rig.fbx"
    rigged_fbx = OUTPUT_DIR / f"job{job_id}_rigged.fbx"
    rigged_glb = OUTPUT_DIR / f"job{job_id}_rigged.glb"

    print(f"[Job {job_id}] STEP Rig START: mesh={retopo_glb}, rig={rig_path}, out_fbx={rigged_fbx}, out_glb={rigged_glb}")
    kv_update_fn(job_id, status="rigging")
    ok, msg = run_blender_script(
        "step5_rig_transfer.py", [str(retopo_glb), str(rig_path), str(rigged_fbx), str(rigged_glb)], label=f"Job {job_id} Rig"
    )
    if not ok:
        raise RuntimeError(f"Rig transfer failed (step5 exited non-zero): {msg}")

    # Blender may write to CWD or elsewhere; search common locations and move to OUTPUT_DIR
    rigged_fbx = Path(rigged_fbx).resolve()
    print(f"[Job {job_id}] STEP Rig: step5 exit ok, rigged_fbx.exists()={rigged_fbx.exists()}, path={rigged_fbx}")
    if not rigged_fbx.exists():
        fname = rigged_fbx.name
        for search_dir in (REPO_ROOT, OUTPUT_DIR, MODELS_DIR, Path("/tmp"), Path.cwd()):
            if not search_dir.exists():
                continue
            candidate = Path(search_dir) / fname
            if candidate.exists() and candidate != rigged_fbx:
                if not rigged_fbx.parent.exists():
                    rigged_fbx.parent.mkdir(parents=True, exist_ok=True)
                candidate.rename(rigged_fbx)
                break
        else:
            raise RuntimeError(
                f"STEP Rig: step5 reported success but rigged FBX not found at {rigged_fbx} "
                f"(searched {REPO_ROOT}, {OUTPUT_DIR}, {MODELS_DIR}, /tmp, cwd). Check Blender stderr above."
            )
    print(f"[Job {job_id}] STEP Rig DONE: {rigged_fbx}")

    # Resolve rigged GLB (step5 writes it to OUTPUT_DIR; search if missing)
    rigged_glb = Path(rigged_glb).resolve()
    if not rigged_glb.exists():
        gname = rigged_glb.name
        for search_dir in (REPO_ROOT, OUTPUT_DIR, MODELS_DIR, Path("/tmp"), Path.cwd()):
            if not search_dir.exists():
                continue
            candidate = Path(search_dir) / gname
            if candidate.exists() and candidate != rigged_glb:
                if not rigged_glb.parent.exists():
                    rigged_glb.parent.mkdir(parents=True, exist_ok=True)
                candidate.rename(rigged_glb)
                break
        else:
            rigged_glb = None  # optional; we still have FBX and raw GLB
    if rigged_glb and rigged_glb.exists():
        print(f"[Job {job_id}] Rigged GLB: {rigged_glb}")

    comparison_blend = OUTPUT_DIR / f"job{job_id}_comparison.blend"
    kv_update_fn(job_id, status="saving_blend")
    ok, _ = run_blender_script(
        "save_comparison_blend.py", [str(rigged_fbx), str(rig_path), str(comparison_blend)], label=f"Job {job_id} Blend"
    )
    if not ok or not comparison_blend.exists():
        comparison_blend = None

    # Upload to Vercel Blob and get URLs (GLB = rigged same as FBX so app/download use same skeleton)
    if not rigged_fbx.exists():
        raise RuntimeError(f"Rigged FBX missing at {rigged_fbx}")
    fbx_url = upload_fn(f"jobs/{job_id}/rigged.fbx", rigged_fbx.read_bytes(), "application/octet-stream")
    if rigged_glb and rigged_glb.exists():
        glb_url = upload_fn(f"jobs/{job_id}/rigged.glb", rigged_glb.read_bytes(), "model/gltf-binary")
        glb_filename = rigged_glb.name
    else:
        glb_url = upload_fn(f"jobs/{job_id}/raw.glb", raw_glb.read_bytes(), "model/gltf-binary")
        glb_filename = raw_glb.name
    blend_url = None
    if comparison_blend and comparison_blend.exists():
        blend_url = upload_fn(f"jobs/{job_id}/comparison.blend", comparison_blend.read_bytes(), "application/x-blender")

    result_data = {
        "glb_url": glb_url,
        "glb_filename": glb_filename,
        "fbx_url": fbx_url,
        "fbx_filename": rigged_fbx.name,
    }
    if blend_url:
        result_data["blend_url"] = blend_url
        result_data["blend_filename"] = comparison_blend.name

    kv_update_fn(job_id, status="done", result=result_data)
    print(f"[Job {job_id}] Pipeline complete.")
