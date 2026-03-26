"""Upload files to Vercel Blob.

When BLOB_READ_WRITE_TOKEN is set, uploads directly to blob.vercel-storage.com (no size limit).
Otherwise falls back to POST /api/worker/upload (Vercel 4.5 MB body limit).
"""
import base64
import os
import requests

BLOB_API_BASE = "https://blob.vercel-storage.com"
BLOB_API_VERSION = "7"


def upload_file(
    app_url: str,
    worker_secret: str,
    pathname: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to Vercel Blob. Returns the blob URL."""
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    if token:
        return _upload_direct(pathname, data, content_type, token)
    return _upload_via_api(app_url, worker_secret, pathname, data, content_type)


def _upload_direct(pathname: str, data: bytes, content_type: str, token: str) -> str:
    """PUT directly to Vercel Blob API. No 4.5 MB limit."""
    url = f"{BLOB_API_BASE}/{pathname}"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-api-version": BLOB_API_VERSION,
        "x-content-type": content_type,
        "x-add-random-suffix": "0",
    }
    resp = requests.put(url, data=data, headers=headers, timeout=120)
    resp.raise_for_status()
    out = resp.json()
    return out.get("url") or out.get("downloadUrl") or out.get("pathname", "")


def _upload_via_api(
    app_url: str,
    worker_secret: str,
    pathname: str,
    data: bytes,
    content_type: str,
) -> str:
    """Upload via /api/worker/upload. Subject to Vercel 4.5 MB body limit."""
    url = f"{app_url.rstrip('/')}/api/worker/upload"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {worker_secret}",
            "Content-Type": "application/json",
        },
        json={"pathname": pathname, "data": base64.b64encode(data).decode()},
        timeout=120,
    )
    resp.raise_for_status()
    out = resp.json()
    return out["url"]
