// api/cast.js — the branded share page.
//
// Reached via the rewrite in vercel.json:  /cast/:id  ->  /api/cast?id=:id
//
// Crawlers get Open Graph + Twitter tags so WhatsApp/X/iMessage render a
// thumbnail and our name instead of "v3b.fal.media".
// Humans get a real page: the clip, who made it, and a way in.
//
// Reads with the service-role key, which bypasses RLS. There is no database
// policy protecting private casts here — only the code below. It is guarded
// twice, on purpose. See handler().

import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const SITE = (process.env.SITE_URL || 'https://aidirectorme.com').replace(/\/+$/, '');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const truncate = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export default async function handler(req, res) {
  const id = String(req.query.id || '').trim();

  if (!/^[0-9a-zA-Z]{8}$/.test(id)) {
    return send(res, 404, notFoundPage());
  }

  const { data: asset } = await admin
    .from('assets')
    .select('share_id, video_url, image_url, prompt, clip_title, public, deleted')
    .eq('share_id', id)
    // ---------------------------------------------------------------------
    // GUARD 1 OF 2. This client uses the service-role key and bypasses RLS.
    // This filter is the ONLY thing standing between a private cast and the
    // open internet. Removing it silently publishes every cast on the site,
    // including casts made from other people's photographs. There is no
    // database policy behind it to catch the mistake. Do not remove it.
    // ---------------------------------------------------------------------
    .eq('public', true)
    .eq('deleted', false)
    .maybeSingle();

  if (!asset) return send(res, 404, notFoundPage());

  // GUARD 2 OF 2. Re-assert it on the returned row. Cheap, and it survives a
  // refactor of the query above.
  if (asset.public !== true || asset.deleted === true) {
    console.error('[cast] guard 2 caught a non-public row — guard 1 is broken', id);
    return send(res, 404, notFoundPage());
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return send(res, 200, castPage(asset));
}

function send(res, status, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(status).send(html);
}

// ---------------------------------------------------------------------------

const HEAD_FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`;

// One deliberate restraint: the page carries no accent colour at all. Every
// surface is graphite; the only colour on screen is the film itself. The
// signature is the sprocket rail — a 35mm perforation strip running down the
// left edge of the frame, drawn in CSS.
const CSS = `
:root{
  --ink:#0B0E12; --panel:#141920; --line:#232A33;
  --bone:#E9E6DF; --mute:#7B8593;
  --frame: 0 0 0 1px var(--line), 0 40px 80px -20px rgba(0,0,0,.9);
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--ink);color:var(--bone)}
body{
  font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;
  min-height:100vh;display:flex;flex-direction:column;
}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace}

header{
  display:flex;align-items:center;justify-content:space-between;
  padding:20px 24px;border-bottom:1px solid var(--line);
}
.brand{
  font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  font-size:13px;color:var(--bone);text-decoration:none;
}
.brand span{color:var(--mute)}
header .cta{
  font-size:12px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--mute);text-decoration:none;
}
header .cta:hover{color:var(--bone)}

main{flex:1;display:flex;align-items:center;justify-content:center;padding:48px 24px}
.stage{width:100%;max-width:880px}

.eyebrow{
  font-size:11px;letter-spacing:.24em;text-transform:uppercase;
  color:var(--mute);margin:0 0 10px;
}
h1{
  font-size:clamp(26px,4.4vw,44px);line-height:1.05;font-weight:500;
  margin:0 0 28px;letter-spacing:-.02em;
}

/* Signature: 35mm sprocket rail down the left edge of the frame. */
.frame{position:relative;padding-left:26px}
.rail{
  position:absolute;left:0;top:0;bottom:0;width:14px;
  background-image:radial-gradient(circle at 7px 7px, var(--line) 0 3.2px, transparent 3.4px);
  background-size:14px 20px;
  border-left:1px solid var(--line);border-right:1px solid var(--line);
}
video{
  display:block;width:100%;border-radius:2px;background:#000;
  box-shadow:var(--frame);
}

.slate{
  margin-top:22px;border-top:1px solid var(--line);
  display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);
}
.slate div{background:var(--ink);padding:14px 16px 16px}
.slate dt{
  font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);margin:0 0 6px;
}
.slate dd{margin:0;font-size:13px;line-height:1.5;color:var(--bone);word-break:break-word}

.pitch{
  margin-top:44px;padding-top:28px;border-top:1px solid var(--line);
  display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;
}
.pitch p{margin:0;color:var(--mute);font-size:15px;line-height:1.5;max-width:44ch}
.pitch strong{color:var(--bone);font-weight:500}
.button{
  display:inline-block;padding:13px 22px;border:1px solid var(--bone);
  color:var(--bone);text-decoration:none;font-size:13px;
  letter-spacing:.1em;text-transform:uppercase;border-radius:2px;
  transition:background .18s ease,color .18s ease;white-space:nowrap;
}
.button:hover{background:var(--bone);color:var(--ink)}
.button:focus-visible{outline:2px solid var(--bone);outline-offset:3px}

footer{padding:20px 24px;border-top:1px solid var(--line);color:var(--mute);font-size:11px;letter-spacing:.1em;text-transform:uppercase}

.empty{text-align:center;max-width:460px}
.empty h1{margin-bottom:14px}
.empty p{color:var(--mute);line-height:1.6;margin:0 0 28px}

@media (max-width:640px){
  .slate{grid-template-columns:1fr}
  .frame{padding-left:20px}
  .pitch{flex-direction:column;align-items:flex-start}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

function shell({ title, head, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
${HEAD_FONTS}
${head}
<style>${CSS}</style>
</head>
<body>
<header>
  <a class="brand" href="${SITE}">AiDirector<span>Me</span></a>
  <a class="cta" href="${SITE}">Shot library</a>
</header>
${body}
<footer>AiDirectorMe — a shot library for AI directors</footer>
</body>
</html>`;
}

function castPage(asset) {
  const title = asset.clip_title || 'Untitled shot';
  const prompt = asset.prompt || '';
  const still = asset.image_url || '';
  const video = asset.video_url || '';
  const url = `${SITE}/cast/${asset.share_id}`;

  const ogTitle = `${title} — cast on AiDirectorMe`;
  const ogDesc = prompt
    ? truncate(prompt, 180)
    : 'A cinematic shot, cast with a real face. Make your own on AiDirectorMe.';

  const head = `
<link rel="canonical" href="${esc(url)}">
<meta name="description" content="${esc(ogDesc)}">

<meta property="og:site_name" content="AiDirectorMe">
<meta property="og:type" content="video.other">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(ogDesc)}">
<meta property="og:image" content="${esc(still)}">
<meta property="og:image:secure_url" content="${esc(still)}">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="720">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:video" content="${esc(video)}">
<meta property="og:video:secure_url" content="${esc(video)}">
<meta property="og:video:type" content="video/mp4">
<meta property="og:video:width" content="1280">
<meta property="og:video:height" content="720">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(ogDesc)}">
<meta name="twitter:image" content="${esc(still)}">`;

  const body = `
<main>
  <div class="stage">
    <p class="eyebrow mono">Cast · Take ${esc(asset.share_id)}</p>
    <h1>${esc(title)}</h1>

    <div class="frame">
      <div class="rail" aria-hidden="true"></div>
      <video controls playsinline preload="metadata"
             poster="${esc(still)}" src="${esc(video)}"></video>
    </div>

    <dl class="slate mono">
      <div><dt>Shot</dt><dd>${esc(title)}</dd></div>
      <div><dt>Take</dt><dd>${esc(asset.share_id)}</dd></div>
      <div><dt>Prompt</dt><dd>${esc(truncate(prompt, 140)) || '—'}</dd></div>
    </dl>

    <div class="pitch">
      <p><strong>Made with AiDirectorMe.</strong> Browse the shot library, pick a frame, and put your own face in it.</p>
      <a class="button" href="${SITE}">Make your own</a>
    </div>
  </div>
</main>`;

  return shell({ title: esc(ogTitle), head, body });
}

function notFoundPage() {
  const head = `<meta name="robots" content="noindex">`;
  const body = `
<main>
  <div class="stage empty">
    <p class="eyebrow mono">404</p>
    <h1>This cast isn't public</h1>
    <p>The link may have expired, or the person who made it hasn't shared it. You can still browse the library and cast your own.</p>
    <a class="button" href="${SITE}">Open the shot library</a>
  </div>
</main>`;
  return shell({ title: 'Not found — AiDirectorMe', head, body });
}
