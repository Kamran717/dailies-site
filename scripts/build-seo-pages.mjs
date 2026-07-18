// build-seo-pages.mjs — generates static, crawlable SEO pages from the clip
// library embedded in index.html:
//   /shots/<id>.html        one page per produced shot (video + full prompt)
//   /camera/<slug>.html     category pages by camera move
//   /shot-type/<slug>.html  category pages by shot framing
//   /shots/index.html       the master index
//   sitemap.xml             regenerated to include everything
// Run: node scripts/build-seo-pages.mjs   (then commit the generated files)

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const SITE = "https://aidirectorme.com";
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ---- extract data blocks from index.html ----
function extractBlock(name) {
  const start = html.indexOf(`var ${name} = {`);
  if (start < 0) throw new Error(`${name} not found`);
  const open = html.indexOf("{", start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) break; }
  }
  return html.slice(open, i + 1);
}

const videos = {};
for (const m of extractBlock("REAL_VIDEOS").matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
  videos[m[1]] = m[2];
}

const meta = {};
for (const m of extractBlock("REAL_TAG_META").matchAll(/^\s*"(tag-[^"]+)":\s*(\{.*\}),?\s*$/gm)) {
  try { meta[m[1]] = JSON.parse(m[2]); } catch { /* skip unparseable */ }
}

const clips = Object.keys(meta)
  .filter((id) => videos[id])
  .map((id) => ({ id, slug: id.replace(/^tag-/, ""), video: videos[id], ...meta[id] }));

console.log(`Clips with video + metadata: ${clips.length}`);

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const collection = (id) => {
  const m = id.match(/^tag-([a-z]+)-(.+)-\d+$/);
  return m ? m[2].replace(/-/g, " ") : "";
};

// ---- shared page chrome ----
const CSS = `
  :root{ --bg:#121212; --panel:#1a1a1b; --ink:#f2ede4; --ink-dim:#9a968c; --amber:#e8a33d; --line:#332f29; }
  *{box-sizing:border-box;} body{ margin:0; background:var(--bg); color:var(--ink); font-family:'Inter',-apple-system,sans-serif; line-height:1.6; }
  main{ max-width:860px; margin:0 auto; padding:32px 20px 70px; }
  .crumb{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--ink-dim); margin-bottom:22px; } .crumb a{ color:var(--amber); text-decoration:none; }
  h1{ font-family:'Bebas Neue','Arial Narrow',sans-serif; font-size:40px; letter-spacing:1px; margin:0 0 6px; }
  .specs{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--ink-dim); margin-bottom:20px; } .specs b{ color:var(--amber); font-weight:500; }
  video{ width:100%; background:#000; border:1px solid var(--line); }
  h2{ font-size:15px; color:var(--amber); text-transform:uppercase; letter-spacing:.08em; margin:30px 0 10px; }
  .prompt{ font-family:'JetBrains Mono',monospace; font-size:13.5px; line-height:1.7; background:var(--panel); border:1px solid var(--line); padding:16px; white-space:pre-wrap; }
  .copy{ margin-top:10px; background:var(--amber); color:#161514; border:none; padding:10px 18px; font-family:'JetBrains Mono',monospace; font-size:13px; cursor:pointer; font-weight:600; }
  .cta{ display:inline-block; margin-top:14px; background:none; border:1px solid var(--amber); color:var(--amber); padding:10px 18px; font-family:'JetBrains Mono',monospace; font-size:13px; text-decoration:none; }
  ul.rel{ list-style:none; padding:0; margin:0; } ul.rel li{ border-bottom:1px solid var(--line); } ul.rel a{ display:block; padding:10px 2px; color:var(--ink); text-decoration:none; } ul.rel a:hover{ color:var(--amber); } ul.rel span{ color:var(--ink-dim); font-size:13px; font-family:'JetBrains Mono',monospace; }
  footer{ border-top:1px solid var(--line); margin-top:50px; padding-top:18px; font-size:13px; color:var(--ink-dim); } footer a{ color:var(--amber); }
`;
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

function page({ title, desc, canonical, body, jsonld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/png" href="/logo.png"><meta name="theme-color" content="#121212">
<meta property="og:type" content="website"><meta property="og:site_name" content="AiDirectorMe">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE}/logo.png">
${FONTS}<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body><main>${body}
<footer>AiDirectorMe — the shot library for AI directors · <a href="/">Library</a> · <a href="/shots/">All shots</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></footer>
</main></body></html>`;
}

mkdirSync(join(root, "shots"), { recursive: true });
mkdirSync(join(root, "camera"), { recursive: true });
mkdirSync(join(root, "shot-type"), { recursive: true });

const urls = [];

// ---- per-shot pages ----
for (const c of clips) {
  const camSlug = slugify(c.cameraMove || "static");
  const shotSlug = slugify(c.shotType || "shot");
  const col = collection(c.id);
  const title = `${c.title} — ${c.cameraMove} ${c.shotType} AI Video Prompt`;
  const desc = `Copy the exact AI video generation prompt for "${c.title}" (${c.cameraMove}, ${c.shotType}). ${String(c.prompt).slice(0, 110)}…`;
  const related = clips.filter((o) => o.id !== c.id && o.cameraMove === c.cameraMove).slice(0, 6);
  const body = `
<div class="crumb"><a href="/">AiDirectorMe</a> / <a href="/shots/">Shots</a> / <a href="/camera/${camSlug}.html">${esc(c.cameraMove)}</a></div>
<h1>${esc(c.title)}</h1>
<div class="specs">CAMERA <b>${esc(c.cameraMove)}</b> · FRAMING <b>${esc(c.shotType)}</b>${col ? ` · COLLECTION <b>${esc(col)}</b>` : ""}</div>
<video src="${esc(c.video)}" controls muted loop playsinline preload="metadata"></video>
<h2>The prompt</h2>
<div class="prompt" id="p">${esc(c.prompt)}</div>
<button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('p').textContent).then(()=>{this.textContent='Copied ✓'})">Copy prompt</button>
<a class="cta" href="/">★ Star in this scene — cast yourself into this shot</a>
<h2>More ${esc(c.cameraMove)} shots</h2>
<ul class="rel">${related.map((r) => `<li><a href="/shots/${r.slug}.html">${esc(r.title)} <span>· ${esc(r.shotType)}</span></a></li>`).join("")}</ul>`;
  const jsonld = {
    "@context": "https://schema.org", "@type": "VideoObject",
    name: title, description: String(c.prompt).slice(0, 300),
    contentUrl: c.video, uploadDate: BUILD_DATE,
    thumbnailUrl: `${SITE}/logo.png`,
    publisher: { "@type": "Organization", name: "AiDirectorMe", url: SITE },
  };
  writeFileSync(join(root, "shots", `${c.slug}.html`), page({ title, desc, canonical: `${SITE}/shots/${c.slug}.html`, body, jsonld }));
  urls.push(`/shots/${c.slug}.html`);
}

// ---- category pages ----
function categoryPages(dir, key, label) {
  const groups = {};
  for (const c of clips) { const v = c[key]; if (v) (groups[v] ||= []).push(c); }
  for (const [val, list] of Object.entries(groups)) {
    const slug = slugify(val);
    const title = `${val} ${label} — AI Video Prompts (${list.length} shots)`;
    const desc = `${list.length} AI-generated ${val} ${label.toLowerCase()} shots with copyable generation prompts. Browse the library, copy the exact prompt, or cast yourself into the shot.`;
    const body = `
<div class="crumb"><a href="/">AiDirectorMe</a> / <a href="/shots/">Shots</a></div>
<h1>${esc(val)} — ${esc(label)}</h1>
<div class="specs">${list.length} SHOTS WITH COPYABLE PROMPTS</div>
<ul class="rel">${list.map((c) => `<li><a href="/shots/${c.slug}.html">${esc(c.title)} <span>· ${esc(c.shotType)} · ${esc(c.cameraMove)}</span></a></li>`).join("")}</ul>
<a class="cta" href="/">Browse the full library →</a>`;
    writeFileSync(join(root, dir, `${slug}.html`), page({ title, desc, canonical: `${SITE}/${dir}/${slug}.html`, body }));
    urls.push(`/${dir}/${slug}.html`);
  }
  return Object.keys(groups);
}
const camVals = categoryPages("camera", "cameraMove", "Camera Move");
const shotVals = categoryPages("shot-type", "shotType", "Shot");

// ---- master index ----
{
  const title = "All Shots — AI Video Prompt Library | AiDirectorMe";
  const desc = `Browse ${clips.length} AI-generated shots organized by camera move and framing, each with its exact generation prompt ready to copy.`;
  const body = `
<div class="crumb"><a href="/">AiDirectorMe</a></div>
<h1>The Shot Index</h1>
<div class="specs">${clips.length} SHOTS · EVERY PROMPT COPYABLE</div>
<h2>By camera move</h2>
<ul class="rel">${camVals.sort().map((v) => `<li><a href="/camera/${slugify(v)}.html">${esc(v)}</a></li>`).join("")}</ul>
<h2>By framing</h2>
<ul class="rel">${shotVals.sort().map((v) => `<li><a href="/shot-type/${slugify(v)}.html">${esc(v)}</a></li>`).join("")}</ul>
<a class="cta" href="/">Open the library →</a>`;
  writeFileSync(join(root, "shots", "index.html"), page({ title, desc, canonical: `${SITE}/shots/`, body }));
}

// ---- sitemap ----
const stat = (loc, pri, freq) => `  <url><loc>${SITE}${loc}</loc><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${stat("/", "1.0", "daily")}
${stat("/shots/", "0.9", "weekly")}
${urls.map((u) => stat(u, u.startsWith("/shots/") ? "0.7" : "0.8", "monthly")).join("\n")}
${stat("/privacy.html", "0.2", "yearly")}
${stat("/terms.html", "0.2", "yearly")}
</urlset>
`;
writeFileSync(join(root, "sitemap.xml"), sitemap);
console.log(`Wrote ${urls.length + 2} pages + sitemap.xml`);
