import type { Preview } from "@/lib/analysis/analysis-types";
import { fmtInt, fmtMinutes, fmtPct, fmtRange } from "@/lib/format";
import { CheckIcon } from "@/components/icons";
import { SplitBar } from "./SplitBar";

/** 免费预览（BP §23）：必须让她觉得"它真的知道我们的聊天发生了什么"。 */
export function PreviewSection({ preview: p, compact = false }: { preview: Preview; compact?: boolean }) {
  const replyRatio = p.medianReply.you > 0 ? p.medianReply.him / p.medianReply.you : 0;

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="border-b border-dashed border-line px-5 py-4">
          <p className="eyebrow">Your chat, by the numbers</p>
        </div>
        <dl className="divide-y divide-dashed divide-line px-5 font-mono text-sm">
          <Row label="Messages" value={fmtInt(p.totalMessages)} />
          {!p.liteMode && <Row label="Active days" value={fmtInt(p.activeDays)} />}
          {!p.liteMode && <Row label="Span" value={fmtRange(p.range)} />}
        </dl>
      </div>

      {!compact && (
        <div className="card space-y-6 px-5 py-5">
          {p.liteMode ? (
            <SplitBar label="Who sends more messages" you={p.messageShare.you} him={p.messageShare.him} />
          ) : (
            <SplitBar label="Who starts conversations" you={p.initiation.you} him={p.initiation.him} />
          )}

          {p.liteMode ? (
            <TwoStat
              label="Messages that ask a question"
              you={fmtPct(p.questionRatio.you)}
              him={fmtPct(p.questionRatio.him)}
            />
          ) : (
            <div>
              <TwoStat
                label="Typical reply time"
                you={fmtMinutes(p.medianReply.you)}
                him={fmtMinutes(p.medianReply.him)}
              />
              {replyRatio >= 1.5 && (
                <p className="mt-2 text-sm text-muted">
                  He typically takes about <span className="num text-ink">{replyRatio.toFixed(1)}×</span> as long as you
                  to reply.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!p.liteMode && <HeadlineCard preview={p} />}

      {!compact && (
        <div className="card px-5 py-5">
          <p className="eyebrow">Your report found</p>
          <ul className="mt-3 space-y-2.5">
            {foundItems(p).map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok/10 text-ok">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.liteMode && (
        <p className="rounded-2xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          This is a lite analysis — your paste had no timestamps, so reply times and turning points aren't available.
          Upload a WhatsApp export to see when things changed.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

function TwoStat({ label, you, him }: { label: string; you: string; him: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-you-soft px-3 py-2.5">
          <p className="text-xs text-you">You</p>
          <p className="num text-lg font-semibold">{you}</p>
        </div>
        <div className="rounded-xl bg-him-soft px-3 py-2.5">
          <p className="text-xs text-him">Him</p>
          <p className="num text-lg font-semibold">{him}</p>
        </div>
      </div>
    </div>
  );
}

function HeadlineCard({ preview: p }: { preview: Preview }) {
  if (p.headline) {
    return (
      <div className="rounded-[var(--radius-card)] bg-plum px-5 py-6 text-paper">
        <p className="font-mono text-[11px] tracking-[0.14em] text-rose-soft/80 uppercase">
          We found a measurable shift in his behavior
        </p>
        <p className="mt-3 font-display text-2xl leading-snug font-medium sm:text-[1.7rem]">{p.headline.sentence}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-card)] bg-plum px-5 py-6 text-paper">
      <p className="font-mono text-[11px] tracking-[0.14em] text-rose-soft/80 uppercase">What the pattern shows</p>
      <p className="mt-3 font-display text-2xl leading-snug font-medium">
        His texting pattern has been fairly steady — no sharp drop we can point to.
      </p>
      <p className="mt-2 text-sm text-paper/75">
        Steady isn't the same as clear. Your full report shows how interested his behavior looks and where the signals
        are mixed.
      </p>
    </div>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function foundItems(p: Preview): string[] {
  const items: string[] = [];
  const c = p.counts;
  if (!p.liteMode) {
    items.push(c.turningPoints ? plural(c.turningPoints, "turning point", "turning points") : "A week-by-week timeline");
  }
  items.push(c.mixedSignals ? plural(c.mixedSignals, "mixed signal", "mixed signals") : "A mixed-signals check");
  if (c.evidence) items.push(plural(c.evidence, "supporting message", "supporting messages"));
  // 只有当"明确变化"数与转折点数不同时才单列，避免重复同一个数字。
  if (c.shifts && c.shifts !== c.turningPoints) {
    items.push(plural(c.shifts, "clear behavior shift", "clear behavior shifts"));
  }
  items.push("An interest read across 5 behaviors");
  return items;
}
