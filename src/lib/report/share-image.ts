import type { ShareSnapshot } from "./share";
export async function renderShareImage(snapshot: ShareSnapshot, portrait: boolean, sample: boolean): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = portrait ? 1920 : 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export unavailable");
  await document.fonts.ready;
  ctx.fillStyle = "#f5f5f3"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#171717";
  const text = (s: string, x: number, y: number, size: number, max = 880) => {
    ctx.font = `${size >= 50 ? 600 : 400} ${getComputedStyle(document.body).fontFamily}`;
    let line = "";
    for (const word of s.split(" ")) {
      if (ctx.measureText(`${line} ${word}`).width > max && line) { ctx.fillText(line, x, y); y += size * 1.3; line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    ctx.fillText(line, x, y);
    return y + size * 1.3;
  };
  text(`WhatHeThinks${sample ? " · Sample finding" : " · My chat, in perspective"}`, 90, 110, 28);
  let y = text(snapshot.headline, 90, portrait ? 470 : 290, 66) + 80;
  for (const m of snapshot.metrics) { text(m.label, 90, y, 26); text(m.value, 640, y + 6, 48, 340); y += 105; }
  text(snapshot.note, 90, canvas.height - 200, 25);
  text("WhatHeThinks.com", 90, canvas.height - 90, 32);
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image export failed")), "image/png"));
}
