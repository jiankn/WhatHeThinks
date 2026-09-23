import { QUOTE_LABEL, SHARE_CTA, type ShareSnapshot } from "./share";

export async function renderShareImage(snapshot: ShareSnapshot, portrait: boolean, sample: boolean): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = portrait ? 1920 : 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export unavailable");
  const family = getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
  const padding = 80;
  const width = canvas.width - padding * 2;
  ctx.fillStyle = "#f5f5f3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "top";

  function font(size: number, weight = 400) {
    ctx!.font = `${weight} ${size}px ${family}`;
  }
  function lines(text: string, maxWidth: number): string[] {
    const result: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx!.measureText(next).width > maxWidth) {
        result.push(line);
        line = word;
      } else line = next;
    }
    if (line) result.push(line);
    return result;
  }
  function draw(textLines: string[], x: number, y: number, lineHeight: number) {
    for (const line of textLines) {
      ctx!.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  font(36, 600);
  ctx.fillStyle = "#171717";
  ctx.fillText(sample ? "WhatHeThinks · Sample" : "WhatHeThinks", padding, portrait ? 220 : 70);

  // Measure the content before centering it: hiding statistics must not leave holes.
  // A report headline (opt-in) replaces the measured headline and is shown as a quote.
  const title = snapshot.quote ? `“${snapshot.quote}”` : snapshot.headline;
  const [maxTitleLines, minTitleSize] = snapshot.quote ? [portrait ? 7 : 5, 42] : [3, 52];
  let titleSize = snapshot.quote ? 64 : 76;
  font(titleSize, 600);
  let titleLines = lines(title, width);
  while (titleLines.length > maxTitleLines && titleSize > minTitleSize) {
    titleSize -= 2;
    font(titleSize, 600);
    titleLines = lines(title, width);
  }
  const kickerHeight = snapshot.quote ? 64 : 0;
  const titleHeight = kickerHeight + titleLines.length * titleSize * 1.16;
  font(40);
  const noteLines = lines(snapshot.note, width);
  const metricsHeight = snapshot.metrics.length ? 48 + snapshot.metrics.length * 120 : 0;
  const contentHeight = titleHeight + metricsHeight + 52 + noteLines.length * 48;
  const contentTop = portrait ? 440 : 190;
  const contentBottom = portrait ? 1450 : 900;
  let y = contentTop + Math.max(0, (contentBottom - contentTop - contentHeight) / 2);
  if (snapshot.quote) {
    ctx.fillStyle = "#6b6b6b";
    font(32, 600);
    ctx.fillText(QUOTE_LABEL, padding, y);
    ctx.fillStyle = "#171717";
    y += kickerHeight;
  }
  font(titleSize, 600);
  y = draw(titleLines, padding, y, titleSize * 1.16);

  if (snapshot.metrics.length) y += 48;
  for (const metric of snapshot.metrics) {
    ctx.strokeStyle = "#d6d6d2";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(canvas.width - padding, y); ctx.stroke();
    ctx.fillStyle = "#4d4d4d";
    font(40);
    draw(lines(metric.label, 570), padding, y + 26, 43);
    ctx.fillStyle = "#171717";
    let valueSize = 56;
    font(valueSize, 600);
    while (ctx.measureText(metric.value).width > 300 && valueSize > 36) font(--valueSize, 600);
    ctx.fillText(metric.value, canvas.width - padding - ctx.measureText(metric.value).width, y + 24);
    y += 120;
  }
  ctx.fillStyle = "#4d4d4d";
  font(40);
  draw(noteLines, padding, y + 52, 48);
  // Tell the person who sees the image what they can do next.
  // Story: keep clear of the bottom ~250px that Instagram covers with its reply bar.
  const footer = portrait ? 1560 : 930;
  ctx.fillStyle = "#4d4d4d";
  font(32);
  ctx.fillText(SHARE_CTA, padding, footer);
  ctx.fillStyle = "#171717";
  font(36, 600);
  ctx.fillText("Free preview at WhatHeThinks.com", padding, footer + 44);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image export failed")), "image/png"));
}
