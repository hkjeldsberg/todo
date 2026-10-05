## Product Requirements Document: The Fashion & Fitting Room Critic

**Product Name:** "El Probador" (The Fitting Room)
**Objective:** A mobile-first, high-cadence web application designed to hardwire the neurological distinction between *quedar* (fit/suit), *parecer* (vibe/opinion), and *parecerse a* (resemblance) for Spanish learners.

### 1. Core Gameplay & Mechanics

The game revolves around rapid visual processing and syntax mapping. A central 2D avatar appears wearing various randomized clothing combinations (some stylish, some intentionally oversized, mismatched, or echoing specific subcultures).

**The Core Loop:**

1. **Visual Presentation:** An avatar drops onto the screen in a new outfit.
2. **The Prompt:** A timed question or unfinished sentence appears, targeting one of three distinct linguistic tracks.
3. **The Interaction:** The user must quickly select the correct verb and its corresponding pronoun/preposition mapping.
4. **Feedback:** Correct answers trigger a fluid transition to the next outfit. Incorrect answers freeze the screen, highlighting the grammatical mismatch, and queue the outfit for a closer repetition.

**The Three Prompt Tracks:**

* **Track A: Fit & Suitability (*Quedar*)**
* *Visual:* The avatar is wearing a jacket three sizes too big.
* *Prompt:* "¿Cómo le _____ la chaqueta?"
* *Target Answer:* **queda** (User must build: *Le queda grande* or *Le queda mal*).


* **Track B: Vibe & Opinion (*Parecer*)**
* *Visual:* The avatar is wearing a sharp tuxedo.
* *Prompt:* "¿Qué te _____ este estilo?"
* *Target Answer:* **parece** (User must build: *Me parece elegante*).


* **Track C: Resemblance (*Parecerse a*)**
* *Visual:* The avatar is wearing a vintage 80s pop-star outfit.
* *Prompt:* "Con esa ropa, ella _____ Madonna."
* *Target Answer:* **se parece a** (User must build: *Se parece a Madonna*).



### 2. Session Engine & Spaced Repetition

* **The Sprint:** Sessions are designed for 10-to-30-minute high-yield study blocks. Each session is capped at exactly 30 prompts.
* **The Micro-Interval Algorithm:**
* *Wrong answer:* The prompt is placed back into the current 30-outfit queue to be seen again within 2-3 minutes during the same session.
* *Right answer:* Removed from the current session queue and scheduled for the next day's sprint.
* *Mastered:* 3 consecutive daily correct answers push the item to a weekly maintenance interval.



### 3. Technical Architecture

* **Frontend Framework:** Next.js (App Router) with React and TypeScript.
* **Asset Rendering (2D Layered SVGs):** The avatar and clothing items are built using layered, inline SVGs rendered directly as React components. A base body component accepts children components (shirts, pants) via props, allowing for zero-latency outfit generation and dynamic color shifts via Tailwind utility classes.
* **UI Animations:** Framer Motion handles the rapid transitions between outfits and provides tactile feedback on syntax button presses.
* **Styling:** Tailwind CSS for a strictly mobile-first, responsive viewport.
* **Backend & Database:** Supabase (PostgreSQL), entirely within the `todo` schema.

### 4. Database Schema (`todo` Schema)

```sql
-- Store clothing combinations/visual states
CREATE TABLE todo.outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visual_asset_id TEXT NOT NULL, -- Reference to the SVG component mapping
  description TEXT, -- e.g., "Oversized red sweater"
  intended_flaw TEXT -- e.g., "too_big", "stylish", "looks_like_matrix"
);

-- Store the specific prompts linked to outfits
CREATE TABLE todo.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES todo.outfits(id) ON DELETE CASCADE,
  target_verb TEXT NOT NULL CHECK (target_verb IN ('quedar', 'parecer', 'parecerse')),
  question_text TEXT NOT NULL, -- e.g., "¿Cómo le {verb} la chaqueta?"
  correct_answer_syntax TEXT NOT NULL, -- e.g., "le queda grande"
  distractor_options JSONB NOT NULL -- e.g., ["se parece grande", "le parece grande"]
);

-- Track player performance for spaced repetition
CREATE TABLE todo.player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  prompt_id UUID REFERENCES todo.prompts(id) ON DELETE CASCADE,
  times_encountered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  current_interval_minutes INTEGER DEFAULT 10,
  UNIQUE(user_id, prompt_id)
);

```

### 5. MVP Content Scope

* **Inventory Database:** Seeded with 30 distinct visual SVG components (10 tops, 10 bottoms, 5 accessories, 5 full-body items).
* **Prompt Matrix:** Seeded with 30 distinct context sentences split evenly (10 *quedar*, 10 *parecer*, 10 *parecerse a*).

### 6. UI/UX Guidelines

* **The Viewport:** Top 60% dedicated to the SVG avatar; bottom 40% houses the interaction zone.
* **Interaction Zone:** Large, pill-shaped buttons. Selecting a pronoun (e.g., *Me*) dynamically slides in the valid verbs (*parece*, *queda*) to form a seamless sentence.
* **Color Theory:**
* *Quedar* elements (fit/location) use a specific brand color (e.g., Indigo).
* *Parecer* elements (opinion/vibe) use an opposing color (e.g., Emerald).
* *Parecerse a* uses a gradient/split color to signal the reflexive + preposition combo.


* **Unblocking:** If the user hesitates for more than 5 seconds, the correct pronoun or verb stem pulses to prevent frustration and maintain cadence.