/**
 * Claude's review, with the corrected Spanish marked. The model wraps each fix
 * in **double asterisks** and nothing else, so the parsing stays this small —
 * a full markdown renderer would be dead weight for one inline rule.
 */
export default function Feedback({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);

  return (
    <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line">
      {parts.map((part, index) => {
        const bold =
          part.length > 4 && part.startsWith("**") && part.endsWith("**");
        if (!bold) return part;

        return (
          <strong
            key={index}
            // Highlighted, not just coloured: the corrected words are what the
            // eye should land on when re-reading the sentence.
            className="rounded bg-ai px-1 py-0.5 font-bold text-ink"
          >
            {part.slice(2, -2)}
          </strong>
        );
      })}
    </p>
  );
}
