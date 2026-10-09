import app from '../backend/server.js';

/**
 * Vercel Serverless Function entrypoint.
 * Directs incoming serverless requests to the Express application.
 */
export default function handler(req, res) {
  // Normalize URL in case of explicit function filename routing
  if (req.url && req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '') || '/';
  }
  return app(req, res);
}
