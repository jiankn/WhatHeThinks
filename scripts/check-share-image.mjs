import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";

const baseUrl = process.argv[2] || "http://localhost:3002";
const output = await mkdtemp(join(tmpdir(), "wht-share-check-"));
const port = 9234;
const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(output, "chrome-profile")}`, "about:blank",
], { stdio: "ignore", windowsHide: true });
let socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, message) {
  for (let i = 0; i < 100; i++) {
    try { const result = await fn(); if (result) return result; } catch {}
    await sleep(200);
  }
  throw new Error(message);
}
try {
  const targets = await until(() => fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()), "Chrome not ready");
  socket = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, m => m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result));
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  // Use the actual report page with a fictional API fixture; never publish real data.
  const fixtureBundle = await build({ entryPoints: [resolve("src/lib/report/sample.ts")], bundle: true, write: false, format: "esm" });
  const { sampleReport } = await import("data:text/javascript;base64," + Buffer.from(fixtureBundle.outputFiles[0].text).toString("base64"));
  const fixture = { ...sampleReport, id: "sharetest123" };
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    Object.defineProperty(navigator, 'canShare', {configurable:true,value:()=>false});
    Object.defineProperty(navigator, 'sendBeacon', {configurable:true,value:()=>true});
    window.previewBlobs = new Map();
    const realObjectUrl = URL.createObjectURL;
    URL.createObjectURL = blob => { const url = realObjectUrl(blob); window.previewBlobs.set(url, blob); return url; };
    const realFetch = window.fetch;
    window.shareRequests = [];
    let fixtureShareId = null;
    window.fetch = (url, options) => {
      const path = new URL(String(url), location.origin).pathname;
      if (path === '/api/reports/sharetest123') return Promise.resolve(Response.json(${JSON.stringify(fixture)}));
      if (path === '/api/reports/sharetest123/share') {
        window.shareRequests.push(options?.method || 'GET');
        if (options?.method === 'POST') { fixtureShareId = 'fictional-share'; window.publishedSelection = JSON.parse(options.body); }
        if (options?.method === 'DELETE') fixtureShareId = null;
        return Promise.resolve(Response.json({shareId:fixtureShareId}));
      }
      if (path === '/api/events') return Promise.resolve(new Response(null,{status:202}));
      return realFetch(url, options);
    };
  ` });
  await send("Page.navigate", { url: baseUrl + "/r/sharetest123" });
  await until(() => evaluate("!!document.querySelector('.v3-share-heading button')"), "Sample report did not load");
  await sleep(600);
  await evaluate("document.querySelector('.v3-share-heading button').click()");
  await until(() => evaluate("!!document.querySelector('.v3-card-preview img')?.complete"), "Preview did not render");
  assert.equal(await evaluate("document.querySelector('.v3-share-formats input').checked"), true, "Square must be the default");
  assert.equal(await evaluate("document.querySelector('.v3-share-link').open"), false, "Public link should start collapsed");
  assert.deepEqual(await evaluate("window.shareRequests"), [], "Image preview must not load or publish public links");

  const results = [];
  for (const width of [1280, 390, 320]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 600 });
    for (const portrait of [false, true]) {
      for (const metrics of [true, false]) {
        const name = `${width}-${portrait ? "story" : "square"}-${metrics ? "stats" : "private"}`;
        await evaluate(`(() => {
          const radios = document.querySelectorAll('.v3-share-formats input');
          if (!radios[${portrait ? 1 : 0}].checked) radios[${portrait ? 1 : 0}].click();
          const checkbox = document.querySelector('.v3-share-metrics input');
          if (checkbox.checked !== ${metrics}) checkbox.click();
        })()`);
        await until(() => evaluate(`(() => {
          const img = document.querySelector('.v3-card-preview img');
          return img?.complete && img.naturalHeight === ${portrait ? 1920 : 1080}
            && ${metrics ? "img.alt.includes('before:')" : "!img.alt.includes('before:')"};
        })()`), "Updated image not ready");
        const info = await evaluate(`(async () => {
          const img = document.querySelector('.v3-card-preview img');
          const bytes = new Uint8Array(await window.previewBlobs.get(img.src).arrayBuffer());
          return {
            width: img.naturalWidth, height: img.naturalHeight, alt: img.alt,
            png: btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')),
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            shareButton: [...document.querySelectorAll('.v3-share-controls button')].some(b => b.textContent === 'Share image')
          };
        })()`);
        assert.equal(info.width, 1080); assert.equal(info.height, portrait ? 1920 : 1080);
        assert.equal(info.overflow, false, name + " horizontal overflow");
        assert.equal(info.shareButton, false, "Unsupported file sharing must not show Share image");
        const downloadDir = join(output, name);
        await mkdir(downloadDir);
        await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });
        await evaluate("[...document.querySelectorAll('.v3-share-controls button')].find(b => b.textContent === 'Download PNG').click()");
        const downloaded = await until(() => readFile(join(downloadDir, "whathethinks-result.png")), "Download did not complete");
        assert.deepEqual(downloaded, Buffer.from(info.png, "base64"), "Preview and downloaded PNG differ");
        await evaluate("document.querySelector('.v3-share-editor').scrollIntoView({block:'start',behavior:'instant'})");
        await sleep(100);
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(output, name + ".png"), Buffer.from(shot.data, "base64"));
        results.push({ name, width: info.width, height: info.height, identical: true });
      }
    }
  }

  // Validate actual drawing operations in Chromium, including long values and limited samples.
  const bundle = await build({
    entryPoints: [resolve("src/lib/report/share-image.ts")], bundle: true,
    write: false, format: "iife", globalName: "ShareImage",
  });
  await evaluate(bundle.outputFiles[0].text);
  const drawing = await evaluate(`(async () => {
    const cases = [
      {headline:'He started a smaller share of our conversations.',metrics:[{label:'Chats he started · before',value:'54%'},{label:'Chats he started · after',value:'22%'}],note:'Texting patterns don’t tell the whole story.'},
      {headline:'A small sample of our conversation.',metrics:[{label:'My share of messages',value:'100%'},{label:'His messages with questions',value:'100%'}],note:'A limited sample. Texting patterns don’t tell the whole story.'},
      {headline:'We start conversations about equally.',metrics:[{label:'Chats I started',value:'50%'},{label:'His median reply time',value:'999d 23h'}],note:'Texting patterns don’t tell the whole story.'},
      {headline:'A fresh look at our conversation.',metrics:[],note:'Texting patterns don’t tell the whole story.'}
    ];
    const original = CanvasRenderingContext2D.prototype.fillText;
    const checks = [];
    for (const portrait of [false,true]) for (const sample of [false,true]) for (const snapshot of cases) {
      const draws = [];
      CanvasRenderingContext2D.prototype.fillText = function(text,x,y) {
        const m = this.measureText(text);
        draws.push({text,font:this.font,left:x,right:x+m.width,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});
        return original.call(this,text,x,y);
      };
      try { await ShareImage.renderShareImage({...snapshot,version:1},portrait,sample); }
      finally { CanvasRenderingContext2D.prototype.fillText = original; }
      checks.push({portrait,sample,draws});
    }
    return checks;
  })()`);
  for (const check of drawing) {
    for (const item of check.draws) {
      assert.ok(parseFloat(item.font.match(/([\d.]+)px/)?.[1] || "0") >= 36, "Invalid or tiny Canvas font: " + item.font);
      assert.ok(item.left >= 75 && item.right <= 1005 && item.top >= 0 && item.bottom <= (check.portrait ? 1920 : 1080), "Text outside image: " + JSON.stringify(item));
    }
    for (let i = 0; i < check.draws.length; i++) for (let j = i + 1; j < check.draws.length; j++) {
      const a = check.draws[i], b = check.draws[j];
      assert.ok(!(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom), "Overlapping text: " + a.text + " / " + b.text);
    }
  }

  // Simulate an available native share target; inspect the file passed to it.
  await evaluate(`Object.defineProperty(navigator, 'canShare', {configurable:true,value:()=>true});
    Object.defineProperty(navigator, 'share', {configurable:true,value:async ({files}) => {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      window.sharedPng = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
    }});
    document.querySelector('.v3-share-metrics input').click();`);
  await until(() => evaluate("[...document.querySelectorAll('.v3-share-controls button')].some(b => b.textContent === 'Share image')"), "Native share button missing");
  await evaluate("[...document.querySelectorAll('.v3-share-controls button')].find(b => b.textContent === 'Share image').click()");
  await until(() => evaluate("!!window.sharedPng"), "Native share not called");
  assert.equal(await evaluate(`(async () => {
    const bytes = new Uint8Array(await window.previewBlobs.get(document.querySelector('.v3-card-preview img').src).arrayBuffer());
    return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')) === window.sharedPng;
  })()`), true, "Native share must use the exact preview file");
  // Generation failure must disable sending and offer an explicit retry.
  await evaluate(`window.realToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); };
    document.querySelector('.v3-share-metrics input').click();`);
  await until(() => evaluate("!![...document.querySelectorAll('.v3-share-controls button')].find(b => b.textContent === 'Retry image')"), "Retry action missing");
  assert.equal(await evaluate("[...document.querySelectorAll('.v3-share-controls button')].find(b => b.textContent === 'Download PNG').disabled"), true);
  await evaluate(`HTMLCanvasElement.prototype.toBlob = window.realToBlob;
    [...document.querySelectorAll('.v3-share-controls button')].find(b => b.textContent === 'Retry image').click();`);
  await until(() => evaluate("!!document.querySelector('.v3-card-preview img')?.complete"), "Retry did not recover");

  // All link requests below are handled by the fictional browser fixture.
  await evaluate("document.querySelector('.v3-share-link summary').click()");
  await until(() => evaluate("!document.querySelector('.v3-share-link-content button').disabled"), "Link controls did not load");
  assert.deepEqual(await evaluate("window.shareRequests"), ["GET"]);
  await evaluate("document.querySelector('.v3-share-link-content button').click()");
  await until(() => evaluate("!!document.querySelector('.v3-share-link input[readonly]')"), "Created link missing");
  assert.deepEqual(await evaluate("window.publishedSelection"), { showMetrics: false });
  await evaluate("document.querySelector('.v3-share-link .v3-danger-link').click()");
  await until(() => evaluate("!document.querySelector('.v3-share-link input[readonly]')"), "Revoke did not remove link");
  assert.deepEqual(await evaluate("window.shareRequests"), ["GET", "POST", "DELETE"]);
  console.log(JSON.stringify({ output, results, drawingCases: drawing.length, nativeShareIdentical: true, retryRecovered: true, publicLinkLifecycle: true }, null, 2));
} finally {
  socket?.close();
  chrome.kill();
}
