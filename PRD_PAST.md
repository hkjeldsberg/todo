Product Requirements Document: Preterite vs. Imperfect Engine
1. Product Overview
A mobile-first web application engineered to drill the Spanish past tense through contextual spaced repetition. The system moves beyond static conjugation tables by forcing context recognition (cloze deletion) and syntax assembly, utilizing a Leitner algorithm to ensure mastery of difficult irregular verbs. A persistent reference drawer ensures rapid unblocking during study sessions.

2. Technical Architecture

Frontend: Next.js (App Router), React, TypeScript.

Styling & Interactions: Tailwind CSS for responsive layout; Framer Motion for tense-switching visual feedback and drag-and-drop mechanics.

Backend & Auth: Supabase (deployed entirely under the todo schema).

Hosting: Vercel.

3. Core Mechanics & Features

The Tense Lock (Context Cloze): The primary learning loop. The user is presented with a contextual sentence (e.g., "Ayer, nosotros ___ (comer)"). They must first toggle a switch to lock in "Preterite" or "Imperfect".

Syntax Scrambler: For advanced mastery, standard cloze deletion is replaced by draggable word blocks. The user must reconstruct the sentence logically, ensuring trigger words (siempre, anoche) map to the correctly conjugated verb.

Leitner Spaced Repetition Engine: Verbs are categorized into 5 review boxes. Correct answers promote a verb to a longer review interval; incorrect answers immediately demote it to Box 1 for daily drilling.

Persistent Irregular Matrix (The Drawer): A toggleable sidebar or bottom-sheet drawer available globally across the UI. This prevents the user from abandoning a session when stuck by providing instant access to the core irregulars without leaving the current drill.

4. The Irregular Matrix (Required Seed Data)
This data will populate the global toggleable drawer. It isolates the most frequently used irregulars that deviate significantly from standard -ar, -er, and -ir rules.

Preterite Irregulars (The High-Frequency List)
These verbs drop standard accents and utilize a unique set of endings (-e, -iste, -o, -imos, -ieron or variations).

Ser / Ir (To be / To go): fui, fuiste, fue, fuimos, fueron (Identical in preterite)

Dar (To give): di, diste, dio, dimos, dieron

Ver (To see): vi, viste, vio, vimos, vieron

Hacer (To do/make): hice, hiciste, hizo, hicimos, hicieron

Tener (To have): tuve, tuviste, tuvo, tuvimos, tuvieron

Estar (To be): estuve, estuviste, estuvo, estuvimos, estuvieron

Poder (To be able to): pude, pudiste, pudo, pudimos, pudieron

Poner (To put): puse, pusiste, puso, pusimos, pusieron

Saber (To know): supe, supiste, supo, supimos, supieron

Querer (To want): quise, quisiste, quiso, quisimos, quisieron

Venir (To come): vine, viniste, vino, vinimos, vinieron

Decir (To say): dije, dijiste, dijo, dijimos, dijeron

Imperfect Irregulars (The Complete List)
The imperfect is highly consistent. The drawer only needs to display the three verbs in the entire language that are irregular in this tense.

Ser (To be): era, eras, era, éramos, eran

Ir (To go): iba, ibas, iba, íbamos, iban

Ver (To see): veía, veías, veía, veíamos, veían

5. Database Schema Definition (todo Schema)
All tables must reside within the todo schema in Supabase to isolate the learning engine's data architecture.

SQL
-- Store the core verbs and their forms
CREATE TABLE todo.verbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infinitive TEXT NOT NULL UNIQUE,
  is_irregular BOOLEAN DEFAULT FALSE,
  preterite_forms JSONB NOT NULL,
  imperfect_forms JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store contextual sentences for the cloze mechanic
CREATE TABLE todo.drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verb_id UUID REFERENCES todo.verbs(id) ON DELETE CASCADE,
  sentence_template TEXT NOT NULL, -- e.g., "Cuando era niño, {verb} mucho en el parque."
  correct_tense TEXT CHECK (correct_tense IN ('preterite', 'imperfect')),
  trigger_word TEXT,
  english_translation TEXT
);

-- Track the Leitner Box intervals per user per verb
CREATE TABLE todo.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  verb_id UUID REFERENCES todo.verbs(id) ON DELETE CASCADE,
  current_box INTEGER DEFAULT 1 CHECK (current_box BETWEEN 1 AND 5),
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  UNIQUE(user_id, verb_id)
);
6. User Interface Guidelines
Mobile-First Tap Targets: The tense toggle (Preterite vs. Imperfect) must be a prominent, thumb-friendly segment control.

Color Coding:

Preterite UI elements use solid, sharp styling (representing completed actions).

Imperfect UI elements use soft, continuous gradients (representing ongoing/habitual actions).

Irregular verb roots glow with an amber or distinct warning color to visually separate them from regular verb text in the UI.

The Drawer Interaction: The irregular matrix should sit behind a floating action button (FAB) or a persistent top-nav icon. Tapping it triggers a Framer Motion slide-over from the right (or bottom on mobile), allowing the user to peek at the todo.verbs data without losing their current drill state.