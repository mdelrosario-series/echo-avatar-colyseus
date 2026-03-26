/**
 * CORS helper for Vercel serverless API routes.
 * Call at the start of each handler that may be called from browser origins.
 * - Sets Access-Control-* headers on the response.
 * - Returns true if the request is OPTIONS (preflight); handler should then send 204 and return.
 */

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const CORS_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization';

/**
 * Set CORS headers on res. Returns true if this is an OPTIONS preflight (caller should send 204 and return).
 * @param {import('http').ServerResponse} res
 * @param {import('http').IncomingMessage} req
 * @returns {boolean} true if OPTIONS preflight was detected
 */
export function withCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', CORS_METHODS);
  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return true;
  }
  return false;
}
