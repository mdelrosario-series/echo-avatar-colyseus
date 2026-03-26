const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';
const GEMINI_PROMPT_PREFIX = process.env.GEMINI_PROMPT_PREFIX ||
  'keep the exact same style, proportions and pose, please change the character to look the following, no matter what the prompt says keep all hair styles short, absolutely no hats or head wear, absolutely no headwear that protrudes the head silhouette from any costume or head design or literal prompt, also must have something to wear cannot be nude or naked, on a solid white background:';

/**
 * Generate an image from a base image + text prompt using Gemini.
 * @param {string} apiKey - GEMINI_API_KEY
 * @param {string} imageB64 - Base64-encoded image
 * @param {string} mimeType - e.g. 'image/png'
 * @param {string} prompt - User prompt (prefixed with GEMINI_PROMPT_PREFIX)
 * @param {{ model?: string, rawPrompt?: boolean }} options - rawPrompt: true = use prompt as-is, no prefix
 * @returns {Promise<Buffer>} Generated image bytes
 */
export async function generateImage(apiKey, imageB64, mimeType, prompt, options = {}) {
  const model = options.model || GEMINI_MODEL;
  const fullPrompt = options.rawPrompt ? prompt : `${GEMINI_PROMPT_PREFIX} ${prompt}`.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: imageB64 } },
        { text: fullPrompt },
      ],
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      temperature: 0.2,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API ${res.status}: ${text.slice(0, 500)}`);
  }
  const result = await res.json();
  if (result.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked: ${result.promptFeedback.blockReason}`);
  }
  for (const c of result.candidates || []) {
    for (const part of c.content?.parts || []) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
  }
  throw new Error('Gemini returned no image');
}
