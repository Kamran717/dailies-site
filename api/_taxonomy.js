/**
 * api/_taxonomy.js
 *
 * Server-side option catalog + conflict resolution + prompt assembly
 * for the "custom star in the scene" feature.
 *
 * The leading underscore keeps Vercel from treating this as a route.
 *
 * CONTRACT:
 *   The client sends KEYS ONLY (e.g. { lighting: "golden_hour" }).
 *   It never sends prose. This file is the only place prompt text exists.
 *
 * USAGE:
 *   import { buildPrompt, CATALOG } from './_taxonomy.js';
 *   const result = buildPrompt(selection, { mode: 'still' });
 *   if (!result.ok) return res.status(400).json({ errors: result.errors });
 */

// ---------------------------------------------------------------------------
// Attribute vocabulary used by the conflict engine
//
//   env:  'interior' | 'exterior' | 'any'
//   time: 'day' | 'night' | 'any'
//   scope: numeric framing scale, 0 = tightest, 5 = widest
//   motion: does this action involve the body traveling through space?
// ---------------------------------------------------------------------------

export const CATALOG = {
  background: {
    rain_soaked_alley:    { label: 'Rain-soaked alley',    env: 'exterior', time: 'night', frag: 'a narrow rain-soaked alley, wet asphalt throwing back reflections, steam from a grate' },
    neon_street:          { label: 'Neon street',          env: 'exterior', time: 'night', frag: 'a dense city street washed in neon signage, shopfronts bleeding colour onto the pavement' },
    desert_highway:       { label: 'Desert highway',       env: 'exterior', time: 'day',   frag: 'an empty desert highway running to the horizon, heat shimmer, scrub and dust' },
    pine_forest:          { label: 'Pine forest',          env: 'exterior', time: 'any',   frag: 'a dense pine forest, trunks receding into depth, needle floor, thin mist between the trees' },
    rooftop_city:         { label: 'City rooftop',         env: 'exterior', time: 'any',   frag: 'a bare concrete rooftop above a sprawling city, HVAC units, the skyline behind' },
    coastal_cliff:        { label: 'Coastal cliff',        env: 'exterior', time: 'any',   frag: 'a windswept coastal cliff edge, grass flattened by wind, grey sea below' },
    snowfield:            { label: 'Snowfield',            env: 'exterior', time: 'day',   frag: 'an unbroken snowfield under a pale flat sky, no horizon line to speak of' },
    subway_platform:      { label: 'Subway platform',      env: 'interior', time: 'any',   frag: 'a deserted subway platform, tiled walls, tracks falling away into the dark' },
    empty_theater:        { label: 'Empty theater',        env: 'interior', time: 'any',   frag: 'the aisle of an empty theater, rows of seats in shadow, the screen dark' },
    industrial_warehouse: { label: 'Warehouse',            env: 'interior', time: 'any',   frag: 'a vast empty industrial warehouse, dust in the air, high clerestory windows' },
    diner_booth:          { label: 'Diner booth',          env: 'interior', time: 'any',   frag: 'a vinyl booth in a late-night diner, formica table, chrome edging, laminate menu' },
    hotel_corridor:       { label: 'Hotel corridor',       env: 'interior', time: 'any',   frag: 'a long anonymous hotel corridor, patterned carpet, identical doors in perspective' },
  },

  lighting: {
    golden_hour:          { label: 'Golden hour',          env: 'exterior', time: 'day',   frag: 'low golden-hour sunlight raking in from the side, long shadows, warm falloff' },
    harsh_noon:           { label: 'Harsh noon',           env: 'exterior', time: 'day',   frag: 'harsh overhead noon sun, short hard shadows, blown highlights, squinting contrast' },
    overcast_soft:        { label: 'Overcast',             env: 'exterior', time: 'day',   frag: 'flat overcast daylight, soft shadowless wrap, muted desaturated palette' },
    moonlight:            { label: 'Moonlight',            env: 'exterior', time: 'night', frag: 'cold blue moonlight from a high angle, deep shadow, faint rim on the shoulders' },
    neon_wash:            { label: 'Neon wash',            env: 'any',      time: 'night', frag: 'saturated neon light from off-frame sources, magenta and cyan splitting across the face' },
    firelight:            { label: 'Firelight',            env: 'any',      time: 'night', frag: 'low warm firelight from below, flickering, everything beyond a few feet falling to black' },
    practical_lamps:      { label: 'Practical lamps',      env: 'interior', time: 'any',   frag: 'warm practical lamps within the frame doing the lighting, pools of light and deep gaps' },
    fluorescent_overhead: { label: 'Fluorescent',          env: 'interior', time: 'any',   frag: 'green-tinged fluorescent overheads, unflattering top light, no warmth anywhere' },
    single_key_hard:      { label: 'Hard key',             env: 'any',      time: 'any',   frag: 'a single hard key light from one side, the other half of the face in near-total shadow' },
    silhouette_backlight: { label: 'Silhouette',           env: 'any',      time: 'any',   frag: 'strong backlight reducing the subject to near-silhouette, edges glowing, features lost' },
  },

  shotType: {
    extreme_close_up: { label: 'Extreme close-up', scope: 0, frag: 'extreme close-up, the face filling the frame, eyes and mouth only' },
    close_up:         { label: 'Close-up',         scope: 1, frag: 'close-up, head and shoulders, background compressed and soft' },
    medium:           { label: 'Medium',           scope: 2, frag: 'medium shot, waist up, the subject clearly dominant in frame' },
    medium_wide:      { label: 'Medium wide',      scope: 3, frag: 'medium-wide shot, full body, the surrounding space legible' },
    wide:             { label: 'Wide',             scope: 4, frag: 'wide shot, the subject small against the environment' },
    extreme_wide:     { label: 'Extreme wide',     scope: 5, frag: 'extreme wide shot, the subject a figure in a vast landscape, scale doing the work' },
  },

  // Camera MOVE. Only rendered into the prompt when mode === 'animate'.
  // For stills it contributes framing energy (see MOVE_STILL_HINT) or nothing.
  camera: {
    static_lock:     { label: 'Static',           minScope: 0, frag: 'locked-off static camera, no movement' },
    slow_push_in:    { label: 'Slow push in',     minScope: 0, frag: 'slow deliberate dolly push toward the subject' },
    slow_pull_out:   { label: 'Slow pull out',    minScope: 0, frag: 'slow dolly pull away from the subject, revealing space' },
    handheld_follow: { label: 'Handheld follow',  minScope: 1, frag: 'handheld camera following the subject, subtle instability, breathing frame' },
    dolly_zoom:      { label: 'Dolly zoom',       minScope: 1, frag: 'dolly zoom, background warping while the subject holds size' },
    low_angle_track: { label: 'Low tracking',     minScope: 2, frag: 'low-angle tracking move alongside the subject' },
    whip_pan:        { label: 'Whip pan',         minScope: 2, frag: 'fast whip pan settling on the subject, motion smear on the turn' },
    crane_up:        { label: 'Crane up',         minScope: 3, frag: 'crane rising away from the subject, the geography opening up beneath' },
    drone_orbit:     { label: 'Drone orbit',      minScope: 3, frag: 'aerial drone orbiting the subject, wide arc, parallax across the landscape' },
  },

  action: {
    standing_still:   { label: 'Standing still',   motion: false, frag: 'standing still, weight settled, not moving' },
    sitting:          { label: 'Sitting',          motion: false, frag: 'seated, shoulders low' },
    looking_away:     { label: 'Looking away',     motion: false, frag: 'looking away from camera, attention somewhere off-frame' },
    turning_to_camera:{ label: 'Turning to camera',motion: true,  frag: 'caught mid-turn toward the lens' },
    walking_toward:   { label: 'Walking toward',   motion: true,  frag: 'walking steadily toward the camera' },
    running:          { label: 'Running',          motion: true,  frag: 'running at full effort, body committed forward' },
    reaching_out:     { label: 'Reaching out',     motion: true,  frag: 'one hand extended toward something out of frame' },
    shouting:         { label: 'Shouting',         motion: true,  frag: 'mouth open mid-shout, neck tendons drawn' },
  },

  emotion: {
    serene:     { label: 'Serene',     frag: 'a settled, unbothered expression' },
    grief:      { label: 'Grief',      frag: 'grief held in, eyes wet but the face not yet broken' },
    defiant:    { label: 'Defiant',    frag: 'jaw set, chin slightly raised, refusing to look away' },
    fear:       { label: 'Fear',       frag: 'fear surfacing, eyes wide, breath shallow' },
    joy:        { label: 'Joy',        frag: 'open unguarded delight' },
    exhaustion: { label: 'Exhaustion', frag: 'complete exhaustion, the face slack, eyes unfocused' },
    menace:     { label: 'Menace',     frag: 'quiet menace, the stillness of someone who has decided' },
    longing:    { label: 'Longing',    frag: 'longing, the expression of someone looking at what they cannot have' },
    awe:        { label: 'Awe',        frag: 'awe, lips parted, taking in something enormous' },
  },

  format: {
    cinemascope:  { label: '2.39:1 Scope', aspect: '21:9', frag: 'anamorphic 2.39:1 widescreen, subtle horizontal flare, oval bokeh' },
    widescreen:   { label: '16:9',         aspect: '16:9', frag: 'clean 16:9 digital cinema framing' },
    academy:      { label: '4:3 Academy',  aspect: '4:3',  frag: '4:3 academy ratio, 16mm grain, slightly soft corners' },
    vertical:     { label: '9:16 Vertical',aspect: '9:16', frag: '9:16 vertical framing composed for the format, not a crop' },
    square:       { label: '1:1',          aspect: '1:1',  frag: '1:1 square framing, centred composition' },
  },
};

// Constant tail. Keeps outputs looking like film rather than stock photography.
const STYLE_TAIL =
  'photographic, shot on cinema camera with prime lens, natural skin texture, ' +
  'filmic contrast, no text, no watermark, no logo';

const NEGATIVE =
  'cartoon, illustration, 3d render, cgi, plastic skin, airbrushed, ' +
  'extra fingers, deformed hands, distorted face, text, watermark, logo, ' +
  'oversaturated, hdr, beauty filter';

// Stills have no camera move. But the *choice* of move implies energy that a
// still can honour. Anything not listed here contributes nothing to a still.
const MOVE_STILL_HINT = {
  handheld_follow: 'frame slightly canted, the immediacy of a handheld operator',
  dolly_zoom:      'unsettling perspective compression between subject and background',
  whip_pan:        'directional motion blur across the background',
  low_angle_track: 'low camera height, looking up at the subject',
  crane_up:        'elevated camera position looking down',
  drone_orbit:     'high aerial vantage',
};

// ---------------------------------------------------------------------------
// Conflict rules
//
// severity 'block'  -> reject the request, tell the user why. Costs nothing.
// severity 'soften' -> generate anyway, but drop or rewrite the losing fragment
//                      and surface a warning. The user gets an image, not an error.
//
// Bias toward 'soften'. A blocked request is a dead end; a softened one is a
// picture they can react to. Only block where the two choices cannot coexist
// in the same photograph.
// ---------------------------------------------------------------------------

function attributeConflicts(sel) {
  const errors = [];
  const bg = CATALOG.background[sel.background];
  const lt = CATALOG.lighting[sel.lighting];

  // Sunlight indoors, moonlight indoors, lamps outdoors.
  if (lt.env !== 'any' && bg.env !== 'any' && lt.env !== bg.env) {
    errors.push({
      code: 'ENV_MISMATCH',
      message: `${lt.label} is ${lt.env} light and ${bg.label} is an ${bg.env} location.`,
      fields: ['lighting', 'background'],
    });
  }

  // Golden hour on a moonlit street.
  if (lt.time !== 'any' && bg.time !== 'any' && lt.time !== bg.time) {
    errors.push({
      code: 'TIME_MISMATCH',
      message: `${lt.label} is ${lt.time} light; ${bg.label} is a ${bg.time} scene.`,
      fields: ['lighting', 'background'],
    });
  }

  return errors;
}

function scopeConflicts(sel) {
  const errors = [];
  const shot = CATALOG.shotType[sel.shotType];
  const cam = CATALOG.camera[sel.camera];

  // You cannot orbit a drone around an extreme close-up.
  if (shot.scope < cam.minScope) {
    errors.push({
      code: 'SCOPE_MISMATCH',
      message: `${cam.label} needs at least a ${scopeLabel(cam.minScope)} — a ${shot.label.toLowerCase()} is too tight for it.`,
      fields: ['camera', 'shotType'],
    });
  }

  return errors;
}

function scopeLabel(scope) {
  const hit = Object.values(CATALOG.shotType).find((s) => s.scope === scope);
  return hit ? hit.label.toLowerCase() : 'wider shot';
}

// Pairwise softenings. [dimension, key, dimension, key, what to do]
const SOFTEN_RULES = [
  // A body running is not readable inside a face-filling frame.
  { when: (s) => s.shotType === 'extreme_close_up' && CATALOG.action[s.action].motion,
    drop: 'action',
    note: (s) => `At extreme close-up, "${CATALOG.action[s.action].label}" won't read — using the expression alone.` },

  // Emotion and action pulling opposite directions.
  { when: (s) => s.emotion === 'serene' && ['running', 'shouting'].includes(s.action),
    rewrite: { emotion: 'a composure that is beginning to fail' },
    note: () => 'Serenity and violent motion fight each other — softened toward strained composure.' },

  { when: (s) => s.emotion === 'exhaustion' && s.action === 'running',
    rewrite: { action: 'running on empty, form collapsing, each stride a decision' },
    note: () => 'Reframed the run as exhausted rather than athletic.' },

  { when: (s) => s.emotion === 'joy' && s.lighting === 'silhouette_backlight',
    note: () => 'A silhouette hides the face — the joy will have to live in the body language.' },

  { when: (s) => s.emotion === 'grief' && s.shotType === 'extreme_wide',
    note: () => 'At this scale the face is unreadable; grief will register as posture, not expression.' },

  // Wide-scale moves against a scene with no geography to reveal.
  { when: (s) => ['crane_up', 'drone_orbit'].includes(s.camera) && CATALOG.background[s.background].env === 'interior',
    note: (s) => `${CATALOG.camera[s.camera].label} indoors is constrained — expect a tighter move than you're picturing.` },
];

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const REQUIRED = ['background', 'lighting', 'shotType', 'camera', 'action', 'emotion', 'format'];

function validateKeys(sel) {
  const errors = [];
  for (const dim of REQUIRED) {
    const key = sel[dim];
    if (!key) {
      errors.push({ code: 'MISSING', message: `${dim} is required.`, fields: [dim] });
    } else if (!Object.prototype.hasOwnProperty.call(CATALOG[dim], key)) {
      // Unknown key = client sent something we didn't offer. Never pass through.
      errors.push({ code: 'UNKNOWN_OPTION', message: `Unknown ${dim}.`, fields: [dim] });
    }
  }
  return errors;
}

/**
 * @param {object} selection  keys only, one per dimension
 * @param {object} opts       { mode: 'still' | 'animate' }
 * @returns {{ok:true, prompt, negative, aspectRatio, warnings}} |
 *          {{ok:false, errors}}
 */
export function buildPrompt(selection, opts = {}) {
  const mode = opts.mode === 'animate' ? 'animate' : 'still';

  const keyErrors = validateKeys(selection);
  if (keyErrors.length) return { ok: false, errors: keyErrors };

  const hardErrors = [...attributeConflicts(selection), ...scopeConflicts(selection)];
  if (hardErrors.length) return { ok: false, errors: hardErrors };

  // Apply softenings. Work on a copy of the fragments, not the selection.
  const frag = {};
  for (const dim of REQUIRED) frag[dim] = CATALOG[dim][selection[dim]].frag;

  const warnings = [];
  for (const rule of SOFTEN_RULES) {
    if (!rule.when(selection)) continue;
    if (rule.note) warnings.push(rule.note(selection));
    if (rule.drop) frag[rule.drop] = null;
    if (rule.rewrite) for (const [dim, text] of Object.entries(rule.rewrite)) frag[dim] = text;
  }

  // Camera handling differs by mode.
  if (mode === 'still') {
    frag.camera = MOVE_STILL_HINT[selection.camera] || null;
  }

  // Order matters: subject first, technical last. Image models weight early tokens.
  const ordered = [
    'a portrait of the person in the reference image',
    frag.emotion,
    frag.action,
    frag.shotType,
    frag.camera,
    frag.background,
    frag.lighting,
    frag.format,
    STYLE_TAIL,
  ].filter(Boolean);

  return {
    ok: true,
    prompt: ordered.join(', '),
    negative: NEGATIVE,
    aspectRatio: CATALOG.format[selection.format].aspect,
    warnings,
  };
}

/**
 * Everything the client needs to render the picker, including which options
 * are incompatible with the current selection. Call this on every change so
 * the UI can grey out dead ends before the user hits generate.
 */
export function availableOptions(partialSelection = {}) {
  const out = {};
  for (const dim of REQUIRED) {
    out[dim] = Object.entries(CATALOG[dim]).map(([key, def]) => {
      const trial = { ...partialSelection, [dim]: key };
      const complete = REQUIRED.every((d) => trial[d]);
      let disabled = false;
      let reason = null;

      if (complete) {
        const errs = [...attributeConflicts(trial), ...scopeConflicts(trial)];
        if (errs.length) {
          disabled = true;
          reason = errs[0].message;
        }
      }
      return { key, label: def.label, disabled, reason };
    });
  }
  return out;
}
