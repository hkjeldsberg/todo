import Link from "next/link";
import PageHeader from "@/design/PageHeader";
import { notFound } from "next/navigation";
import DoneToggle from "@/features/grammar/DoneToggle";
import { practiceFor } from "@/features/grammar/practice";
import {
  LEVELS,
  TAG_LABEL,
  TOPICS,
  topicBySlug,
  type Section,
} from "@/features/grammar/grammar";

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: topic.slug }));
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  if (!topic) notFound();

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      {/* The aside says where this card sits in the grid, for anyone arriving by link. */}
      <PageHeader
        back={{ href: "/gramatica", label: "Gramática" }}
        aside={`${LEVELS.find((band) => band.level === topic.level)?.title} · ${TAG_LABEL[topic.tag]}`}
      />

      <main className="flex-1 px-[18px] pt-4 pb-7">
        <h1 className="text-[22px] leading-tight font-bold">{topic.title}</h1>
        <p className="mt-1 text-[15px] text-muted">{topic.blurb}</p>

        <div className="mt-5 flex flex-col gap-4">
          {topic.sections.map((section, index) => (
            <SectionCard key={index} section={section} />
          ))}
        </div>

        <DoneToggle slug={topic.slug} />

        {practiceFor(topic.slug).length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-[12px] font-bold text-faint">Practise it</h2>
            <div className="flex flex-wrap gap-2">
              {practiceFor(topic.slug).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="press flex min-h-11 items-center rounded-full bg-pill px-4 text-[14px] font-bold shadow-[0_3px_0_var(--card-shadow)]"
                  style={{ ["--press" as string]: "3px" }}
                >
                  {item.label} →
                </Link>
              ))}
            </div>
          </section>
        )}

        <Link
          href="/frases"
          className="press mt-3 block rounded-full bg-ink py-3.5 text-center text-[16px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
        >
          Write a phrase with this
        </Link>
      </main>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  if (section.kind === "note") {
    return (
      <section className="rounded-[20px] bg-pill p-4">
        {section.title && (
          <h2 className="mb-1 text-[12px] font-bold text-faint">
            {section.title}
          </h2>
        )}
        <p className="text-[15px] leading-snug">{section.body}</p>
      </section>
    );
  }

  if (section.kind === "table") {
    return (
      <section className="rounded-[20px] bg-card p-4 shadow-[0_4px_0_var(--card-shadow)]">
        {section.title && (
          <h2 className="mb-2 text-[12px] font-bold text-faint">
            {section.title}
          </h2>
        )}
        {/* Conjugation tables outgrow a phone; let this one scroll on its own. */}
        <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr>
                {section.columns.map((column) => (
                  <th
                    key={column}
                    className="pr-3 pb-1 text-[12px] font-bold whitespace-nowrap text-faint"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Keyed by position: a first cell can repeat (the reactions
                  table lists sí twice), and the rows never reorder. */}
              {section.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-dash-card">
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={
                        index === 0
                          ? "py-1.5 pr-3 whitespace-nowrap text-muted"
                          : "py-1.5 pr-3 font-bold whitespace-nowrap"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      {section.title && (
        <h2 className="text-[12px] font-bold text-faint">{section.title}</h2>
      )}
      {section.items.map((item, itemIndex) => (
        <div
          key={itemIndex}
          className="rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]"
        >
          <div className="text-[16px] font-bold">{item.es}</div>
          <div className="text-[14px] text-muted">{item.en}</div>
          {item.note && (
            <div className="mt-1 text-[13px] text-accent">{item.note}</div>
          )}
        </div>
      ))}
    </section>
  );
}
