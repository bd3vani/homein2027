(function(){
const SCAN=%KEYS%;
let FILTER="all";
const addrText=el=>{for(const n of el.childNodes){if(n.nodeType===3&&n.textContent.trim())return n.textContent.trim();}return el.textContent.trim();};
const DIRS=new Set(["n","s","e","w","north","south","east","west"]);
const SUFFIX=new Set(["st","street","ave","avenue","dr","drive","rd","road","pl","place","blvd","way","ln","lane","ct","court","ter","terr","terrace","cir","circle","pkwy","trl","trail"]);
const ZIPS={"91604":"Studio City","90046":"Fairfax / Melrose","90019":"Mid-City / Country Club Park","90068":"Hollywood Hills","90064":"Cheviot Hills","90041":"Eagle Rock","91106":"Pasadena","90232":"Culver City","90034":"Palms","90066":"Mar Vista","90039":"Silver Lake / Atwater Village","91501":"Burbank","91504":"Burbank","91505":"Burbank","91506":"Burbank","91201":"Glendale","91202":"Glendale","91203":"Glendale","91204":"Glendale","91205":"Glendale","91206":"Glendale","91207":"Glendale","91208":"Glendale","91403":"Sherman Oaks","91423":"Sherman Oaks","91401":"Van Nuys","91607":"Valley Village","91601":"North Hollywood / Toluca Lake","91602":"North Hollywood / Toluca Lake","91436":"Encino","91214":"La Crescenta","91011":"La Cañada Flintridge","90027":"Los Feliz","90026":"Echo Park","90065":"Glassell Park / Mt Washington","90029":"East Hollywood","90031":"Cypress Park","90004":"Larchmont / Hancock Park"};
const CITIES=[["la canada flintridge","La Cañada Flintridge"],["la cañada flintridge","La Cañada Flintridge"],["north hollywood","North Hollywood / Toluca Lake"],["toluca lake","North Hollywood / Toluca Lake"],["valley village","Valley Village"],["sherman oaks","Sherman Oaks"],["studio city","Studio City"],["la crescenta","La Crescenta"],["atwater village","Silver Lake / Atwater Village"],["silver lake","Silver Lake"],["los feliz","Los Feliz"],["eagle rock","Eagle Rock"],["cheviot hills","Cheviot Hills"],["mar vista","Mar Vista"],["culver city","Culver City"],["hancock park","Larchmont / Hancock Park"],["larchmont","Larchmont / Hancock Park"],["echo park","Echo Park"],["glassell park","Glassell Park / Mt Washington"],["mount washington","Glassell Park / Mt Washington"],["elysian valley","Glassell Park / Mt Washington"],["cypress park","Cypress Park"],["east hollywood","East Hollywood"],["valley glen","Valley Glen"],["van nuys","Van Nuys"],["encino","Encino"],["burbank","Burbank"],["glendale","Glendale"],["pasadena","Pasadena"],["palms","Palms"]];
const $=s=>document.querySelector(s), status=$("#status");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const title=s=>s.replace(/\b[a-z]/g,c=>c.toUpperCase());

// Turn input (address or listing URL) into {street, rest} plain text
function parse(raw){
  let text=raw.trim();
  try{
    const u=new URL(text);
    const segs=u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const seg=segs.find(s=>/^\d+-/.test(s))||segs.join(" ");
    text=seg.replace(/-/g," ");
  }catch(e){}
  text=text.toLowerCase().replace(/[^a-z0-9ñ ,]/g," ").replace(/\s+/g," ").trim();
  const words=text.replace(/,/g," ").split(" ").filter(Boolean);
  if(!/^\d+$/.test(words[0]||"")) return null;
  const rest=words.slice(1).filter(w=>!DIRS.has(w));
  if(!rest.length) return null;
  const k=words[0]+"-"+rest[0];
  // display street: up to the comma, or up to first street suffix
  let street=text.includes(",")?text.split(",")[0]:null;
  if(!street){const i=words.findIndex((w,j)=>j>1&&SUFFIX.has(w));street=words.slice(0,i>0?i+1:Math.min(words.length,3)).join(" ");}
  return {key:k,street:title(street.trim()),text};
}
function neighborhood(text){
  const z=(text.match(/\b9\d{4}\b/)||[])[0];
  if(z&&ZIPS[z]) return {name:ZIPS[z],why:"zip "+z};
  for(const [c,n] of CITIES) if(text.includes(c)) return {name:n,why:title(c)};
  return {name:"Other",why:z?"zip "+z+" isn’t in your search areas":"no zip or neighborhood found"};
}
function groupList(name){
  let nb=[...document.querySelectorAll(".nb")].find(n=>n.dataset.nbhd===name);
  if(!nb){
    nb=document.createElement("div");nb.className="nb";nb.dataset.nbhd=name;
    const h=document.createElement("h3");h.textContent=name;nb.append(h);
    const other=[...document.querySelectorAll(".nb")].find(n=>n.dataset.nbhd==="Other");
    const all=document.querySelectorAll(".nb"); const last=all[all.length-1];
    if(other&&name!=="Other") other.before(nb); else if(last) last.after(nb); else $("#list").append(nb);
  }
  let slot=nb.querySelector(".slot.nooh");
  if(!slot){ slot=mkSlot("No upcoming open house"); slot.classList.add("nooh"); nb.append(slot); }
  return slot.querySelector("ul");
}
const ROWS=["Active listing","Price $1.3M–$2.75M","3+ bed, 2+ bath","2,400+ sf or 7,000+ sf lot","Pool: full in-ground, or room for 18×20 with access","Grocery in walking distance","Highly rated elementary within 2 mi","Not a steep hillside"];
function render(d){
  const id="added-"+d.key;
  if(document.getElementById(id)) return id;
  const ul=groupList(d.nbhd);
  const li=document.createElement("li");li.dataset.key=d.key;li.dataset.v="check";li.dataset.ev="check";li.dataset.ohs="[]";
  li.innerHTML=`<a href="#${id}"><span class="dot check" aria-hidden="true"></span><span class="addr"><span class="new">Added</span> ${esc(d.street)}</span><span class="meta">Not in the weekly report yet. Exit: needs check</span><span class="vt check">Needs check</span></a><button class="x" type="button" aria-label="Reject ${esc(d.street)}" title="Reject">×</button>`;
  ul.append(li);
  const when=new Date(d.added).toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const rows=`<tr><th scope="row">Neighborhood</th><td><span class="tag pass">Filed</span></td><td>${esc(d.nbhd)} (${esc(d.why)})</td></tr>`+ROWS.map(r=>`<tr><th scope="row">${esc(r)}</th><td><span class="tag check">Check</span></td><td>Not checked yet</td></tr>`).join("");
  const link=/^https?:/i.test(d.input)?`<a href="${esc(d.input)}" rel="noopener" target="_blank">Open listing</a>`:"";
  const a=document.createElement("article");a.className="panel";a.id=id;a.tabIndex=-1;a.dataset.key=d.key;
  a.innerHTML=`<p class="where">${esc(d.nbhd)}</p><h2>${esc(d.street)}</h2><div class="stars" role="group" aria-label="Your rating"><button type="button" class="star" data-n="1" aria-label="1 of 3 stars" aria-pressed="false">★</button><button type="button" class="star" data-n="2" aria-label="2 of 3 stars" aria-pressed="false">★</button><button type="button" class="star" data-n="3" aria-label="3 of 3 stars" aria-pressed="false">★</button><span class="shint">Tap 3 stars to add to Starred.</span></div><h3 class="sec">Your needs</h3><div class="verdict check"><strong>Needs check</strong><span>New address, added ${esc(when)}. Filters aren’t checked yet.</span></div><div class="scroll"><table><thead><tr><th scope="col">Filter</th><th scope="col">Result</th><th scope="col">Details</th></tr></thead><tbody>${rows}</tbody></table></div><h3 class="sec">Exit</h3><div class="verdict check"><strong>Needs check</strong><span>Price not known yet, so the 3-month mortgage target can’t be set.</span></div><div class="scroll"><table><thead><tr><th scope="col">Path</th><th scope="col">Result</th><th scope="col">Details</th></tr></thead><tbody><tr><th scope="row">Airbnb income covering 3 months of mortgage</th><td><span class="tag check">Check</span></td><td>Not checked yet</td></tr><tr><th scope="row">Forced value add (ADU, addition, fixer, lot)</th><td><span class="tag check">Check</span></td><td>Not checked yet</td></tr></tbody></table></div><p class="links">${link}<a href="#list">Back to list</a></p>`;
  $(".results").append(a);
  if(typeof regroupReady!=="undefined") regroup();
  if(REMOVED.has(d.key)) hideKey(d.key);
  if(window.__starsReady&&STARS.has(d.key)){ paintStars(d.key); drawStarred(); }
  return id;
}
function show(){
  document.querySelectorAll(".panel.show").forEach(p=>p.classList.remove("show"));
  const h=decodeURIComponent(location.hash.slice(1));
  const p=h&&document.getElementById(h);
  if(p&&p.classList.contains("panel")){p.classList.add("show");}
}
function go(id){
  if(location.hash==="#"+id) show(); else location.hash=id;
  const p=document.getElementById(id); if(p) p.scrollIntoView({block:"start"});
}
window.addEventListener("hashchange",show);

// removal: hidden here for good, kept in the weekly report data
const REMOVED=new Map(); const LSR="listing-check-removed";
function lsRemoved(){try{return JSON.parse(localStorage.getItem(LSR)||"[]")}catch(e){return []}}
function tidyGroups(){
  let shown=0;
  document.querySelectorAll(".nb").forEach(nb=>{
    let anyNb=false;
    nb.querySelectorAll(".slot").forEach(sl=>{
      const any=[...sl.querySelectorAll("li")].some(li=>!li.hidden&&!li.classList.contains("ff"));
      sl.hidden=!any; if(any){anyNb=true;}
    });
    nb.querySelectorAll(".day").forEach(dy=>{ dy.hidden=![...dy.querySelectorAll(".slot")].some(sl=>!sl.hidden); });
    nb.hidden=!anyNb; if(anyNb) shown++;
  });
  const nm=document.getElementById("noMatch"); if(nm) nm.hidden=shown>0;
}
function streetOf(k){const el=document.querySelector('.nb li[data-key="'+k+'"] .addr');return el?addrText(el):k;}
function drawRejected(){
  const ul=$("#rejList"); ul.textContent="";
  [...REMOVED.values()].sort((a,b)=>String(b.removed).localeCompare(String(a.removed))).forEach(d=>{
    const li=document.createElement("li");
    const when=d.removed?new Date(d.removed).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";
    li.innerHTML=`<span><strong>${esc(d.street||streetOf(d.key))}</strong><span class="rmeta">Rejected ${esc(when)}</span></span><button type="button" data-restore="${esc(d.key)}">Restore</button>`;
    ul.append(li);
  });
  $("#rejEmpty").hidden=REMOVED.size>0;
}
function hideKey(k,d){
  REMOVED.set(k,d||REMOVED.get(k)||{key:k});
  document.querySelectorAll('.nb li[data-key="'+k+'"]').forEach(li=>li.hidden=true);
  tidyGroups();
  const id=SCAN[k]||("added-"+k);
  if(location.hash==="#"+id){ location.hash="list"; }
  const p=document.getElementById(id); if(p) p.classList.remove("show");
  drawRejected(); if(typeof drawStarred==="function"&&window.__starsReady) drawStarred();
}
function unhideKey(k){
  REMOVED.delete(k);
  document.querySelectorAll('.nb li[data-key="'+k+'"]').forEach(li=>li.hidden=false);
  tidyGroups(); drawRejected(); if(window.__starsReady) drawStarred();
}
$("#rejToggle").addEventListener("click",()=>{
  const box=$("#rejected"), open=box.hidden;
  box.hidden=!open; $("#rejToggle").setAttribute("aria-expanded",String(open));
  $("#rejToggle").textContent=open?"Hide rejected listings":"Show rejected listings";
});
$("#rejList").addEventListener("click",async e=>{
  const b=e.target.closest("[data-restore]"); if(!b) return;
  const k=b.dataset.restore; const d=REMOVED.get(k)||{};
  unhideKey(k);
  if(db){ try{ await db.doc("removed/"+k).delete(); }catch(err){} }
  try{ localStorage.setItem(LSR,JSON.stringify(lsRemoved().filter(x=>x.key!==k))); }catch(err){}
  status.textContent=(d.street||streetOf(k))+" restored.";
});
lsRemoved().forEach(d=>hideKey(d.key,d));
// reject: tap × three times; the count resets after 6 seconds without a tap
const TAPS=new Map();
async function reject(k,street){
  const d={key:k,street,removed:new Date().toISOString()};
  hideKey(k,d);
  let saved=false;
  if(db){ try{ await db.doc("removed/"+k).set(d); saved=true; }catch(err){} }
  if(!saved){ try{ const a=lsRemoved(); a.push(d); localStorage.setItem(LSR,JSON.stringify(a)); saved=true; }catch(err){} }
  status.textContent=street+" rejected. Restore it from Rejected listings at the bottom."+(saved?"":" It couldn’t be saved, so it will come back next time.");
}
function disarm(b){ b.classList.remove("armed"); b.textContent="×"; b.setAttribute("aria-label","Reject "+b.dataset.street+": tap 3 times"); }
$("#list").addEventListener("click",e=>{
  const b=e.target.closest(".x"); if(!b) return;
  const li=b.closest("li"); const k=li.dataset.key; const street=addrText(li.querySelector(".addr"));
  b.dataset.street=street;
  const t=TAPS.get(k)||{n:0}; clearTimeout(t.timer); t.n++;
  if(t.n>=3){ TAPS.delete(k); disarm(b); reject(k,street); return; }
  t.timer=setTimeout(()=>{TAPS.delete(k);disarm(b);},6000); TAPS.set(k,t);
  b.classList.add("armed"); b.textContent="× "+t.n+"/3";
  b.setAttribute("aria-label","Reject "+street+": tap "+(3-t.n)+" more time"+(3-t.n>1?"s":""));
  status.textContent="Tap × "+(3-t.n)+" more time"+(3-t.n>1?"s":"")+" to reject "+street+".";
});

// stars: 0–3 per listing, 3 stars puts it on the Starred list
const STARS=new Map(); const LSS="listing-check-stars";
function lsStars(){try{return JSON.parse(localStorage.getItem(LSS)||"{}")}catch(e){return {}}}
function paintStars(k){
  const n=STARS.get(k)||0;
  document.querySelectorAll('.panel[data-key="'+k+'"] .star').forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.n<=n)));
  document.querySelectorAll('.nb li[data-key="'+k+'"] .addr').forEach(el=>{
    let s=el.querySelector(".sind"); if(!n){ if(s) s.remove(); return; }
    if(!s){ s=document.createElement("span"); s.className="sind"; s.setAttribute("aria-label",n+" stars"); el.append(s); }
    s.textContent="★".repeat(n);
  });
}
function drawStarred(){
  const ul=$("#starList"); ul.textContent="";
  for(const [k,n] of STARS){
    if(n!==3||REMOVED.has(k)) continue;
    const src=document.querySelector('.nb li[data-key="'+k+'"] a'); if(!src) continue;
    const li=document.createElement("li"); li.dataset.star=k; li.append(src.cloneNode(true)); ul.append(li);
  }
  $("#starred").hidden=!ul.children.length;
}
function setStars(k,n){ if(n) STARS.set(k,n); else STARS.delete(k); paintStars(k); drawStarred(); if(FILTER==="starred") applyFilter(); }
window.__starsReady=true;
Object.entries(lsStars()).forEach(([k,n])=>setStars(k,n));
document.addEventListener("click",async e=>{
  const b=e.target.closest(".star"); if(!b) return;
  const p=b.closest(".panel"); const k=p.dataset.key; let n=+b.dataset.n;
  if((STARS.get(k)||0)===n) n=0;
  setStars(k,n);
  const street=p.querySelector("h2").textContent;
  status.textContent=n===3?street+" added to Starred.":n?street+" rated "+n+" of 3.":street+" rating cleared.";
  let saved=false;
  if(db){ try{ await db.doc("stars/"+k).set({key:k,street,stars:n,at:new Date().toISOString()}); saved=true; }catch(err){} }
  if(!saved){ try{ const o=lsStars(); if(n) o[k]=n; else delete o[k]; localStorage.setItem(LSS,JSON.stringify(o)); }catch(err){} }
});

// open houses: each listing sits under its next open house that hasn't ended,
// grouped neighborhood > day > time, earliest first, from the moment the page is viewed.
const TZ="America/Los_Angeles";
const laDay=ms=>new Date(ms).toLocaleDateString("en-US",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"});
function mkSlot(label){ const d=document.createElement("div"); d.className="slot"; const p=document.createElement("p"); p.className="slotlbl"; p.textContent=label; d.append(p,document.createElement("ul")); return d; }
function nextOH(li,now){ let a=[]; try{ a=JSON.parse(li.dataset.ohs||"[]"); }catch(e){} return a.filter(o=>o[1]>now).sort((x,y)=>x[0]-y[0]||x[1]-y[1])[0]||null; }
function regroup(){
  const now=Date.now(), today=laDay(now), tmrw=laDay(now+864e5);
  document.querySelectorAll("#list .nb").forEach(nb=>{
    const items=[...nb.querySelectorAll("li[data-key]")].map((li,i)=>({li,i,o:nextOH(li,now)}));
    nb.querySelectorAll(".day,.slot").forEach(x=>x.remove());
    items.sort((a,b)=>(a.o?a.o[0]:Infinity)-(b.o?b.o[0]:Infinity)||(a.o&&b.o?a.o[1]-b.o[1]:0)||a.i-b.i);
    let day=null,dk=null,slot=null,sk=null;
    for(const it of items){
      if(!it.o){
        if(sk!=="none"){ slot=mkSlot("No upcoming open house"); slot.classList.add("nooh"); nb.append(slot); sk="none"; }
        slot.querySelector("ul").append(it.li); continue;
      }
      const k=laDay(it.o[0]);
      if(k!==dk){
        day=document.createElement("div"); day.className="day";
        const p=document.createElement("p"); p.className="daylbl";
        p.textContent="Open house "+it.o[2]+(k===today?" (today)":k===tmrw?" (tomorrow)":"");
        day.append(p); nb.append(day); dk=k; sk=null;
      }
      const s=it.o[0]+"-"+it.o[1];
      if(s!==sk){ slot=mkSlot(it.o[3]+(it.o[0]<=now?" · happening now":"")); day.append(slot); sk=s; }
      slot.querySelector("ul").append(it.li);
    }
  });
  tidyGroups();
}

// quick filters
function applyFilter(){
  document.querySelectorAll(".nb li[data-key]").forEach(li=>{
    let ok=true;
    if(FILTER==="fit") ok=li.dataset.v==="pass";
    else if(FILTER==="exit") ok=li.dataset.ev==="pass";
    else if(FILTER==="oh") ok=!!nextOH(li,Date.now());
    else if(FILTER==="fixer") ok=li.dataset.fx==="1";
    else if(FILTER==="starred") ok=(STARS.get(li.dataset.key)||0)===3;
    li.classList.toggle("ff",!ok);
  });
  tidyGroups();
}
document.querySelector(".chips").addEventListener("click",e=>{
  const c=e.target.closest(".chip"); if(!c) return;
  FILTER=c.dataset.f;
  document.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",String(x===c)));
  applyFilter();
});
var regroupReady=true; regroup();
setInterval(()=>{ regroup(); if(FILTER==="oh") applyFilter(); },60000);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ regroup(); if(FILTER==="oh") applyFilter(); } });

// storage: shared db if available, else this browser
let db=null; const LS="listing-check-added";
function lsAll(){try{return JSON.parse(localStorage.getItem(LS)||"[]")}catch(e){return []}}
function lsAdd(d){try{const a=lsAll();a.push(d);localStorage.setItem(LS,JSON.stringify(a));return true}catch(e){return false}}
lsAll().forEach(render); show();
// Google Sheet backend (Apps Script web app). Filled in by build.py from env vars.
const SHEET_URL=%SHEET_URL%, SHEET_TOKEN=%SHEET_TOKEN%;
function sheetDb(url,token){
  const subs={}, last={};
  const ch=(type,d)=>({type,doc:{data:()=>d}});
  async function pull(){
    const r=await fetch(url+"?t="+encodeURIComponent(token)); const j=await r.json();
    if(!j.ok) throw new Error(j.error||"read failed");
    Object.keys(subs).forEach(c=>{
      const prev=last[c]||{}, cur={}; (j[c]||[]).forEach(d=>{ if(d&&d.key) cur[d.key]=d; });
      const changes=[];
      for(const k in cur) if(JSON.stringify(cur[k])!==JSON.stringify(prev[k])) changes.push(ch(prev[k]?"modified":"added",cur[k]));
      for(const k in prev) if(!cur[k]) changes.push(ch("removed",prev[k]));
      last[c]=cur;
      if(changes.length) subs[c].forEach(cb=>{ try{ cb({docChanges:()=>changes}); }catch(e){} });
    });
  }
  async function post(b){
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({token},b))});
    const j=await r.json(); if(!j.ok) throw new Error(j.error||"save failed");
  }
  const api={
    doc(path){ const [c,k]=path.split("/"); return {
      set:d=>post({op:"set",coll:c,key:k,doc:d}).then(()=>{ (last[c]=last[c]||{})[k]=Object.assign({},d,{key:k}); }),
      delete:()=>post({op:"delete",coll:c,key:k}).then(()=>{ if(last[c]) delete last[c][k]; })
    }; },
    collection(c){ return {onSnapshot(cb){ (subs[c]=subs[c]||[]).push(cb); }}; },
    start(){ const go=()=>pull().catch(()=>{}); go(); setInterval(go,30000); }
  };
  return api;
}
(async()=>{
  try{ db=await window.claude?.use("db"); }catch(e){ db=null; }
  if(!db && SHEET_URL) db=sheetDb(SHEET_URL,SHEET_TOKEN);
  if(!db) return;
  db.collection("stars").onSnapshot(snap=>{
    snap.docChanges().forEach(c=>{ const d=c.doc.data(); if(!d||!d.key) return; setStars(d.key,c.type==="removed"?0:(+d.stars||0)); });
  },()=>{});
  db.collection("removed").onSnapshot(snap=>{
    snap.docChanges().forEach(c=>{ const d=c.doc.data(); if(!d||!d.key) return; if(c.type==="removed") unhideKey(d.key); else hideKey(d.key,d); });
  },()=>{});
  db.collection("added").onSnapshot(snap=>{
    snap.docChanges().forEach(c=>{ if(c.type!=="removed"){ const d=c.doc.data(); if(d) render(d);} });
    show();
  },()=>{});
  if(db.start) db.start();
})();

// repeat entries: scroll to the row in the list and fill it yellow
const LSE="listing-check-entered";
const entered=new Set((()=>{try{return JSON.parse(localStorage.getItem(LSE)||"[]")}catch(e){return []}})());
function saveEntered(){ try{ localStorage.setItem(LSE,JSON.stringify([...entered])); }catch(e){} }
function markDup(k){
  const li=document.querySelector('#list li[data-key="'+k+'"]');
  if(!li){ status.textContent="You entered this before."; return; }
  if(li.classList.contains("ff")){ FILTER="all"; document.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.f==="all"))); applyFilter(); }
  document.querySelectorAll("#list li.dup").forEach(x=>x.classList.remove("dup"));
  li.classList.add("dup");
  li.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
  status.textContent="You entered this before. It’s highlighted in the list.";
}
$("#checkForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const raw=$("#q").value;
  if(!raw.trim()){status.textContent="Enter an address or a listing URL.";return;}
  const p=parse(raw);
  if(!p){status.textContent="Couldn’t find a street address. Try a number and street, like 4520 Kingswell Ave 90027.";return;}
  if(REMOVED.has(p.key)){status.textContent="You rejected this listing. Restore it from Rejected listings at the bottom.";return;}
  const known=SCAN[p.key]||(document.getElementById("added-"+p.key)?"added-"+p.key:null);
  if(known){
    if(entered.has(p.key)||!SCAN[p.key]){ markDup(p.key); $("#q").value=""; return; }
    entered.add(p.key); saveEntered();
    status.textContent="Already in the weekly report."; go(known); return;
  }
  entered.add(p.key); saveEntered();
  const n=neighborhood(p.text);
  const d={key:p.key,street:p.street,nbhd:n.name,why:n.why,input:raw.trim().slice(0,500),added:new Date().toISOString()};
  const id=render(d);
  let saved=false;
  if(db){ try{ await db.doc("added/"+p.key).set(d); saved=true; }catch(err){ saved=false; } }
  if(!saved) saved=lsAdd(d);
  status.textContent=`New address, added to ${n.name}.`+(saved?"":" It couldn’t be saved, so it will be gone after you leave this page.");
  $("#q").value="";
  go(id);
});
})();
