/** 长文排版外壳（隐私政策、条款等）。 */
export function Prose({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 pb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Last updated{" "}
        <time dateTime={updated}>
          {new Date(updated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
        </time>
      </p>
      <div className="mt-8 space-y-4 leading-relaxed [&_a]:text-rose [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </main>
  );
}
