// api/share.js
//
// POST { assetId }  +  Authorization: Bearer <supabase access token>
//  ->  { url, shareId }
//
// Flips assets.public to true. This is the moment a private cast becomes
// world-readable, so it runs server-side, checks the caller owns the row,
// and is only ever called from a share button the user actually clicked.

import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const SITE = (process.env.SITE_URL || 'https://aidirectorme.com').replace(/\/+$/, '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to share.' });

  const { data: userData, error: authErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (authErr || !user) return res.status(401).json({ error: 'Sign in to share.' });

  const { assetId } = req.body || {};
  if (!assetId) return res.status(400).json({ error: 'Missing asset.' });

  // Ownership is enforced in the filter, not in a separate read.
  const { data: asset, error } = await admin
    .from('assets')
    .update({ public: true })
    .eq('id', assetId)
    .eq('user_id', user.id)
    .eq('deleted', false)
    .select('share_id')
    .single();

  if (error || !asset) {
    return res.status(404).json({ error: 'That cast is not yours to share.' });
  }

  return res.status(200).json({
    shareId: asset.share_id,
    url: `${SITE}/cast/${asset.share_id}`,
  });
}
