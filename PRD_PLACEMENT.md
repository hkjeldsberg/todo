# PRD — El Laberinto del Gnomo (game `posiciones`)

> Find the gnome, describe his location, and explore the garden.
> A gamified production trainer for Spanish location phrases, part of the `todo` app (`/juegos/posiciones`).

Written 2026-09-29. This is the production-focused companion to **Dónde** (`/juegos/donde`). While Dónde trains *comprehension*, this game trains *production*. Wrapped in a top-down, retro-adventure aesthetic (orthographic 3D mimicking 2D RPGs), players must articulate the location of a mischievous garden gnome to progress through puzzle rooms.

---

## 1. Goal

By the end of the game, the learner can spontaneously describe the position of objects in 5+ different ways, freely choosing from ~80 location expressions with accurate grammar.

Specific target mechanics:

* Distinguishing `estar` (location) vs. `hay` (existence).
* Managing contractions (`del`, `al`).
* Handling gender/number agreement for participle prepositions (*pegado a*, *apoyado en*).
* Providing an accessible difficulty curve via a **Suggestion Toggle**, bridging the gap between passive recognition and active recall.

---

## 2. The Position Inventory (Content Source of Truth)

The game utilizes the single source of truth at `src/content/posiciones.json` (mirrored to the `todo.posiciones_expressions` table). It covers 80+ expressions from A1 to B1, including regional variations which are accepted and labelled.

**Targeted Garden/RPG Vocabulary Examples:**

* **A1 Core:** *en* (el cofre), *detrás de* (la estatua), *dentro de* (el jarrón), *entre* (el matorral y el árbol).
* **A2 Building:** *al otro lado de* (el puente), *en el rincón de* (el patio), *apoyado en* (el muro), *en el centro de* (la plaza).
* **B1 Fluency:** *a través de* (la reja), *al pie de* (la torre), *en lo alto de* (la colina), *más allá de* (el pozo).

---

## 3. Core Gameplay Loop

1. **Room Entry:** The player enters a new grid-based garden "room" (a top-down orthographic 3D scene). A classic 16-bit-style discovery chime plays.
2. **The Hide:** The target (*el gnomo*) scurries across the map and hides (e.g., behind a bush, inside a pot). He pulses with a pink outline.
3. **The Input Phase (The Toggle Mechanic):** The player must describe where the gnome is. The UI features a toggle switch: **"Mostrar sugerencias" (Show suggestions)**.
* **Toggle ON (Recognition Mode):** The text/voice input is replaced by a tray of 3-4 preposition chips (one correct, 2-3 distractors of the same category, e.g., *encima de*, *debajo de*, *detrás de*). The player taps the chip, then taps the reference object.
* **Toggle OFF (Production Mode):** The tray disappears, revealing the microphone and text field. The player must speak or type the phrase from memory (e.g., *"El gnomo está detrás del matorral"*).


4. **Instant Verdict (≤200 ms):**
* ✓ **True (Toggle ON):** Gnome drops a standard reward. Room cleared.
* ✓ **True (Toggle OFF):** Gnome drops a high-tier reward (extra points/album stickers). Room cleared.
* ✗ **False:** A retro RPG dialogue box appears stating what is actually true: *"No está dentro del jarrón — está **detrás del** jarrón."*
* ⛔ **Grammar Error:** Linter catches errors (e.g., *hay el gnomo*) and rejects with an inline rule explanation.


5. **Round Summary:** At the end of a "dungeon" (5-7 rooms), the player sees their used positions and **every other true position they could have used** highlighted on the map.

### 3.1 Scoring and Progression

| Event | Points |
| --- | --- |
| True position (Toggle OFF / Typed or Spoken) | 15 |
| True position (Toggle ON / Chip selected) | 5 |
| First time using an expression (New in Album) | +15 |
| B1 expression bonus | +5 |
| False or Grammar block | 0 (Feedback provided, try again) |

---

## 4. Screens & UI/UX

* **Viewpoint:** Top-down orthographic projection. The 3D papercraft models use flat, pixel-art-inspired color palettes to emulate a 2D 16-bit RPG aesthetic without changing the rendering engine.
* **Portrait Mobile First:**
* Top 60%: The orthographic map. Camera can be rotated in 90° increments using ⟲ ⟳ buttons, pivoting around the map center.
* Bottom 40%: The UI panel. Houses the "Mostrar sugerencias" toggle, the input bar (Mic/Text) OR the chip tray, and the health/score tracker.


* **Feedback UI:** Verdicts render as pixel-art dialogue boxes or memo cards (Baloo 2 font) anchored to the bottom of the map view.
* **The Album:** The meta-progression screen where discovered prepositions are collected like items in a Zelda inventory grid.

---

## 5. Logic and Parsing

### 5.1 Deterministic Parsing (Offline)

Answers submitted via Toggle OFF are parsed using a longest-match grammar:
`[subject] [está/hay/se encuentra] [justo]? [expression] [reference noun phrase] ([y] [second reference])?`
Subject aliases (*el gnomo*, *el duende*, *el enano*) and reference aliases (*el jarrón*, *la maceta*) are mapped to object IDs. Text is normalized for accents and case.

### 5.2 Relation Engine (Geometry)

Because the map uses a strict top-down grid (RPG style), the relation engine is highly reliable.

* Bounding boxes are aligned to the grid.
* *encima de* = Z-axis overlap; *detrás de* = Y-axis offset relative to camera; *cerca de* = 1 grid tile radius.
* Authored facts override geometry for specific narrative items (e.g., *en el pozo*).

### 5.3 Fallback Mechanism

If the deterministic parser fails on typed/spoken input, a fast `claude-haiku-4-5` call maps the sentence to `{expression_id, reference_ids[], grammar_issues[]}`. Truth is still verified exclusively by the geometric relation engine.

---

## 6. Scenes (The Dungeons)

Reusing Dónde's papercraft engine, the scenes are modeled as walled "rooms" or enclosed outdoor areas.

| Scene | Theme | Key Targets | Target Vocabulary Showcase |
| --- | --- | --- | --- |
| El Jardín (A1) | Starting area | bushes, clay pots, statues, bench | detrás de, dentro de, al lado de, cerca de |
| El Mercado (A2) | Village square | stalls, crates, well, fountain | enfrente de, en el centro de, entre |
| El Cementerio (A2) | Spooky | gravestones, dead trees, fences | al fondo de, al otro lado de, apoyado en |
| El Laberinto (B1) | Hedge maze | gates, narrow paths, towers | a través de, en lo alto de, más allá de |

---

## 7. Input and Accessibility

* **Voice (Default for Toggle OFF):** Utilizes `SpeechRecognition` (`es-ES` default, `es-419` selectable). Hold mic to speak, release to send.
* **Text Fallback:** Typing is always active if the mic is not held.
* **The Toggle (Accessibility):** The "Mostrar sugerencias" switch ensures the game remains playable in noisy environments or for users who are suffering from "blank page syndrome" and need recognition scaffolding before attempting production.

---

## 8. Data Schema (`todo`)

The game shares the database structure defined for the `todo` ecosystem.

```sql
-- Core inventory (Shared source of truth)
todo.posiciones_expressions (id text pk, es text, en text, level text, category text, needs_reference bool, references int default 1, region text null, notes text, sort int)

-- Scene definitions
todo.posiciones_scenes (id text pk, sort int unique, title_es text, title_en text, visual_layer text, objects jsonb, facts jsonb, targets text[])

-- Gameplay logging and Progression
todo.game_progress -- Tracks album unlocks and high scores per dungeon
-- (Slug: `posiciones_gnomo` or combined into `posiciones`)

```

* **Repaso Integration:** Failed attempts or unused expressions from the end-of-round summary are automatically pushed to the spaced-repetition queue as `game_item` cards.

---

## 9. Architecture

The codebase drops cleanly into the existing game contract:

```text
src/features/games/posiciones/
  Game.tsx             // Client root, manages Toggle state
  server.ts            // Content loading, Repaso integration
  model/
    inventory.ts       // strongly typed expressions
    parse.ts           // deterministic parser
    relations.ts       // grid-based truth table geometry
    judge.ts           // rules engine (parse -> geometry -> verdict)
    score.ts           // applies the +10 Toggle OFF bonus
  actions.ts           // Claude fallback (haiku)
  scene/               // Orthographic camera wrapper + papercraft renderer
  ui/
    InputToggle.tsx    // "Mostrar sugerencias" switch
    Tray.tsx           // Renders chips if Toggle ON
    CommandBar.tsx     // Mic/Text if Toggle OFF
    DialogBox.tsx      // Retro 16-bit style feedback UI

```

---

## 10. Quality Bar and Tests

* **Geometry Assertions:** The strict grid map requires tests verifying that every tile position resolves correctly against 4 camera rotations (North, South, East, West).
* **Parser Coverage:** ~300 fixtures testing voice-style unaccented input, colloquialisms, and missing subjects (*"Está en el pozo"* vs *"El gnomo está en el pozo"*).
* **Performance:** The orthographic camera + flat textures must maintain 60fps on mobile. Verdicts must resolve in < 200ms offline.

---

## 11. Phases

1. **Core Engine Adapter:** Implement the top-down orthographic camera wrapper over the existing 3D papercraft components. Flat-color materials.
2. **Logic & Parser:** Implement `parse.ts`, `relations.ts` (grid math), and the `todo` schema syncing. No UI yet.
3. **First Dungeon (El Jardín):** Build the starting room. Implement the Toggle UI (Chips vs. Text).
4. **Voice & Fallback:** Integrate Web Speech API and the Claude Haiku fallback for edge-case parsing.
5. **Content Expansion:** Roll out Mercado, Cementerio, and Laberinto rooms. Hook up the Sticker Album meta-progression.

---

## 12. Open Questions

1. **Rotation Orientation:** When the player rotates the orthographic camera 90°, does *a la derecha de* update to match the *new* camera perspective, or stay locked to the absolute map coordinates? (Recommendation: Update to the new camera perspective to force dynamic vocabulary usage).
- Update new camera perspective to force dynamic vocab
2. **Toggle Penalty vs. Bonus:** Is the Toggle ON state purely a baseline (5 pts) and Toggle OFF a bonus (15 pts), or should Toggle ON cost "stamina" or "rupees" to discourage over-reliance?
- Toggling should be "free" 