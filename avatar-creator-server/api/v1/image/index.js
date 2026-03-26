import { put } from '@vercel/blob';
import { generateImage } from '../../lib/gemini.js';
import { requireApiAuth } from '../../lib/apiAuth.js';
import { withCors } from '../../lib/cors.js';

/**
 * POST /api/v1/image
 * Generate a character image from a text prompt (and optional base image).
 *
 * Body: { prompt: string, image?: string (base64) }
 * - If image is omitted, we use DEFAULT_CHARACTER_IMAGE_URL or the same deployment's /base_character.png (same as the server frontend).
 *
 * Returns: { image: string (base64), image_url?: string }
 * - image_url is set when we upload the result to Blob (so the client can pass it to /api/v1/model).
 */
export default async function handler(req, res) {
  if (withCors(req, res)) {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireApiAuth(req, res)) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Image generation not configured (GEMINI_API_KEY)' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    res.status(400).json({ error: 'Missing or empty prompt' });
    return;
  }

  let imageB64;
  let mimeType = 'image/png';
  if (body.image) {
    try {
      imageB64 = Buffer.from(body.image, 'base64').toString('base64');
      if (Buffer.from(body.image, 'base64').length === 0) throw new Error('empty');
    } catch (e) {
      res.status(400).json({ error: 'Invalid base64 image' });
      return;
    }
  } else {
    let loaded = false;
    try {
      const { defaultBaseImageBase64 } = await import('../../lib/defaultBaseImageData.js');
      if (defaultBaseImageBase64) {
        imageB64 = defaultBaseImageBase64;
        loaded = true;
      }
    } catch (_) {
      // Embedded file missing (e.g. build not run); fall back to URL fetch
    }
    if (!loaded) {
      const envDefault = process.env.DEFAULT_CHARACTER_IMAGE_URL;
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : null));
      const defaultUrl = envDefault || (baseUrl ? `${baseUrl}/base_character.png` : null);
      if (!defaultUrl) {
        res.status(400).json({
          error: 'No image provided. Run build (node scripts/embed-base-image.js) or set DEFAULT_CHARACTER_IMAGE_URL.',
        });
        return;
      }
      try {
        const r = await fetch(defaultUrl, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        imageB64 = buf.toString('base64');
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('jpeg') || ct.includes('jpg')) mimeType = 'image/jpeg';
      } catch (e) {
        res.status(502).json({ error: 'Failed to fetch default character image: ' + e.message });
        return;
      }
    }
  }

  try {
    const imageBuffer = await generateImage(apiKey, imageB64, mimeType, prompt);
    const resultB64 = imageBuffer.toString('base64');

    let imageUrl = null;
    try {
      const blob = await put(`v1/preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
      });
      imageUrl = blob.url;
    } catch (_) {
      // Blob upload optional; client still has base64
    }

    res.status(200).json({
      image: resultB64,
      ...(imageUrl && { image_url: imageUrl }),
    });
  } catch (err) {
    res.status(200).json({ success: false, error: err.message || String(err) });
  }
}
