import { generateImage } from '../lib/gemini.js';

function parseMultipart(buffer, boundary) {
  const parts = [];
  const b = Buffer.from('--' + boundary);
  let start = buffer.indexOf(b) + b.length;
  if (start < b.length) return parts;
  while (start < buffer.length) {
    const end = buffer.indexOf(b, start);
    const block = end === -1 ? buffer.slice(start) : buffer.slice(start, end - 2);
    const headerEnd = block.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headers = block.slice(0, headerEnd).toString();
      const body = block.slice(headerEnd + 4);
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]*)"/);
      const ctMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
      parts.push({
        name: nameMatch ? nameMatch[1] : '',
        filename: filenameMatch ? filenameMatch[1] : null,
        contentType: ctMatch ? ctMatch[1].trim() : 'image/png',
        body,
      });
    }
    if (end === -1) break;
    start = end + b.length;
  }
  return parts;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured' });
    return;
  }
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=([^;\s]+)/);
  if (!boundaryMatch) {
    res.status(400).json({ success: false, error: 'Missing multipart boundary' });
    return;
  }
  const boundary = boundaryMatch[1].trim();
  let body;
  try {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  } catch (e) {
    res.status(400).json({ success: false, error: 'Failed to read body' });
    return;
  }
  const parts = parseMultipart(body, boundary);
  let imageBytes = null;
  let mimeType = 'image/png';
  let prompt = '';
  for (const p of parts) {
    if (p.name === 'image') {
      imageBytes = p.body;
      mimeType = p.contentType || 'image/png';
    } else if (p.name === 'prompt') {
      prompt = p.body.toString('utf8').trim();
    }
  }
  if (!imageBytes || imageBytes.length === 0) {
    res.status(400).json({ success: false, error: 'No image in request' });
    return;
  }
  const imageB64 = imageBytes.toString('base64');
  try {
    const resultBuffer = await generateImage(apiKey, imageB64, mimeType, prompt || '');
    const resultB64 = resultBuffer.toString('base64');
    res.status(200).json({ success: true, image: resultB64 });
  } catch (err) {
    res.status(200).json({ success: false, error: err.message || String(err) });
  }
}
