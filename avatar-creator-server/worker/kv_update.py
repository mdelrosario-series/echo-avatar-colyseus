"""Update job status in Vercel KV (Upstash Redis)."""
import os
import json

try:
    from upstash_redis import Redis
except ImportError:
    Redis = None

JOB_PREFIX = "job:"


def get_redis():
    url = os.environ.get("KV_REST_API_URL")
    token = os.environ.get("KV_REST_API_TOKEN")
    if not url or not token:
        raise RuntimeError("KV_REST_API_URL and KV_REST_API_TOKEN must be set")
    return Redis(url=url, token=token)


def set_job(job_id: str, value: dict):
    if Redis is None:
        raise RuntimeError("upstash_redis is required")
    r = get_redis()
    key = JOB_PREFIX + job_id
    if value is None:
        r.delete(key)
    else:
        r.set(key, json.dumps(value))


def update_job_status(job_id: str, status: str, **extra):
    r = get_redis()
    key = JOB_PREFIX + job_id
    raw = r.get(key)
    current = json.loads(raw) if isinstance(raw, str) else (raw or {})
    if isinstance(current, str):
        current = json.loads(current) if current else {}
    current["status"] = status
    current.update(extra)
    r.set(key, json.dumps(current))
