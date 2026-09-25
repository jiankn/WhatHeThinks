/**
 * 正文里的站内链接写成 [锚文字](/页面)。只认站内路径（以 / 开头），目标是否存在由测试检查。
 * 渲染见 components/marketing/LinkedText。
 */
export const INLINE_LINK = /\[([^\]]+)\]\((\/[a-z0-9-]*)\)/g;

/** 去掉链接标记、只留锚文字（用于复制按钮、元数据等纯文本场合）。 */
export function plainText(text: string): string {
  return text.replace(INLINE_LINK, "$1");
}
