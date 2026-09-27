
## Product Requirements Document: Spanyard Smart Reader

### 1. Product Overview

**Objective:** Expand Spanyard with a dialogue-driven reading module tailored for A2 Spanish learners. The module generates and stores micro-stories that force natural switching between narrative past tenses (Preterite/Imperfect) and spoken tenses (Present, Future, Subjunctive, Reflexives), featuring smart hover-translations and instant Cloze-card exporting to your existing Leitner system.
**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Supabase, Qwen 3.5 Coder / Anthropic API (for text generation).

### 2. Supabase Schema Additions

To prevent token waste and integrate seamlessly with your existing flashcard schema, we will add a `stories` table to store the pre-parsed LLM JSON outputs.

**Table:** `stories`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, Default: `uuid_generate_v4()` | Unique identifier for the story. |
| `created_at` | `timestamptz` | Default: `now()` | Timestamp of generation. |
| `topic` | `text` | Not Null | The prompt topic (e.g., "Planning a weekend trip"). |
| `target_tenses` | `text[]` | Not Null | Array of tenses forced in the prompt (e.g., `["preterite", "subjunctive"]`). |
| `content_json` | `jsonb` | Not Null | The pre-parsed grammatical tree of the story (paragraphs, dialogue, tokens). |

**Table:** `flashcards` (Existing Spanyard Schema update)
*Ensure your existing flashcards table can accept the injected Cloze format:*

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `front_html` | `text` | Not Null | Contains the Cloze syntax: `Dudo que {{c1::vaya}} hoy.` |
| `back_html` | `text` | Not Null | Contains the translation/infinitive: `I doubt that I go today. (ir)` |
| `leitner_box` | `int2` | Default: `1` | Existing spaced repetition bucket. |
| `source_story_id` | `uuid` | Foreign Key (`stories.id`) | Links the flashcard back to its reading context. |

### 3. Core Mechanics & UI Flow

**A. Story Generation Interface**

* **Topic Input:** A text input where the user defines the scenario.
* **Grammar Toggles:** Checkboxes to heavily weight specific tenses (e.g., checking "Reflexives" ensures the prompt demands at least 8 reflexive verbs).
* **Action:** Submitting the form triggers a Next.js API route that calls the LLM, parses the response, inserts the row into the Supabase `stories` table, and redirects the user to the reading view.

**B. The Reading Canvas**

* **Visual Layout:** Narrative paragraphs are rendered in standard text blocks. Dialogue is rendered as distinct messaging bubbles to physically separate the narrative past from the spoken present/subjunctive.
* **Tense Highlighting:** A fixed toolbar allows the user to toggle color-coded highlights for specific grammar types (Preterite = Blue, Imperfect = Orange, Subjunctive = Green, Reflexives = Purple).

**C. Smart Hover Interactions**

* **Single Token:** Hovering over a word displays a tooltip with its lemma (infinitive/base form), tense, and direct translation.
* **Reflexive Grouping:** Pronouns and verbs (e.g., *me* + *levanto*) share a data attribute (`data-reflexive-id`). Hovering one triggers the hover state for both, displaying the combined translation ("I get up").
* **Subjunctive Triggers:** Hovering a subjunctive verb utilizes a `trigger_id` to simultaneously highlight the phrase that caused the subjunctive mood (e.g., *Espero que*).
* **Sentence Context:** Holding `Shift` while hovering translates the entire sentence block.

### 4. LLM Preprocessing Pipeline

The key to this application is moving the natural language processing to the *generation* step rather than the *render* step.

**System Prompt Architecture:**
You must enforce a strict JSON schema in your system prompt so the frontend receives ready-to-render DOM nodes.

```json
{
  "title": "En el Guachinche",
  "nodes": [
    {
      "type": "narrative",
      "tokens": [
        {"text": "Ayer,", "translation": "Yesterday,"},
        {"text": "fuimos", "infinitive": "ir", "tense": "preterite", "translation": "we went"},
        {"text": "a", "translation": "to"},
        {"text": "comer.", "translation": "eat."}
      ]
    },
    {
      "type": "dialogue",
      "speaker": "Camarero",
      "tokens": [
        {"text": "Sugiero", "infinitive": "sugerir", "tense": "present", "is_trigger": true, "trigger_id": "sub_1", "translation": "I suggest"},
        {"text": "que", "translation": "that"},
        {"text": "prueben", "infinitive": "probar", "tense": "subjunctive", "triggered_by": "sub_1", "translation": "you try"},
        {"text": "la", "translation": "the"},
        {"text": "carne.", "translation": "meat."}
      ]
    }
  ]
}

```

### 5. Data Flow: Exporting to Spanyard

Inside the hover tooltip for any token containing a `tense` property, render a **"Save to Spanyard"** button.

When clicked, the frontend fires a mutation:

1. Extracts the `text` token (e.g., *prueben*).
2. Extracts the parent node's full array of tokens and joins them into a sentence string.
3. Replaces the target token in the string with Cloze deletion formatting (`Sugiero que {{c1::prueben}} la carne.`).
4. POSTs the formatted string, translation, and `story_id` directly to your Supabase `flashcards` table.
5. Updates the UI badge to indicate the word is now actively tracked in your Leitner box system.