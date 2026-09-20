import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, output, widthArg = "1280", heightArg = "900"] = process.argv.slice(2);
if (!url || !output) throw new Error("Usage: node scripts/capture-page.mjs <url> <output> [width] [height]");

const width = Number(widthArg);
const height = Number(heightArg);
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9224;
const profile = await mkdtemp(join(tmpdir(), "wht-capture-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });

async function waitForTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Chrome DevTools did not start");
}

try {
  const page = await waitForTarget();
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const handler = pending.get(message.id);
    if (handler) {
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
    }
  });
  const send = (method, params = {}) => {
    const messageId = ++id;
    socket.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  await writeFile(output, Buffer.from(result.data, "base64"));
  socket.close();
} finally {
  chrome.kill();
  if (chrome.exitCode === null) await new Promise((resolve) => chrome.once("exit", resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
