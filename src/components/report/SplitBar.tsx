import { fmtPct } from "@/lib/format";

/** You vs Him 占比条。 */
export function SplitBar({ you, him, label }: { you: number; him: number; label: string }) {
  const total = you + him || 1;
  const y = you / total;
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-line" role="img" aria-label={`You ${fmtPct(y)}, him ${fmtPct(1 - y)}`}>
        <div className="bg-you" style={{ width: `${y * 100}%` }} />
        <div className="bg-him" style={{ width: `${(1 - y) * 100}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-sm">
        <span className="text-you">
          You <span className="num font-semibold">{fmtPct(y)}</span>
        </span>
        <span className="text-him">
          Him <span className="num font-semibold">{fmtPct(1 - y)}</span>
        </span>
      </div>
    </div>
  );
}
