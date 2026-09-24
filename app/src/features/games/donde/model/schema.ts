import { z } from "zod";

export const visualLayers = ["pop_up_apartment", "polaroid_plaza", "botanico_map"] as const;
export const visualLayerSchema = z.enum(visualLayers);
export type VisualLayer = z.infer<typeof visualLayerSchema>;

/**
 * Stored values match the `todo.donde_tasks.mechanic` check constraint. In the 3D diorama:
 * drag  – "place": drag the paper piece(s) of `draggable_id` onto the surface `target_zone`
 * flap  – "find": lift a cover (cushion, sofa skirt, curtain) to reveal what's under it
 * pick  – "find": rotate/zoom to locate the object `target_zone` and tap it
 * pin   – push a pin into the building/block `target_zone` on the street diorama
 * build – drop Dymo word labels into the sentence slots (hay/está, contractions)
 */
export const mechanicSchema = z.enum(["drag", "flap", "pick", "pin", "build"]);
export type Mechanic = z.infer<typeof mechanicSchema>;

export const buildSpecSchema = z.object({
  /** Sentence with numbered slots, e.g. "{0} {1} debajo del sofá." */
  template: z.string().regex(/\{0\}/, "template needs at least slot {0}"),
  /** Lower-case word labels; the first slot of a sentence is capitalised on display. */
  tokens: z.array(z.string().min(1)).min(2),
  /** Every accepted combination, one token per slot. */
  answers: z.array(z.array(z.string().min(1)).min(1)).min(1),
});
export type BuildSpec = z.infer<typeof buildSpecSchema>;

export const taskSchema = z
  .object({
    id: z.string().min(1),
    mechanic: mechanicSchema,
    prompt_text: z.string().min(1),
    prompt_en: z.string().min(1),
    draggable_id: z.string().min(1).nullable(),
    target_zone: z.string().min(1),
    error_note: z.string().min(1),
    success_note: z.string().min(1),
    /** Wrong-but-plausible zones → specific feedback. Keys are also the visible candidates. */
    zone_notes: z.record(z.string(), z.string()).default({}),
    build: buildSpecSchema.nullable().default(null),
    tags: z.array(z.string()).default([]),
    level: z.enum(["A1", "A2", "B1"]),
  })
  .superRefine((task, ctx) => {
    if (task.mechanic === "drag" && !task.draggable_id) {
      ctx.addIssue({ code: "custom", message: `${task.id}: drag task needs draggable_id` });
    }
    if (task.mechanic === "build") {
      if (!task.build) {
        ctx.addIssue({ code: "custom", message: `${task.id}: build task needs build spec` });
        return;
      }
      const slots = new Set(task.build.template.match(/\{\d+\}/g) ?? []).size;
      for (const answer of task.build.answers) {
        if (answer.length !== slots) {
          ctx.addIssue({ code: "custom", message: `${task.id}: answer ${answer.join("|")} must fill ${slots} slots` });
        }
        for (const token of answer) {
          if (!task.build.tokens.includes(token)) {
            ctx.addIssue({ code: "custom", message: `${task.id}: answer token "${token}" is not in tokens` });
          }
        }
      }
    }
    if (task.target_zone in task.zone_notes) {
      ctx.addIssue({ code: "custom", message: `${task.id}: target_zone must not also be a wrong zone` });
    }
  });
export type Task = z.infer<typeof taskSchema>;

export const pageSchema = z.object({
  page_id: z.string().min(1),
  title_es: z.string().min(1),
  title_en: z.string().min(1),
  visual_layer: visualLayerSchema,
  tasks: z.array(taskSchema).min(1),
});
export type Page = z.infer<typeof pageSchema>;

export const scrapbookSchema = z
  .object({ pages: z.array(pageSchema).min(1) })
  .superRefine((book, ctx) => {
    const ids = new Set<string>();
    for (const page of book.pages) {
      for (const task of page.tasks) {
        if (ids.has(task.id)) ctx.addIssue({ code: "custom", message: `duplicate task id ${task.id}` });
        ids.add(task.id);
      }
    }
  });
export type Scrapbook = z.infer<typeof scrapbookSchema>;
