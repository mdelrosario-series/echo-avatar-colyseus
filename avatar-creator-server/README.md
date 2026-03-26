# Avatar 3D Pipeline

End-to-end pipeline: 2D character image → 3D rigged avatar.

**Production deployment:** The app can run split across **Vercel** (frontend + API + KV + Blob) and **Fly.io** (Blender + Rodin pipeline worker). See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup.

**External API:** Apps can call the service to generate an image from a prompt, then a 3D model (GLB) from that image. See [docs/API_V1.md](docs/API_V1.md) for **POST /api/v1/image** and **POST /api/v1/model** and polling for the GLB.

## Pipeline Steps

1. **Image Input** — Character image in `input/`
2. **Image Processing** — Gemini (Nano Banana) cleans/prepares the image for 3D generation
3. **3D Generation** — AI model (Hunyuan3D / Rodin / Trellis) generates mesh from processed image
4. **Blender Import** — Load generated 3D model into Blender
5. **Scale** — Python script to normalize model scale
6. **Retopology** — QuadRemesher via the `quadremesher-plugin` VM
7. **Rig Transfer** — Load `templates/rig.fbx`, transfer skeleton + skin weights to new mesh

## Directory Structure

```
input/          # Source character images
output/         # Final rigged models
models/         # Intermediate 3D models (raw, scaled, retopo'd)
templates/      # Template rig.fbx
scripts/        # All pipeline scripts
```

## Requirements

- Blender 4.0.2 (installed)
- Python 3.12 (installed)
- Gemini API key
- 3D generation API key (Rodin/Hunyuan/Trellis)
- Access to quadremesher-plugin VM
