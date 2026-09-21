import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
const base = process.argv[2] ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = resolve("reports/seo-launch-2026-09-22");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "wht-seo-browser-"));
const chrome = spawn(process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=9226", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let socket; const results = []; const delay = ms => new Promise(r => setTimeout(r, ms));
try {
  let target;
  for (let i = 0; i < 50; i++) { try { target = (await (await fetch("http://127.0.0.1:9226/json/list")).json()).find(t => t.type === "page"); if (target) break; } catch {} await delay(100); }
  assert(target); socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r,j) => { socket.addEventListener("open",r,{once:true});socket.addEventListener("error",j,{once:true}); });
  let serial=0; const pending=new Map(); const errors=[];
  socket.addEventListener("message",({data})=>{const r=JSON.parse(data);if(r.method==="Runtime.exceptionThrown") errors.push(r.params.exceptionDetails.text);const p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(new Error(r.error.message)):p.resolve(r.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(new Error(`Timeout: ${method}`)),20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true,userGesture:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send("Page.enable");await send("Runtime.enable");
  const go=async path=>{await send("Page.navigate",{url:base+path});for(let i=0;i<80;i++){if(await evaluate(`location.pathname === ${JSON.stringify(path.split('?')[0])} && document.readyState === 'complete' && !!document.querySelector('h1')`))break;await delay(100);}await evaluate("document.fonts.ready.then(()=>true)");await delay(250);};
  for(const width of [320,390,1280]) {
    await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<768});
    for(const path of ["/","/guides","/texting-styles","/questions-to-ask-your-boyfriend","/situationship-vs-relationship","/love-bombing","/does-he-like-me-text-analyzer"]) {
      await go(path);
      const r=await evaluate(`({path:location.pathname,width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,navFits:[...document.querySelectorAll('.v3-header a')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().right<=innerWidth)})`);
      assert.equal(r.h1,1);assert(r.scroll<=width,JSON.stringify(r));assert(r.navFits,JSON.stringify(r));results.push(r);
      if((width===390||width===1280)&&["/guides","/texting-styles","/questions-to-ask-your-boyfriend"].includes(path)){const shot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(join(output,`${path.slice(1)}-${width}.png`),Buffer.from(shot.data,"base64"));}
    }
  }
  await go("/questions-to-ask-your-boyfriend");
  await send("Page.bringToFront");
  await send("Browser.grantPermissions",{origin:base,permissions:["clipboardReadWrite","clipboardSanitizedWrite"]});
  await evaluate("document.querySelector('.guide-copy button').scrollIntoView({block:'center'})");await delay(250);
  await evaluate("document.querySelector('.guide-copy button').click()");
  for(let i=0;i<20;i++){if(await evaluate("document.querySelector('.guide-copy [role=status]').textContent.length>0"))break;await delay(100);}
  assert(await evaluate("[...document.querySelectorAll('[role=status]')].some(e=>e.textContent==='Copied')"),JSON.stringify(await evaluate("({status:document.querySelector('.guide-copy [role=status]').textContent,focus:document.hasFocus()})")));
  assert((await evaluate("navigator.clipboard.readText()")).includes("best ten minutes"),"clipboard contains questions");
  await evaluate("document.querySelector('#questions summary').click()");assert(await evaluate("document.querySelector('#questions details').open"));
  assert.equal(await evaluate("document.querySelector('.guide-cta .btn-primary').getAttribute('href')"),"/analyze?q=overview");
  await go("/analyze?q=likes_me");assert(await evaluate("!!document.querySelector('main')"));
  assert.equal(errors.length,0,JSON.stringify(errors));
  await writeFile(join(output,"browser-audit.json"),JSON.stringify({layouts:results,copy:true,faq:true,analyzeEntry:true,uncaughtErrors:errors},null,2));
  console.log(`PASS: ${results.length} layouts; clipboard, FAQ and analysis entry; no uncaught JS exceptions.`);
} finally {
  socket?.close();chrome.kill();if(chrome.exitCode===null)await new Promise(r=>chrome.once("exit",r));
  assert(resolve(profile).startsWith(resolve(tmpdir())+sep));
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
