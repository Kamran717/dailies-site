// api/download.js
//
// GET /api/download?url=<media url>&name=<filename>
//
// Streams a remote file back from our own origin with
// Content-Disposition: attachment. Two reasons this exists:
//
//  1. The browser cannot fetch()->blob() a cross-origin URL without CORS
//     headers, and R2's custom domain doesn't send them. The old code caught
//     that failure and fell back to window.open(), which opened a new tab
//     instead of downloading.
//  2. An <a download> attribute is ignored cross-origin — it navigates.
//     Same-origin, it works.
//
// SSRF: `url` comes from the client, so the host is checked against a strict
// allowlist. Without it this endpoint would happily fetch internal addresses
// on our behalf.

const ALLOWED_HOSTS = new Set([
  'videos.aidirectorme.com',
  'v3b.fal.media',
  'v2.fal.media',
  'fal.media',
]);

function hostAllowed(host) {
  if (ALLOWED_HOSTS.has(host)) return true;
  // fal serves from rotating subdomains; allow only *.fal.media
  if (host.endsWith('.fal.media')) return true;
  // R2 public dev bucket
  if (host.endsWith('.r2.dev')) return true;
  return false;
}

function safeName(name, fallback) {
  const cleaned = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '');
  return cleaned && cleaned.length <= 80 ? cleaned : fallback;
}

export default async function handler(req, res) {
  const raw = req.query.url;
  if (!raw) return res.status(400).json({ error: 'Missing url.' });

  let target;
  try {
    target = new URL(String(raw));
  } catch {
    return res.status(400).json({ error: 'Bad url.' });
  }

  if (target.protocol !== 'https:' || !hostAllowed(target.hostname)) {
    return res.status(403).json({ error: 'That host is not allowed.' });
  }

  const isVideo = /\.mp4($|\?)/i.test(target.pathname);
  const filename = safeName(req.query.name, isVideo ? 'cast.mp4' : 'still.jpg');

  let upstream;
  try {
    upstream = await fetch(target.toString());
  } catch (err) {
    console.error('[download] fetch failed', err);
    return res.status(502).json({ error: 'Could not reach the file.' });
  }

  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: 'File not available.' });
  }

  const buf = Buffer.from(await upstream.arrayBuffer());

  res.setHeader(
    'Content-Type',
    upstream.headers.get('content-type') || (isVideo ? 'video/mp4' : 'image/jpeg')
  );
  res.setHeader('Content-Length', String(buf.length));
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');

  return res.status(200).send(buf);
}
