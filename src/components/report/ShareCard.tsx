import type { ShareSnapshot } from "@/lib/report/share";
export function ShareCard({ snapshot, sample = false }: { snapshot: ShareSnapshot; sample?: boolean }) {
  return <div className="v3-share-card"><span>WhatHeThinks {sample && "· Sample"}</span><h3>{snapshot.headline}</h3><dl>{snapshot.metrics.map(m => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>)}</dl><p>{snapshot.note}</p><strong>WhatHeThinks.com</strong></div>;
}
