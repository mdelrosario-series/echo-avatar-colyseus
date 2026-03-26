#!/usr/bin/env python3
"""HTTP server for the pipeline worker. Accepts POST /run with job_id and image_url.
Returns 200 immediately and runs the pipeline in a background thread (pipeline can take many minutes)."""
import json
import os
import sys
import tempfile
import threading
import time
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

DOWNLOAD_RETRIES = 3
DOWNLOAD_RETRY_DELAY = 2
DOWNLOAD_TIMEOUT = 60


def download_image(image_url: str) -> bytes:
    """Download image from URL with retries (handles transient DNS/network failures)."""
    req = urllib.request.Request(image_url, headers={"User-Agent": "AvatarWorker/1.0"})
    last_err = None
    for attempt in range(DOWNLOAD_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as resp:
                return resp.read()
        except OSError as e:
            last_err = e
            err_str = str(e).lower()
            if "name resolution" in err_str or "errno -3" in err_str or "nodename nor servname" in err_str:
                msg = (
                    "DNS/network: worker could not resolve the image URL hostname. "
                    "Check worker has outbound internet and can reach the image host (e.g. blob.vercel-storage.com)."
                )
                raise OSError(msg) from e
            if attempt < DOWNLOAD_RETRIES - 1:
                time.sleep(DOWNLOAD_RETRY_DELAY)
            else:
                raise
        except Exception as e:
            last_err = e
            if attempt < DOWNLOAD_RETRIES - 1:
                time.sleep(DOWNLOAD_RETRY_DELAY)
            else:
                raise last_err
    raise last_err

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKER_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(WORKER_DIR))
sys.path.insert(0, str(REPO_ROOT))

from run_job import run_pipeline
from vercel_upload import upload_file
from kv_update import update_job_status

PORT = int(os.environ.get("PORT", "8080"))
WORKER_SECRET = os.environ.get("WORKER_SECRET", "")
APP_URL = os.environ.get("APP_URL", "")


class Handler(BaseHTTPRequestHandler):
    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _auth(self):
        auth = self.headers.get("Authorization", "")
        if not WORKER_SECRET or auth != f"Bearer {WORKER_SECRET}":
            self._json({"error": "Unauthorized"}, 401)
            return False
        return True

    def do_GET(self):
        if self.path in ("/", "/run"):
            self._json({"ok": True, "service": "avatar-creator-worker", "usage": "POST /run with Bearer token"})
            return
        self._json({"error": "Not found"}, 404)

    def do_POST(self):
        if self.path != "/run" and not self.path.rstrip("/").endswith("/run"):
            self._json({"error": "Not found"}, 404)
            return
        if not self._auth():
            return
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except Exception:
            self._json({"error": "Invalid JSON"}, 400)
            return
        job_id = data.get("job_id")
        image_url = data.get("image_url")
        if not job_id or not image_url:
            self._json({"error": "Missing job_id or image_url"}, 400)
            return
        if not APP_URL:
            self._json({"error": "APP_URL not configured"}, 500)
            return

        def upload_fn(pathname, data_bytes, content_type):
            return upload_file(APP_URL, WORKER_SECRET, pathname, data_bytes, content_type)

        def kv_update_fn(jid, **kwargs):
            update_job_status(jid, **kwargs)

        # Download image first so we can respond quickly (with retries for transient DNS/network)
        try:
            image_bytes = download_image(image_url)
        except Exception as e:
            try:
                update_job_status(job_id, status="error", error="Failed to download image: " + str(e))
            except Exception:
                pass
            self._json({"error": "Failed to download image: " + str(e)}, 500)
            return

        # Persist image to a file for the background pipeline (it needs source_path for scaling)
        tmpdir = Path(tempfile.gettempdir()) / "avatar-worker"
        tmpdir.mkdir(parents=True, exist_ok=True)
        source_path = str(tmpdir / f"job_{job_id}_source.png")
        try:
            with open(source_path, "wb") as f:
                f.write(image_bytes)
        except Exception as e:
            try:
                update_job_status(job_id, status="error", error="Failed to write image: " + str(e))
            except Exception:
                pass
            self._json({"error": str(e)}, 500)
            return

        def run_in_background():
            try:
                run_pipeline(job_id, image_bytes, source_path, upload_fn, kv_update_fn)
            except Exception as e:
                import traceback
                traceback.print_exc()
                try:
                    update_job_status(job_id, status="error", error=str(e))
                except Exception:
                    pass
            finally:
                try:
                    if os.path.exists(source_path):
                        os.unlink(source_path)
                except Exception:
                    pass

        thread = threading.Thread(target=run_in_background, daemon=True)
        thread.start()
        self._json({"ok": True, "job_id": job_id})

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}", flush=True)


def main():
    if not WORKER_SECRET:
        print("ERROR: WORKER_SECRET not set", file=sys.stderr)
        sys.exit(1)
    if not APP_URL:
        print("ERROR: APP_URL not set (Vercel app URL)", file=sys.stderr)
        sys.exit(1)
    server = HTTPServer(("", PORT), Handler)
    print(f"Worker listening on port {PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
