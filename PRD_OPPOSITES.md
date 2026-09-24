## Product Specification: El Rayo Modificador (The Physics Sandbox)

**Objective:** A web-native 3D physics sandbox where players solve open-ended spatial puzzles by altering the physical properties of objects using Spanish descriptive opposites. The game reinforces vocabulary by mapping adjectives directly to rigid-body physics variables, providing immediate, tangible feedback for every word chosen.

## Gameplay Mechanics

The player navigates an isometric or third-person 3D environment populated with neutral, interactive objects (blocks, spheres, ramps) and environmental obstacles (gaps, water, glass walls).

* **Interaction:** The player targets an object and activates the "Rayo Modificador" (Modifier Ray), which pauses the physics simulation and opens a radial UI menu populated with Spanish adjectives.
* **The Choice:** The player selects a descriptive word (e.g., *pesado*, *elástico*, *áspero*) to apply to the target object.
* **Physics Resolution:** Upon selection, the physics simulation resumes. The chosen Spanish word injects a specific numeric multiplier into the object's Rapier rigid-body properties. For example, selecting *elástico* immediately sets the restitution (bounciness) to 1.5, causing a falling block to bounce uncontrollably.
* **Open-Ended Problem Solving:** There is no single correct answer. Players might cross a gap by making a plank *largo* (scaling the X-axis), or by making a sphere *ligero* (reducing mass) and *elástico* (increasing restitution) to bounce across.
* **Feedback Loop:** If a combination fails (e.g., making a block *pesado* on a weak glass bridge shatters it), the player simply hits a reset button to instantly restore the room's base state and try new vocabulary combinations.
* **Progression:** Levels transition from teaching single concepts (mass: *pesado/ligero*) to complex, multi-step chain reactions requiring combined physics states (e.g., an object must be *pequeño* to fit through a pipe, then hit with *mojado/resbaladizo* to slide down a zero-friction ramp).

## Technical Architecture

The project utilizes a modern React-based 3D web stack to ensure seamless integration between React UI states and the WebGL canvas, allowing real-time physics manipulation via a headless CMS backend.

* **Frontend Framework:** Next.js (App Router) combined with React and TypeScript. Tailwind CSS handles the 2D radial UI and overlay menus.
* **3D Engine & Physics:** React Three Fiber (R3F) handles the scene graph and canvas rendering. `@react-three/rapier` is strictly used for the physics engine, providing the necessary hooks (`RigidBody`, `useFixedUpdate`) to dynamically update mass, friction, and restitution at runtime.
* **Visual Aesthetic:** Custom WebGL shaders applied globally via `@react-three/postprocessing` to maintain a retro-modern comic book art style. Neutral objects are rendered with flat cel-shading and variable-width black ink outlines. Applied adjectives trigger distinct shader uniforms (e.g., *caliente* adds a red volumetric glow; *áspero* applies a high-frequency noise bump map).
* **Backend & Data Layer:** Supabase manages the PostgreSQL database, isolating the level design logic and vocabulary parameters from the frontend. This allows dynamic adjustments to puzzle layouts and physics multipliers without redeploying the client application.

## Content Data Schema

Vocabulary and physics parameters are fetched from Supabase. This structure links the Spanish vocabulary directly to R3F mesh transformations, Rapier rigid-body parameters, and custom shader uniforms.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | UUID | Unique identifier for the vocabulary modifier | `c4a3b1-9f2d...` |
| `word` | String | The target Spanish adjective | "pesado" |
| `antonym_id` | UUID | Relational link to the opposite word | `d7e8f9-1a2b...` (links to "ligero") |
| `engine_target` | String | The engine component the word affects | `rapier_mass` |
| `value_modifier` | Float | The numerical multiplier applied to the base state | `50.0` |
| `shader_trigger` | String | Visual feedback cue for the UI and mesh material | `mat_heavy_iron` |
| `translation` | String | Native language fallback for UI tooltips | "heavy" |
| `category` | String | The physical domain of the word | "weight" |