\# AiDirectorMe — Scene Prompt Standard



\## Why this exists



The cast feature composites a user's uploaded image into a scene and regenerates it. That regeneration is driven by the site clip's prompt. If the prompt is vague — "cinematic shot, slow dolly in, natural light" — the user's result drifts away from the clip they clicked: different setting, mood, wardrobe, framing. It stops feeling like "the same scene, with me in it," which is the entire promise of the product.



The test for a correct prompt: \*\*regenerating from it reproduces the same scene, with only the subject swapped.\*\* If two people couldn't rebuild the same shot from the words alone, it's not specific enough.



\## The subject slot — keep it the user, not the character



Every scene has exactly one \*\*SUBJECT\*\*: the placeholder the user's uploaded image fills. The user must come out looking \*\*exactly like themselves\*\* — their real face and likeness preserved, never blended toward or matched to a described character. So the subject description carries \*\*only framing, position, pose, and action\*\* — never face, age, hair, or distinctive features, and never a named character.



\* Right: `a person, center-frame, back half-turned, looking out over the railing`

\* Wrong: `a red-haired woman, 30s, freckles` — bakes a character's face into the prompt and pulls the user's result away from their own likeness



All the richness goes into the \*\*scene around the subject\*\* — background, era, time, props, lighting, camera — not into who the subject is. That's the balance this whole standard is built on: \*\*maximal detail on the world, minimal detail on the person\*\*, so the scene matches the site clip while the face stays the user's own.



> \\\*\\\*Wardrobe is the scene's.\\\*\\\* The user is dressed into the scene's outfit — the raincoat, the linen shirt — so wardrobe \\\*is\\\* specified in the prompt, as clothing and silhouette. Only the face and likeness stay the user's; those are never described.



\## Fixed field order



Every prompt is built from these eleven fields, in this order. None are optional — an empty field is where drift enters.



1\. \*\*Medium / style\*\* — live-action photoreal | cel-shaded anime | stylized 3D | VHS | etc. (a photoreal scene vs an anime one composites completely differently)

2\. \*\*Era / period\*\* — present day | 1979 | near-future 2140 | medieval

3\. \*\*Setting / background\*\* — concrete location + the 2–3 background elements that define it

4\. \*\*Time \\\& atmosphere\*\* — time of day, weather, air (fog, dust, rain, haze)

5\. \*\*Subject\*\* — the generic placeholder + framing/position/pose (identity stays the user's — no face, age, hair, or character)

6\. \*\*Wardrobe\*\* — the scene's outfit the user is dressed into: clothing, silhouette, materials (scene-owned, always specified)

7\. \*\*Action\*\* — the motion the clip actually shows (subject and/or environment)

8\. \*\*Props / icons\*\* — the specific objects in frame that sell the scene

9\. \*\*Lighting\*\* — source, direction, quality, color

10\. \*\*Camera\*\* — shot type, lens, movement, format

11\. \*\*Finish\*\* — grain, fps, depth of field, motion blur, grade



\## Assembly



Generation models take prose, not fields. String the eleven fields into 2–4 sentences \*\*in the order above\*\*: lead with medium + era + setting, drop in time/atmosphere, place the SUBJECT and dress it in the scene's wardrobe, state the action, name the props, then lighting → camera → finish.



Keep every clause reproducible. Delete bare adjectives that don't describe a thing anyone could rebuild — "beautiful," "cinematic," "stunning" on their own carry no scene information. "Cinematic" becomes "shallow depth of field, subtle grain, 24fps."



\## Field schema (for the generator)



`generateTagCollection` currently assembles prompts from loose fragments, which is the vague-prompt source. Going forward, build every prompt from a structured object so completeness is guaranteed, then assemble in fixed order:



```js

// One scene = one fully-populated object. No field left blank.

{

&#x20; medium:  "live-action photoreal",

&#x20; era:     "present day",

&#x20; setting: "a narrow neon alley, signage-stacked walls, dripping AC units",

&#x20; time:    "night, just after rain — wet asphalt, faint steam",

&#x20; subject: "a person, center-frame, facing camera",  // framing/pose/action ONLY — no face, age, hair, or named character; the user's uploaded image is the identity

&#x20; wardrobe:"black hooded raincoat, hands in pockets",  // scene-owned: the user is styled into this

&#x20; action:  "lifts their head slowly toward the lens",

&#x20; props:   "pink and cyan neon kanji signs, a puddle, a single hanging bulb",

&#x20; lighting:"magenta key from screen-left signage, cyan rim behind, deep shadow fill",

&#x20; camera:  "35mm, slow dolly in, spherical",

&#x20; finish:  "shallow depth of field, subtle grain, gentle motion blur, 24fps"

}



// assemble(): join in field order into 2-4 prose sentences.

```



The same object is the source of truth for both the site render and the cast: the site video is generated from it, and the cast reuses every field except `subject`'s identity.



\## Do / Don't



\* \*\*Do\*\* name real objects (a rotary phone, a market crate, a katana) — props are what make a scene recognizable.

\* \*\*Do\*\* state where the subject sits in frame (center, screen-left, back-to-camera) and what they do — position, pose, action.

\* \*\*Do\*\* specify the scene's wardrobe (the user is dressed into it) — clothing, silhouette, materials.

\* \*\*Do\*\* keep the subject a generic placeholder (`a person`) — that's correct, not vague; the user's uploaded image is the identity.

\* \*\*Don't\*\* describe the subject's face, age, hair, or features, or name a character — that overrides the user's real likeness, which must be preserved.

\* \*\*Don't\*\* stack mood words in place of scene facts ("moody, dramatic, intense").

\* \*\*Don't\*\* let the camera/finish line carry the whole prompt — that's the vague pattern we're replacing.



\## Worked examples (vague → compliant)



\*\*Neon alley (camera: Slow Dolly In)\*\*



\* Before: `Medium shot, slow dolly in. Neon Wash lighting. A figure in a city; the atmosphere carries unease. Natural motion, cinematic detail, 24fps.`

\* After: `Live-action photoreal, present day. A narrow alley at night, walls stacked with glowing signage and dripping AC units; rain just stopped, wet asphalt mirroring the signs with faint steam rising. A person in a black hooded raincoat, hands in pockets, stands center-frame facing the camera and slowly lifts their head. Flickering pink and cyan neon kanji signs, a puddle, a single hanging bulb. Magenta key from screen-left signage, cyan rim from behind, deep shadow fill. 35mm, slow dolly in, spherical lens. Shallow depth of field, subtle grain, gentle motion blur, 24fps.`



\*\*Farmers market (format: iPhone Handheld)\*\*



\* Before: `iPhone Handheld. A subject; the atmosphere carries warmth. Shot on iPhone Handheld.`

\* After: `Live-action photoreal, present day, shot on an iPhone. A sunlit market street, stalls of produce crates and striped awnings behind. Late morning, clear, warm haze. A person in a linen shirt with sunglasses pushed up, holding a coffee cup, walks toward camera and glances off-frame with a small smile. Fruit crates, hand-lettered price signs, a canvas tote. Hard noon sun with warm bounce off the pavement. iPhone main lens, handheld sway, natural stabilization. Slight lens flare, digital clarity, 30fps.`



\## Where it applies



\* \*\*REAL\\\_PROMPTS\*\* (per-clip locked prompts): each must be the full, detailed prompt the clip was \*actually rendered from\* — capture it verbatim from Higgsfield history. That's the same reason the `REAL\\\_PROMPTS` scaffold exists, and those rendered prompts are exactly the detailed ones this standard requires.

\* \*\*generateTagCollection\*\*: replace fragment assembly with the field schema above, so no generated prompt can be vague.

\* \*\*New collections / clips\*\*: author the ten fields first, then assemble — never write the sentence first.





