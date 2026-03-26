#!/usr/bin/env python3
"""
Install torch-cluster to match the installed PyTorch version (CPU or CUDA).
Run after pip install torch. Uses PyG wheel index: https://data.pyg.org/whl/
"""
import subprocess
import sys


def main() -> int:
    try:
        import torch
    except ImportError:
        print("install_torch_cluster: torch not installed, skipping torch-cluster", file=sys.stderr)
        return 0

    version = getattr(torch, "__version__", "").strip()
    if not version:
        print("install_torch_cluster: could not get torch version", file=sys.stderr)
        return 1

    # PyG wheel index URL for this torch version (e.g. torch-2.3.0+cpu.html)
    index_url = f"https://data.pyg.org/whl/torch-{version}.html"
    print(f"install_torch_cluster: torch={version} -> {index_url}")

    r = subprocess.run(
        [sys.executable, "-m", "pip", "install", "--no-cache-dir", "torch-cluster", "-f", index_url],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print("install_torch_cluster: pip install failed (no wheel for this torch?)", file=sys.stderr)
        if r.stderr:
            print(r.stderr, file=sys.stderr)
        print("install_torch_cluster: continuing without torch-cluster", file=sys.stderr)
        return 0
    print("install_torch_cluster: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
