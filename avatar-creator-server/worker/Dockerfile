# Pipeline worker: Blender + Python, runs Rodin -> Scale -> Rig -> Blend, uploads to Vercel.
# Blender 4.3.x (coworker confirmed success locally with 4.3; 4.0.2 was quitting on GLB import).
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
# Blender tarball needs X11/GL libs even for --background
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ca-certificates \
    wget \
    xz-utils \
    libx11-6 \
    libxcb1 \
    libxrender1 \
    libxi6 \
    libxxf86vm1 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    && rm -rf /var/lib/apt/lists/*

ARG BLENDER_VERSION=4.3.2
ARG BLENDER_SERIES=4.3
RUN wget -q "https://download.blender.org/release/Blender${BLENDER_SERIES}/blender-${BLENDER_VERSION}-linux-x64.tar.xz" -O /tmp/blender.tar.xz \
    && tar -xf /tmp/blender.tar.xz -C /opt \
    && ln -sf /opt/blender-${BLENDER_VERSION}-linux-x64/blender /usr/local/bin/blender \
    && rm /tmp/blender.tar.xz

WORKDIR /app

# Copy repo (scripts, worker, templates, root requirements). Add templates/rig.fbx for rig transfer.
COPY scripts /app/scripts
COPY worker /app/worker
COPY templates /app/templates
COPY requirements.txt /app/requirements.txt

# Worker HTTP deps (requests, etc.)
RUN pip3 install --no-cache-dir -r /app/worker/requirements.txt

# Root requirements.txt (trimesh, numpy, scipy, einops, torch, torchvision, timm, huggingface_hub).
# Use PyTorch CPU index so the image works on Fly.io without GPU.
RUN pip3 install --no-cache-dir -r /app/requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Install torch-cluster to match the installed torch version (CPU/CUDA); script picks the right wheel.
RUN python3 /app/worker/install_torch_cluster.py

ENV PORT=8080
EXPOSE 8080

# Run worker HTTP server (listens for POST /run)
CMD ["python3", "/app/worker/server.py"]
