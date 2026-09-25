import { LinkedText } from "./LinkedText";

/** FAQ 列表：内容服务端渲染在 HTML 中（折叠但存在，可被索引）。不输出 FAQPage schema。 */
export function Faq({ items, title = "Questions" }: { items: { q: string; a: string }[]; title?: string }) {
  return (
    <section aria-labelledby="faq-title">
      <h2 id="faq-title" className="font-display text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {items.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden">
              {f.q}
              <span className="text-muted transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-2 text-muted [&_a]:underline [&_a]:underline-offset-2"><LinkedText text={f.a} /></p>
          </details>
        ))}
      </div>
    </section>
  );
}
