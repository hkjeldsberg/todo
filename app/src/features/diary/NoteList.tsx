"use client";

import { useState, useTransition } from "react";
import type { DiaryNote, Failure } from "@/features/diary/diary";
import { addNote, editNote, removeNote } from "@/features/diary/actions";

/**
 * Free notes for the day — what the teacher explained, what confused you. Wider
 * than a phrase on purpose: these are paragraphs, not vocabulary.
 */
export default function NoteList({
  day,
  initial,
}: {
  day: string;
  initial: DiaryNote[];
}) {
  const [notes, setNotes] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const body = draft.trim();
      if (!body) return;
      setError(null);

      const result = await addNote(day, body);
      if (!result.ok) {
        // The draft stays in the box: nothing typed is ever thrown away.
        setError(result.error);
        return;
      }
      setNotes((current) => [...current, result.data]);
      setDraft("");
    });

  return (
    <section className="mt-7">
      <h2 className="mb-3 text-[15px] font-bold">Notas</h2>

      <div className="flex flex-col gap-3">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onSaved={(body) =>
              setNotes((current) =>
                current.map((row) =>
                  row.id === note.id ? { ...row, body } : row,
                ),
              )
            }
            onRemoved={() =>
              setNotes((current) => current.filter((row) => row.id !== note.id))
            }
          />
        ))}

        <div className="rounded-[18px] border-2 border-dashed border-dash px-4 py-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="Lo que aprendí hoy…"
            className="w-full resize-none bg-transparent text-[15px] leading-snug outline-none placeholder:text-faint"
          />
          {error && <NoteError error={error} />}

          <button
            type="button"
            onClick={submit}
            disabled={pending || !draft.trim()}
            className="press mt-1 rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-on-ink disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Añadir nota"}
          </button>
        </div>
      </div>
    </section>
  );
}

function NoteCard({
  note,
  onSaved,
  onRemoved,
}: {
  note: DiaryNote;
  onSaved: (body: string) => void;
  onRemoved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]">
        <p className="text-[15px] leading-snug whitespace-pre-line">
          {note.body}
        </p>
        {error && <NoteError error={error} />}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="press rounded-full bg-pill px-3.5 py-1.5 text-[12px] font-bold"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await removeNote(note.id);
                if (result.ok) onRemoved();
                else setError(result.error);
              })
            }
            className="press rounded-full bg-pill px-3.5 py-1.5 text-[12px] font-bold text-muted disabled:opacity-50"
          >
            Borrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        autoFocus
        className="w-full resize-none bg-transparent text-[15px] leading-snug outline-none"
      />
      {error && <NoteError error={error} />}
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          disabled={pending || !body.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await editNote(note.id, body);
              if (!result.ok) {
                // Stay in edit mode so the text is not lost.
                setError(result.error);
                return;
              }
              onSaved(body.trim());
              setEditing(false);
            })
          }
          className="press rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-on-ink disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setBody(note.body);
            setEditing(false);
          }}
          className="press rounded-full bg-pill px-4 py-2 text-[13px] font-bold"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Same shape as the sentence errors: what failed, and what to do about it. */
function NoteError({ error }: { error: Failure }) {
  return (
    <div className="mt-2 rounded-[14px] bg-pill px-3 py-2">
      <p className="text-[13px] leading-snug font-bold text-accent">
        {error.message}
      </p>
      {error.hint && (
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          {error.hint}
        </p>
      )}
    </div>
  );
}
