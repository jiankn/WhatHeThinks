import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.argv[2] ?? "http://localhost:3002";
const port = 9223;
const profile = await mkdtemp(join(tmpdir(), "wht-layout-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });

async function waitForTargets() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Chrome DevTools did not start");
}

try {
  const targets = await waitForTargets();
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("No Chrome page target found");

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
      handler(message);
    }
  });

  function send(method, params = {}) {
    const messageId = ++id;
    socket.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve) => pending.set(messageId, resolve));
  }

  await send("Page.enable");
  await send("Runtime.enable");
  const results = [];
  for (const { width, height } of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
    for (const path of ["/", "/analyze", "/login", "/signup", "/forgot-password", "/reset-password?token=preview", "/account", "/sample-report?preview=1", "/sample-report"]) {
      await send("Page.navigate", { url: `${baseUrl}${path}` });
      await new Promise((resolve) => setTimeout(resolve, 850));
      const result = await send("Runtime.evaluate", {
        expression: `JSON.stringify({
          url: location.pathname + location.search,
          viewport: document.documentElement.clientWidth,
          viewportHeight: document.documentElement.clientHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          scrollY: window.scrollY,
          authRects: ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname) ? Object.fromEntries(
            ['.auth-page', '.auth-page-brand', '.auth-card', '.auth-card-heading', '.auth-form', '.auth-switch']
              .map((selector) => {
                const element = document.querySelector(selector);
                if (!element) return [selector, null];
                const rect = element.getBoundingClientRect();
                return [selector, { top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height) }];
              })
          ) : undefined,
          offenders: [...document.querySelectorAll('body *')]
            .filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.position !== 'fixed' && (rect.right > document.documentElement.clientWidth + 1 || rect.left < -1);
            })
            .slice(0, 20)
            .map((element) => ({
              tag: element.tagName,
              className: typeof element.className === 'string' ? element.className : '',
              left: Math.round(element.getBoundingClientRect().left),
              right: Math.round(element.getBoundingClientRect().right),
              width: Math.round(element.getBoundingClientRect().width),
              text: element.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 70),
            })),
        })`,
        returnByValue: true,
      });
      results.push(JSON.parse(result.result.result.value));
    }
  }

  console.log(JSON.stringify(results, null, 2));
  socket.close();
} finally {
  chrome.kill();
  if (chrome.exitCode === null) await new Promise((resolve) => chrome.once("exit", resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
