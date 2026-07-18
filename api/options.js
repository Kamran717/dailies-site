/**
 * api/options.js
 *
 * GET -> { dimensions: { background: [ {key, label, env, time}, ... ], ... } }
 *
 * Serves labels and the ATTRIBUTES the conflict rules run on. It does not
 * serve `frag` — the prompt text stays on the server. The client can grey
 * out dead ends instantly without ever seeing how the prompt is written.
 *
 * Public and cacheable. No auth: this is a menu, not a resource.
 */

import { CATALOG } from './_taxonomy.js';

const EXPOSED = {
  background: ['env', 'time'],
  lighting:   ['env', 'time'],
  shotType:   ['scope'],
  camera:     ['minScope'],
  action:     ['motion'],
  emotion:    [],
  format:     ['aspect'],
};

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const dimensions = {};
  for (const [dim, attrs] of Object.entries(EXPOSED)) {
    dimensions[dim] = Object.entries(CATALOG[dim]).map(([key, def]) => {
      const out = { key, label: def.label };
      for (const a of attrs) out[a] = def[a];
      return out;
    });
  }

  // The catalog only changes when you deploy.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ dimensions });
}
