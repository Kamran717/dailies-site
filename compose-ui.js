/**
 * compose-ui.js
 *
 * Drop-in picker for the custom star feature. Vanilla — no build step.
 *
 * Usage in index.html:
 *
 *   <div id="compose-root"></div>
 *   <script type="module">
 *     import { mountCompose } from './compose-ui.js';
 *     mountCompose(document.getElementById('compose-root'), {
 *       getToken:    () => supabase.auth.getSession().then(r => r.data.session?.access_token),
 *       getImageUrl: () => window.__uploadedImageUrl,   // ALIGN: your existing upload flow
 *     });
 *   </script>
 *
 * The client mirrors the two HARD rules (light/location compatibility, and
 * framing scale vs camera move) purely so it can grey options out before you
 * click. The server re-checks everything. The client is a convenience, never
 * an authority.
 */

const DIMENSIONS = [
  ['background', 'Location'],
  ['lighting',   'Light'],
  ['shotType',   'Framing'],
  ['camera',     'Camera'],
  ['action',     'Action'],
  ['emotion',    'Emotion'],
  ['format',     'Format'],
];

const CSS = `
.cmp{--cmp-line:color-mix(in srgb,currentColor 14%,transparent);
     --cmp-dim:color-mix(in srgb,currentColor 45%,transparent);
     color:inherit;font:inherit;max-width:60rem;margin-inline:auto}
.cmp *{box-sizing:border-box}

/* The slate. Everything else on this panel stays quiet so this can speak. */
.cmp-slate{display:flex;flex-wrap:wrap;gap:0 1.25rem;align-items:baseline;
  padding:.85rem 1rem;margin-bottom:1.75rem;
  border:1px solid var(--cmp-line);border-left:3px solid currentColor;
  font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.7rem;
  letter-spacing:.09em;text-transform:uppercase}
.cmp-slate b{font-weight:600}
.cmp-slate span{color:var(--cmp-dim);font-weight:400}
.cmp-slate .cmp-unset{opacity:.4}

.cmp-row{margin-bottom:1.4rem}
.cmp-row h3{font-family:ui-monospace,"SF Mono",Menlo,monospace;
  font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--cmp-dim);margin:0 0 .5rem;font-weight:500}
.cmp-chips{display:flex;flex-wrap:wrap;gap:.4rem}

.cmp-chip{appearance:none;background:transparent;color:inherit;cursor:pointer;
  border:1px solid var(--cmp-line);border-radius:2px;
  padding:.42rem .7rem;font-size:.82rem;line-height:1.2;
  transition:border-color .12s,background-color .12s}
.cmp-chip:hover:not(:disabled){border-color:currentColor}
.cmp-chip:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.cmp-chip[aria-pressed="true"]{background:currentColor;border-color:currentColor}
.cmp-chip[aria-pressed="true"] span{color:var(--cmp-bg,#000);mix-blend-mode:difference}
.cmp-chip:disabled{opacity:.28;cursor:not-allowed;text-decoration:line-through}

.cmp-notes{margin:1.25rem 0;padding-left:1rem;border-left:1px solid var(--cmp-line)}
.cmp-notes p{margin:.3rem 0;font-size:.82rem;color:var(--cmp-dim)}

.cmp-go{appearance:none;cursor:pointer;width:100%;
  padding:.9rem;margin-top:.5rem;
  background:currentColor;border:0;border-radius:2px;
  font-family:ui-monospace,Menlo,monospace;font-size:.75rem;
  letter-spacing:.14em;text-transform:uppercase}
.cmp-go span{color:var(--cmp-bg,#000);mix-blend-mode:difference}
.cmp-go:disabled{opacity:.35;cursor:not-allowed}

.cmp-out{margin-top:1.75rem}
.cmp-out img,.cmp-out video{width:100%;display:block;border:1px solid var(--cmp-line)}
.cmp-err{border-left:3px solid currentColor;padding:.7rem 1rem;margin-top:1rem;font-size:.85rem}
.cmp-meta{font-family:ui-monospace,Menlo,monospace;font-size:.68rem;
  letter-spacing:.08em;text-transform:uppercase;color:var(--cmp-dim);margin-top:.6rem}

@media (prefers-reduced-motion:reduce){.cmp *{transition:none!important}}
`;

// --- rules mirrored from _taxonomy.js ---------------------------------------
// Keep in sync. If they drift, the server wins and the user sees an error
// instead of a greyed chip. Annoying, not dangerous.

function envTimeOk(bg, lt) {
  if (!bg || !lt) return true;
  if (lt.env !== 'any' && bg.env !== 'any' && lt.env !== bg.env) return false;
  if (lt.time !== 'any' && bg.time !== 'any' && lt.time !== bg.time) return false;
  return true;
}

function scopeOk(shot, cam) {
  if (!shot || !cam) return true;
  return shot.scope >= cam.minScope;
}

function isDisabled(dim, opt, sel, byKey) {
  const trial = { ...sel, [dim]: opt.key };
  const bg = byKey.background[trial.background];
  const lt = byKey.lighting[trial.lighting];
  const shot = byKey.shotType[trial.shotType];
  const cam = byKey.camera[trial.camera];

  if (!envTimeOk(bg, lt)) {
    return lt && bg && lt.time !== 'any' && bg.time !== 'any' && lt.time !== bg.time
      ? `${lt.label} is ${lt.time} light; ${bg.label} is a ${bg.time} scene`
      : `${lt.label} is ${lt.env} light and ${bg.label} is ${bg.env}`;
  }
  if (!scopeOk(shot, cam)) return `${cam.label} needs a wider frame than ${shot.label.toLowerCase()}`;
  return null;
}

// --- component ---------------------------------------------------------------

export function mountCompose(root, { getToken, getImageUrl }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  root.appendChild(style);

  const el = document.createElement('div');
  el.className = 'cmp';
  root.appendChild(el);

  const state = { dims: null, byKey: {}, sel: {}, busy: false, result: null, error: null, composeId: null };

  fetch('/api/options')
    .then((r) => r.json())
    .then(({ dimensions }) => {
      state.dims = dimensions;
      for (const [dim, opts] of Object.entries(dimensions)) {
        state.byKey[dim] = Object.fromEntries(opts.map((o) => [o.key, o]));
      }
      render();
    })
    .catch(() => { state.error = 'Could not load the shot options. Reload to try again.'; render(); });

  function pick(dim, key) {
    state.sel[dim] = state.sel[dim] === key ? undefined : key;

    // Selecting can invalidate an earlier pick. Clear the loser rather than
    // leave an impossible combination sitting in the slate.
    for (const [other] of DIMENSIONS) {
      if (other === dim || !state.sel[other]) continue;
      if (isDisabled(other, state.byKey[other][state.sel[other]], { ...state.sel, [other]: undefined }, state.byKey)) {
        state.sel[other] = undefined;
      }
    }
    state.error = null;
    render();
  }

  const complete = () => DIMENSIONS.every(([d]) => state.sel[d]);

  async function post(path, body) {
    const token = await getToken();
    if (!token) throw new Error('Sign in to generate.');
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.errors?.[0]?.message || json.error || 'Something went wrong.');
    return json;
  }

  async function compose() {
    const imageUrl = await getImageUrl();
    if (!imageUrl) { state.error = 'Upload a photo of yourself first.'; return render(); }

    state.busy = true; state.error = null; state.result = null; render();
    try {
      const out = await post('/api/compose', { imageUrl, selection: state.sel });
      state.composeId = out.composeId;
      state.result = { kind: 'image', url: out.imageUrl, warnings: out.warnings, remaining: out.remaining };
    } catch (err) {
      state.error = err.message;
    } finally {
      state.busy = false; render();
    }
  }

  async function animate() {
    state.busy = true; state.error = null; render();
    try {
      const out = await post('/api/animate', { composeId: state.composeId });
      state.result = { kind: 'video', url: out.videoUrl, remaining: out.remaining, warnings: [] };
    } catch (err) {
      state.error = err.message;
    } finally {
      state.busy = false; render();
    }
  }

  function slate() {
    const parts = DIMENSIONS.map(([dim, label]) => {
      const key = state.sel[dim];
      const value = key ? state.byKey[dim][key].label : '—';
      return `<b class="${key ? '' : 'cmp-unset'}"><span>${label}</span> ${value}</b>`;
    });
    return `<div class="cmp-slate">${parts.join('')}</div>`;
  }

  function render() {
    if (state.error && !state.dims) { el.innerHTML = `<div class="cmp-err">${state.error}</div>`; return; }
    if (!state.dims) { el.innerHTML = `<p class="cmp-meta">Loading shot options…</p>`; return; }

    const rows = DIMENSIONS.map(([dim, label]) => {
      const chips = state.dims[dim].map((opt) => {
        const reason = isDisabled(dim, opt, state.sel, state.byKey);
        const on = state.sel[dim] === opt.key;
        return `<button class="cmp-chip" type="button" data-dim="${dim}" data-key="${opt.key}"
          aria-pressed="${on}" ${reason && !on ? 'disabled' : ''}
          ${reason ? `title="${reason}"` : ''}><span>${opt.label}</span></button>`;
      }).join('');
      return `<div class="cmp-row"><h3>${label}</h3><div class="cmp-chips">${chips}</div></div>`;
    }).join('');

    const warnings = state.result?.warnings?.length
      ? `<div class="cmp-notes">${state.result.warnings.map((w) => `<p>${w}</p>`).join('')}</div>`
      : '';

    let output = '';
    if (state.result?.kind === 'image') {
      output = `<div class="cmp-out"><img src="${state.result.url}" alt="Your composed shot">
        ${warnings}
        <p class="cmp-meta">${state.result.remaining} stills left today</p>
        <button class="cmp-go" id="cmp-animate" ${state.busy ? 'disabled' : ''}>
          <span>${state.busy ? 'Rolling…' : 'Bring it to life'}</span></button></div>`;
    } else if (state.result?.kind === 'video') {
      output = `<div class="cmp-out"><video src="${state.result.url}" controls playsinline loop></video>
        <p class="cmp-meta">${state.result.remaining ?? 0} clips left today</p></div>`;
    }

    el.innerHTML = `
      ${slate()}
      ${rows}
      <button class="cmp-go" id="cmp-compose" ${!complete() || state.busy ? 'disabled' : ''}>
        <span>${state.busy && !state.result ? 'Composing…' : 'Compose the shot'}</span></button>
      ${state.error ? `<div class="cmp-err">${state.error}</div>` : ''}
      ${output}`;

    el.querySelectorAll('.cmp-chip').forEach((b) =>
      b.addEventListener('click', () => pick(b.dataset.dim, b.dataset.key)));
    el.querySelector('#cmp-compose')?.addEventListener('click', compose);
    el.querySelector('#cmp-animate')?.addEventListener('click', animate);
  }
}
