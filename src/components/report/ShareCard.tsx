import { QUOTE_LABEL, type ShareSnapshot } from "@/lib/report/share";
export function ShareCard({ snapshot, sample = false }: { snapshot: ShareSnapshot; sample?: boolean }) {
  return <div className="v3-share-card"><span>WhatHeThinks {sample && "· Sample"}</span>{snapshot.quote ? <><small className="v3-share-kicker">{QUOTE_LABEL}</small><h3 className="is-quote">“{snapshot.quote}”</h3></> : <h3>{snapshot.headline}</h3>}<dl>{snapshot.metrics.map(m => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>)}</dl><p>{snapshot.note}</p><strong>WhatHeThinks.com</strong></div>;
}
