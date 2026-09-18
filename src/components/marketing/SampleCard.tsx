/**
 * 落地页的样例报告卡（服务端渲染的静态示意数据，明确标注为样例）。
 * 每种意图展示与之对应的报告模块，视觉与真实报告一致。
 */

import type { SampleKind } from "@/content/landing";

function Frame({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure>
      <div className="relative">
        <span className="absolute -top-2.5 left-4 z-10 rounded-full bg-ink px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-paper uppercase">
          Sample report · illustrative data
        </span>
        {children}
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

function BeforeAfter({ rows }: { rows: [string, string, string][] }) {
  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="pb-1.5 font-medium" />
          <th className="pb-1.5 text-right font-medium">Before</th>
          <th className="pb-1.5 text-right font-medium">After</th>
        </tr>
      </thead>
      <tbody className="num">
        {rows.map(([l, b, a]) => (
          <tr key={l} className="border-t border-dashed border-line">
            <td className="py-2 pr-2 font-sans text-muted">{l}</td>
            <td className="py-2 text-right">{b}</td>
            <td className="py-2 text-right font-semibold">{a}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShiftCard({ up = false, title, rows, note }: { up?: boolean; title: string; rows: [string, string, string][]; note: string }) {
  return (
    <div className="card overflow-hidden">
      <div className={`px-5 pt-6 pb-4 ${up ? "bg-ok/10" : "bg-rose-soft"}`}>
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{up ? "Shift up" : "The shift started around"}</p>
        <p className="mt-1 font-display text-xl font-semibold">{title}</p>
      </div>
      <div className="px-5 py-4">
        <BeforeAfter rows={rows} />
        <p className="mt-3 text-sm font-medium">{note}</p>
      </div>
    </div>
  );
}

function Bars({ rows }: { rows: [string, number, string][] }) {
  const tone = (l: string) => (l === "High" ? "bg-ok" : l === "Moderate" ? "bg-warn" : "bg-rose");
  return (
    <ul className="mt-4 space-y-3">
      {rows.map(([name, score, level]) => (
        <li key={name}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted">{level}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-line/70">
            <div className={`h-full rounded-full ${tone(level)}`} style={{ width: `${score}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SampleCard({ kind, caption }: { kind: SampleKind; caption: string }) {
  switch (kind) {
    case "shift":
      return (
        <Frame caption={caption}>
          <ShiftCard
            title="May 18"
            rows={[
              ["Conversations he started", "48%", "19%"],
              ["His typical reply time", "24 min", "2h 31m"],
              ["Concrete plans per week", "2.1/week", "0.3/week"],
            ]}
            note="This shift started before your first argument about his texting."
          />
        </Frame>
      );
    case "comeback":
      return (
        <Frame caption={caption}>
          <ShiftCard
            up
            title="His effort picked up around January 9"
            rows={[
              ["Conversations he started", "12%", "54%"],
              ["His messages that are affectionate", "3%", "21%"],
              ["Concrete plans per week", "0.2/week", "0.4/week"],
            ]}
            note="His warm messages rose sharply; his concrete plans barely moved."
          />
        </Frame>
      );
    case "interest":
      return (
        <Frame caption={caption}>
          <div className="card px-5 pt-6 pb-5">
            <p className="eyebrow">Based on his recent behavior</p>
            <p className="mt-1 font-display text-2xl font-semibold">Mixed observable interest</p>
            <Bars
              rows={[
                ["Initiative", 32, "Low"],
                ["Curiosity", 71, "High"],
                ["Engagement", 64, "Moderate"],
                ["Planning", 28, "Low"],
                ["Follow-through", 80, "High"],
              ]}
            />
            <p className="mt-4 text-sm text-muted">He asks about your life and his plans hold — but he rarely starts conversations or suggests the plans himself.</p>
          </div>
        </Frame>
      );
    case "mixed":
      return (
        <Frame caption={caption}>
          <div className="card grid gap-4 px-5 pt-6 pb-5 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ok">
                <span className="h-2 w-2 rounded-full bg-ok" /> Signals of interest
              </p>
              <p className="mt-2 text-sm">He sent 23 affectionate messages in the last 6 active weeks.</p>
              <p className="mt-2 text-sm">He replies in a typical 8 min.</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-rose">
                <span className="h-2 w-2 rounded-full bg-rose" /> Signals of distance
              </p>
              <p className="mt-2 text-sm">He suggested 1 concrete plan in the same period.</p>
              <p className="mt-2 text-sm">He started only 18% of conversations.</p>
            </div>
            <p className="border-t border-line pt-3 text-sm text-muted sm:col-span-2">
              When words and actions disagree, actions tend to be the more reliable signal.
            </p>
          </div>
        </Frame>
      );
    case "investment":
      return (
        <Frame caption={caption}>
          <div className="card px-5 pt-6 pb-5">
            <p className="font-display text-xl font-semibold">Most of the effort in this chat is coming from you.</p>
            <ul className="mt-4 space-y-3">
              {(
                [
                  ["Conversations started", 214, 71],
                  ["Questions asked", 402, 158],
                  ["Concrete plans suggested", 17, 4],
                  ["Checking in & support", 36, 9],
                ] as const
              ).map(([l, y, h]) => (
                <li key={l}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="num font-semibold">{y}</span>
                    <span className="text-muted">{l}</span>
                    <span className="num font-semibold">{h}</span>
                  </div>
                  <div className="mt-1 flex h-2 gap-0.5">
                    <div className="rounded-l-full bg-you" style={{ width: `${(y / (y + h)) * 100}%` }} />
                    <div className="rounded-r-full bg-him" style={{ width: `${(h / (y + h)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-4 text-xs text-muted">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-you" /> You
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-him" /> Him
              </span>
            </p>
          </div>
        </Frame>
      );
    case "breadcrumb":
      return (
        <Frame caption={caption}>
          <div className="card px-5 pt-6 pb-5">
            <p className="font-display text-xl font-semibold">A pattern consistent with breadcrumbing</p>
            <ol className="mt-4 space-y-2.5 text-sm">
              {[
                ["Mar 2", "Silent for 5 days", "then a 46-message conversation he started"],
                ["Mar 19", "Silent for 4 days", "then “thinking about you 😏” at 11:48pm"],
                ["Apr 6", "Silent for 6 days", "then a 38-message conversation he started"],
              ].map(([d, a, b]) => (
                <li key={d} className="flex gap-3">
                  <span className="num w-12 shrink-0 text-muted">{d}</span>
                  <span>
                    <span className="font-medium">{a}</span> <span className="text-muted">— {b}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-line pt-3 text-sm">
              Plus: 4 “we should…” plans and no concrete ones in the last 6 active weeks.
            </p>
          </div>
        </Frame>
      );
    case "stats":
      return (
        <Frame caption={caption}>
          <div className="card overflow-hidden">
            <dl className="divide-y divide-dashed divide-line px-5 pt-5 font-mono text-sm">
              {[
                ["Messages", "18,242"],
                ["Active days", "287"],
                ["You started", "61%"],
                ["He started", "39%"],
                ["Your median reply", "12 min"],
                ["His median reply", "31 min"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="bg-plum px-5 py-4 text-paper">
              <p className="font-display text-lg">His conversation initiation began dropping around May 18.</p>
            </div>
          </div>
        </Frame>
      );
  }
}
