import Link from "next/link";
import { Fragment } from "react";
import { INLINE_LINK } from "@/lib/inline-link";

/**
 * 把正文里的 [锚文字](/页面) 渲染成站内链接：谷歌看重正文里带描述性锚文字的链接，
 * 导航和页脚那种全站统一的链接权重很低。
 */
export function LinkedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_LINK)) {
    parts.push(text.slice(last, m.index));
    parts.push(<Link key={m.index} href={m[2]}>{m[1]}</Link>);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}
