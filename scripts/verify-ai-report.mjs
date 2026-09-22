// UI contract check with fictional API fixtures. No payment, database write or model request.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const base = process.argv[2] ?? "http://localhost:3004";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = resolve("design/ai-report-review");
await mkdir(output, { recursive: true });
const fixtureFile = join(output, "fixture.mjs");
await build({ stdin: { resolveDir: process.cwd(), contents: `
import { analyzeRoleMsgs } from './src/lib/analysis/index';
import { buildUpload } from './src/lib/report/payload';
import { MockReportWriter } from './src/lib/report/mock-writer';
import { measuredFacts } from './src/lib/report/narrative';
import { genChat } from './tests/synth';
import { narrativeFixture } from './tests/narrative-fixture';
const up = buildUpload(analyzeRoleMsgs(genChat({weeks:12,coolAtWeek:7})), {question:'losing_interest',youName:'Emma',himName:'Jake'});
const {report} = await new MockReportWriter().write({reportId:'fictional123',question:'losing_interest',customQuestion:null,analysis:up.analysis,evidence:up.evidence});
const narrative = narrativeFixture(measuredFacts(report)[0]);
report.narrative = narrative; report.summary.headline = narrative.headline; report.nextStep = narrative.nextStep; report.meta = {writer:'llm',model:'fixture-only',version:'ui-test',generatedAt:Date.now()};
export default {id:'fictional123',status:'ready',paid:true,question:'losing_interest',customQuestion:null,createdAt:Date.now(),preview:up.analysis.preview,evidence:up.evidence,report};
` }, bundle: true, platform: "node", format: "esm", outfile: fixtureFile });
const fixture = (await import(pathToFileURL(fixtureFile).href)).default;
const profile = await mkdtemp(join(tmpdir(), "wht-ai-review-"));
const chrome = spawn(process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--disable-gpu", "--remote-debugging-port=9227", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket;
const results = [];
let mode = "ready";
try {
  let target;
  for (let i = 0; i < 50; i++) { try { target = (await (await fetch("http://127.0.0.1:9227/json/list")).json()).find(t => t.type === "page"); if (target) break; } catch {} await pause(100); }
  assert(target);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, reject) => { socket.addEventListener("open", r, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let serial = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => { pending.delete(id); reject(Error(method)); }, 20000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener("message", async ({ data }) => {
    const r = JSON.parse(data);
    if (r.id) { const p = pending.get(r.id); if (p) { clearTimeout(p.timer); pending.delete(r.id); r.error ? p.reject(Error(r.error.message)) : p.resolve(r.result); } }
    if (r.method === "Fetch.requestPaused") {
      const { request, requestId } = r.params;
      let body = {};
      if (request.url.endsWith(`/api/reports/${fixture.id}`)) {
        if (request.method === "PATCH") { const focus = JSON.parse(request.postData); fixture.question = focus.question; fixture.customQuestion = focus.customQuestion ?? null; body = focus; }
        else body = mode === "ready" ? fixture : { ...fixture, paid: mode !== "preview", status: mode, report: undefined, evidence: undefined };
      }
      await send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
    }
  });
  const evaluate = async expression => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; };
  const wait = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); } throw Error(`Not found: ${expression}`); };
  const click = async (selector, text) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.includes(${JSON.stringify(text)})); if (!el) throw Error('Missing control'); el.click(); })()`);
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: `${base}/api/*` }] });
  for (const width of [390, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    for (const state of ["ready", "preview", "failed"]) {
      mode = state;
      await send("Page.navigate", { url: `${base}/r/${fixture.id}` });
      await wait(state === "ready" ? "!!document.querySelector('#the-evidence')" : state === "preview" ? "!!document.querySelector('#paywall-title')" : "document.body.innerText.includes(\"We couldn't finish your report.\")");
      await evaluate("document.fonts.ready.then(() => true)");
      const layout = await evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,headings:document.querySelectorAll('h1').length})");
      assert(layout.scroll <= width); assert.equal(layout.headings, 1);
      if (state === "ready") {
        assert.equal(await evaluate("document.querySelector('main').lang"), "en");
        await click("button", "See supporting messages"); await wait("!!document.querySelector('[role=dialog]')");
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await wait("!document.querySelector('[role=dialog]')");
        await click("summary", "How you each contribute");
        assert(await evaluate("document.documentElement.scrollWidth <= innerWidth"));
      }
      if (state === "preview") {
        await click("summary", "Change what");
        await click("button", "Am I doing all the work?").catch(() => click("button", "Just show me everything"));
        await wait("document.body.innerText.includes('Saved. Your full report')");
        assert(await evaluate("document.querySelector('.reader-paywall').innerText.includes('Your report is written in English')"));
        assert(await evaluate("document.querySelector('.reader-paywall button').disabled"));
      }
      await evaluate("window.scrollTo(0,0)");
      const png = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      await writeFile(join(output, `${state}-${width}.png`), Buffer.from(png.data, "base64"));
      results.push({ state, ...layout });
    }
  }
  await writeFile(join(output, "verification.json"), JSON.stringify({ provider: "fictional fixture, no live model call", results }, null, 2));
  console.log(`PASS: ${results.length} responsive layouts, English report, evidence drawer, saved focus and checkout consent.`);
} finally {
  socket?.close(); chrome.kill();
  // Keep the isolated profile for inspection; do not recursively delete computed paths here.
}
