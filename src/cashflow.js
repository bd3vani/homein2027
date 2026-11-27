// ---- Cash flow: starred listings (any rating). Inputs live only in this page view; nothing is saved.
(function(){
const CF=%CFDATA%;
const $=s=>document.querySelector(s);
const root=$("#cfBody"); if(!root) return;

// City rules. Transfer tax is what the seller pays at resale (county 0.11% everywhere).
// strCap = nights a year a whole home may be rented short-term while it is your primary residence; 0 = banned; null = rule not checked.
const CITY={
  "Los Angeles":{tt:p=>0.0011+0.0045+(p>10900000?0.055:p>5400000?0.04:0),ttNote:"County 0.11% + City of LA 0.45% (+ULA above $5.4M)",strCap:120,strNote:"City of LA home-sharing: primary residence, 120 nights a year"},
  "Glendale":{tt:()=>0.0011,ttNote:"County 0.11%",strCap:0,strNote:"Hosted home-sharing only; whole-home rentals banned"},
  "La Cañada Flintridge":{tt:()=>0.0011,ttNote:"County 0.11%",strCap:0,strNote:"Short-term rentals banned"},
  "Burbank":{tt:()=>0.0011,ttNote:"County 0.11%",strCap:0,strNote:"Short-term rentals banned"},
  "Pasadena":{tt:()=>0.0011,ttNote:"County 0.11%",strCap:90,strNote:"Primary residence, 90 un-hosted nights a year (unconfirmed)"},
  "Culver City":{tt:p=>0.0011+(p>=10000000?0.04:p>=3000000?0.03:p>=1500000?0.015:0.0045),ttNote:"County 0.11% + Culver City tiers (Measure RE)",strCap:null,strNote:"Rule not checked"},
  "Santa Monica":{tt:()=>0.0011+0.003,ttNote:"County 0.11% + Santa Monica 0.30% (verify)",strCap:0,strNote:"Hosted home-sharing only; whole-home vacation rentals banned"},
  "La Crescenta (unincorporated)":{tt:()=>0.0011,ttNote:"County 0.11%",strCap:null,strNote:"LA County rule not checked"}
};
const NBHD_CITY={"Glendale":"Glendale","La Cañada Flintridge":"La Cañada Flintridge","Burbank":"Burbank","Pasadena":"Pasadena","La Crescenta":"La Crescenta (unincorporated)"};
const cityOf=x=>(x.cf&&x.cf.city)||NBHD_CITY[x.nbhd]||(x.nbhd==="Other"?null:"Los Angeles");

// Inputs: [id, label, default, kind, group, note]
const IN=[
 ["down","Down payment",20,"%","Loan"],
 ["rateLo","Rate, low",6.49,"%","Loan","Your range for an 850 score, late Nov 2026"],
 ["rateHi","Rate, high",7.26,"%","Loan"],
 ["rate","Rate used",6.875,"%","Loan","Midpoint; edit to test"],
 ["term","Term",30,"yrs","Loan"],
 ["closeBuy","Buyer closing costs",1,"% of price","Loan","Assumption"],
 ["ptax","Property tax",1.25,"% of price/yr","Carry"],
 ["ins","Insurance",0.35,"% of price/yr","Carry","Assumption; set from your quote"],
 ["maint","Maintenance",3,"% of price/yr","Carry"],
 ["pool","Pool build cost",250000,"$","Carry","Added only when there's no pool, room is confirmed and build access is confirmed"],
 ["occ","Airbnb occupancy",20,"%","Income"],
 ["strCost","Airbnb operating costs",15,"% of revenue","Income","Cleaning, supplies, platform fees; assumption"],
 ["vac","Long-term vacancy",0,"%","Income"],
 ["mgmt","Long-term management",0,"% of rent","Income"],
 ["grow","Rent and nightly-rate growth",0,"%/yr","Income"],
 ["rentAvoided","Rent you'd otherwise pay (live-in)",0,"$/mo","Income","Counts as a saving in the Live in column"],
 ["years","Hold period",5,"yrs","Sale"],
 ["comm","Sale commission",5,"% of sale","Sale"],
 ["stage","Staging",4000,"$","Sale","LA average (Angi/HomeAdvisor)"],
 ["saleMonths","Months to sell",1,"months","Sale","30-day sale: one month of carry"],
 ["mkt","Market return",5,"%/yr","Market"],
 ["fedOrd","Federal ordinary rate",35,"%","Tax","Assumption; set your bracket"],
 ["caOrd","California rate",9.3,"%","Tax","Assumption; set your bracket"],
 ["fedCG","Federal long-term gains rate",20,"%","Tax"],
 ["niit","Net investment income tax",3.8,"%","Tax"],
 ["recap","Depreciation recapture rate",25,"%","Tax"],
 ["excl","Home-sale exclusion",500000,"$","Tax","$500k married filing jointly; $250k single"],
 ["saltRoom","SALT room left for property tax",0,"$/yr","Tax","Federal SALT cap is $40,400 in 2026; state income tax usually fills it"],
 ["bldg","Building share of value",50,"%","Tax","For depreciation of rented space; LA land share is high"]
];
const V={}; IN.forEach(r=>V[r[0]]=r[2]);

// ---- inputs menu
const menu=$("#cfInputs"); const groups={};
IN.forEach(([id,label,def,unit,g,note])=>{
  if(!groups[g]){ const fs=document.createElement("fieldset"); fs.innerHTML=`<legend>${g}</legend>`; menu.append(fs); groups[g]=fs; }
  const w=document.createElement("label"); w.className="cfin";
  w.innerHTML=`<span>${label}</span><span class="cfv"><input type="number" step="any" id="cf_${id}" value="${def}" inputmode="decimal"><small>${unit}</small></span>${note?`<em>${note}</em>`:""}`;
  groups[g].append(w);
});
const reset=document.createElement("button"); reset.type="button"; reset.className="cfreset"; reset.textContent="Reset to defaults";
reset.addEventListener("click",()=>{ IN.forEach(r=>{ $("#cf_"+r[0]).value=r[2]; V[r[0]]=r[2]; }); POOL.clear(); render(); });
menu.append(reset);
menu.addEventListener("input",e=>{ const id=e.target.id.replace(/^cf_/,""); if(id in V){ const n=parseFloat(e.target.value); V[id]=isFinite(n)?n:0; render(); } });
const POOL=new Map(); // per-listing pool-add override for this view only

// ---- math
const pmt=(L,r,n)=>r?L*r/(1-Math.pow(1+r,-n)):L/n;
const bal=(L,r,n,k)=>r?L*Math.pow(1+r,k)-pmt(L,r,n)*(Math.pow(1+r,k)-1)/r:L-L/n*k;
function interestYear(L,r,n,y){ return pmt(L,r,n)*12-(bal(L,r,n,(y-1)*12)-bal(L,r,n,y*12)); }
const usd=n=>(n<0?"(":"")+"$"+Math.round(Math.abs(n)).toLocaleString("en-US")+(n<0?")":"");
const pct=n=>(n<0?"(":"")+(Math.abs(n)*100).toFixed(1)+"%"+(n<0?")":"");

function poolNeeded(x){
  if(POOL.has(x.key)) return POOL.get(x.key);
  if(x.pool==="pass") return false; // has a pool
  const a=x.cf&&x.cf.pool_add; return !!(a&&a.room===true&&a.access===true);
}

function model(x){
  const c=x.cf||{}, city=cityOf(x), rule=CITY[city]||null;
  const P=x.price, Y=Math.max(1,Math.round(V.years)), n=V.term*12, r=V.rate/1200;
  const down=P*V.down/100, L=P-down, poolCost=poolNeeded(x)?V.pool:0, closing=P*V.closeBuy/100;
  const upfront=down+closing+poolCost;
  const piMo=pmt(L,r,n), taxYr=P*V.ptax/100, insYr=P*V.ins/100, maintYr=P*V.maint/100, hoaYr=(c.hoa_mo||0)*12;
  const pitiMo=piMo+(taxYr+insYr)/12, carryMo=pitiMo+(maintYr+hoaYr)/12;
  const piti=k=>pmt(L,k/1200,n)+(taxYr+insYr)/12;
  const units=(c.units||[]).filter(u=>u&&u.rent>0);
  const rentAll=units.reduce((s,u)=>s+u.rent,0);
  const cagr=c.cagr5;
  const sale=cagr!=null?P*Math.pow(1+cagr,Y):null;
  const tt=rule?rule.tt(sale||P):0.0011;
  const saleCosts=sale!=null?sale*V.comm/100+V.stage+(sale*tt)+carryMo*V.saleMonths:null;
  const loanEnd=bal(L,r,n,Y*12);
  const basisBldg=(P+closing+poolCost)*V.bldg/100;
  const fed=V.fedOrd/100, ca=V.caOrd/100, ord=fed+ca, cg=V.fedCG/100+V.niit/100+ca;

  // one scenario. rentedShare: share of the property rented long-term; ownerShare: share you live in.
  function scen(kind){
    let ownerShare=1, rentedShare=0, incomeYr0=0, strNights=0, legal=true, note="";
    if(kind==="live"){ }
    else if(kind==="hack"){
      if(!units.length) return {na:"Unit rents not filled yet"};
      if(units.length<2) return {na:"Single unit"};
      const own=units.reduce((a,u)=>u.beds>a.beds||(u.beds===a.beds&&u.rent>a.rent)?u:a,units[0]);
      incomeYr0=(rentAll-own.rent)*12*(1-V.vac/100)*(1-V.mgmt/100);
      rentedShare=(rentAll-own.rent)/rentAll; ownerShare=1-rentedShare;
      note=`You live in the ${own.beds}-bed unit`;
    }
    else if(kind==="rent"){
      if(!units.length) return {na:"Rent comps not filled yet"};
      incomeYr0=rentAll*12*(1-V.vac/100)*(1-V.mgmt/100); rentedShare=1; ownerShare=0;
    }
    else if(kind==="strLegal"||kind==="strGross"){
      if(!c.adr) return {na:"Nightly comps not filled yet"};
      strNights=365*V.occ/100;
      if(kind==="strLegal"){
        if(!rule||rule.strCap==null) return {na:rule?rule.strNote:"City not set"};
        strNights=Math.min(strNights,rule.strCap); legal=true; note=rule.strNote;
        if(!strNights) return {zero:true,note:rule.strNote};
      } else note=rule?rule.strNote:"";
      incomeYr0=c.adr*strNights*(1-V.strCost/100);
    }
    let cum=0, shortfall=0, depTaken=0, suspended=0; const yrs=[];
    const dedShare=ownerShare*(1-strNights/365); // your own use; Airbnb nights are deducted against Airbnb income
    for(let y=1;y<=Y;y++){
      const grow=Math.pow(1+V.grow/100,y-1), inc=incomeYr0*grow;
      const intY=interestYear(L,r,n,y);
      const pre=inc-carryMo*12+(kind==="live"?V.rentAvoided*12:0);
      // taxes
      let tax=0;
      const ownerInt=intY*dedShare;
      const fedInt=ownerInt*Math.min(1,750000/L), caInt=ownerInt*Math.min(1,1000000/L);
      tax-=fedInt*fed+caInt*ca;                                   // mortgage interest deduction
      tax-=Math.min(taxYr*dedShare,V.saltRoom)*fed+taxYr*dedShare*ca; // property tax deduction
      if(rentedShare>0){
        const dep=basisBldg*rentedShare/27.5; depTaken+=dep;
        const net=inc-(intY+taxYr+insYr+maintYr+hoaYr)*rentedShare-dep;
        if(net>0) tax+=net*ord; else suspended+=-net;             // passive losses wait for the sale
      }
      if(strNights){
        const share=strNights/365;
        const net=Math.max(0,inc-(intY+taxYr+insYr+maintYr+hoaYr)*share); // limited to income (home used as residence)
        tax+=net*ord;
      }
      const after=pre-tax; cum+=after; if(after<0) shortfall+=-after;
      yrs.push(after);
    }
    let out={note,legal,incomeMo:incomeYr0/12,cfMo:yrs[0]/12,preMo:(incomeYr0-carryMo*12+(kind==="live"?V.rentAvoided*12:0))/12,cum};
    if(sale==null){ out.noSale=true; return out; }
    const gain=sale-saleCosts-(P+closing+poolCost-depTaken);
    const recapTax=Math.min(Math.max(gain,0),depTaken)*(V.recap/100+ca);
    const rest=Math.max(0,gain-Math.min(Math.max(gain,0),depTaken));
    const excluded=Math.min(rest*ownerShare,V.excl*(ownerShare>0?1:0));
    const cgTax=(rest-excluded)*cg-suspended*ord;
    const saleTax=Math.max(0,recapTax)+cgTax;
    const proceeds=sale-saleCosts-loanEnd-saleTax;
    const invested=upfront+shortfall;
    const profit=proceeds+cum-upfront;
    // market: same money in (upfront now, each year's shortfall when it happens) at the market return, taxed on gains at the end
    let m=upfront*Math.pow(1+V.mkt/100,Y), mIn=upfront;
    yrs.forEach((a,i)=>{ if(a<0){ m+=-a*Math.pow(1+V.mkt/100,Y-i-1); mIn+=-a; } });
    const mProfit=(m-mIn)*(1-cg);
    Object.assign(out,{proceeds,saleTax,profit,invested,roi:profit/invested,ann:Math.sign(1+profit/invested)*Math.pow(Math.abs(1+profit/invested),1/Y)-1,mProfit,mRoi:mProfit/mIn,delta:profit-mProfit});
    return out;
  }
  return {city,rule,P,Y,down,L,poolCost,closing,upfront,piMo,pitiMo,carryMo,pitiLo:piti(V.rateLo),pitiHi:piti(V.rateHi),taxYr,insYr,maintYr,sale,saleCosts,tt,loanEnd,units,rentAll,
    s:{live:scen("live"),hack:scen("hack"),rent:scen("rent"),strLegal:scen("strLegal"),strGross:scen("strGross")}};
}

const COLS=[["live","Live in"],["hack","House hack"],["rent","Rent all units"],["strLegal","Airbnb 20%, legal"],["strGross","Airbnb 20%, gross"]];
const ROWS=[
 ["Income /mo",s=>usd(s.incomeMo)],
 ["Cash flow /mo, pre-tax",s=>usd(s.preMo)],
 ["Cash flow /mo, after tax (yr 1)",s=>usd(s.cfMo)],
 ["5-yr after-tax cash flow",s=>usd(s.cum)],
 ["Sale proceeds after tax and loan",s=>s.noSale?"—":usd(s.proceeds)],
 ["Total cash put in",s=>s.noSale?"—":usd(s.invested)],
 ["Profit",s=>s.noSale?"—":usd(s.profit)],
 ["ROI, 5-yr total",s=>s.noSale?"—":pct(s.roi)],
 ["ROI, annualized",s=>s.noSale?"—":pct(s.ann)],
 ["Same cash in the market: profit",s=>s.noSale?"—":usd(s.mProfit)],
 ["Same cash in the market: ROI",s=>s.noSale?"—":pct(s.mRoi)],
 ["Home vs market",s=>s.noSale?"—":`<b class="${s.delta>=0?"pos":"neg"}">${s.delta>=0?"+":""}${usd(s.delta)}</b>`]
];

function card(x){
  const m=model(x), c=x.cf||{};
  const head=`<div class="cfhead"><h3>${x.addr}</h3><p>${x.nbhd}${m.city&&m.city!==x.nbhd?` · ${m.city}`:""} · ${usd(x.price)} · ${"★".repeat(x.stars)}${"☆".repeat(3-x.stars)}</p></div>`;
  const pnote=x.pool==="pass"?"Has a pool: no pool cost":(c.pool_add?`${c.pool_add.note||""}`:"No pool and room/access not confirmed");
  const facts=`<dl class="cffacts">
   <div><dt>PITI /mo</dt><dd>${usd(m.pitiMo)}<small>${usd(m.pitiLo)}–${usd(m.pitiHi)} at ${V.rateLo}–${V.rateHi}%</small></dd></div>
   <div><dt>PITI + maintenance /mo</dt><dd>${usd(m.carryMo)}</dd></div>
   <div><dt>Cash at close</dt><dd>${usd(m.upfront)}<small>${usd(m.down)} down + ${usd(m.closing)} closing${m.poolCost?` + ${usd(m.poolCost)} pool`:""}</small></dd></div>
   <div><dt>Rent, all units /mo</dt><dd>${m.rentAll?usd(m.rentAll):"—"}</dd></div>
   <div><dt>Airbnb at ${V.occ}% /mo, gross</dt><dd>${c.adr?usd(c.adr*365*V.occ/100/12):"—"}<small>${c.adr?`$${c.adr}/night`:""}</small></dd></div>
   <div><dt>Resale in ${m.Y} yrs</dt><dd>${m.sale!=null?usd(m.sale):"—"}<small>${c.cagr5!=null?`${(c.cagr5*100).toFixed(1)}%/yr`:"No area trend yet"}</small></dd></div>
   <div><dt>Sale costs</dt><dd>${m.saleCosts!=null?usd(m.saleCosts):"—"}<small>${V.comm}% commission, ${usd(V.stage)} staging, ${(m.tt*100).toFixed(2)}% transfer tax, ${V.saleMonths} mo carry</small></dd></div>
  </dl>`;
  const poolCtl=x.pool==="pass"?"":`<label class="cfpool"><input type="checkbox" data-k="${x.key}" ${poolNeeded(x)?"checked":""}> Add ${usd(V.pool)} pool build (this view only)</label>`;
  const th=COLS.map(([k,l])=>{const t=m.s[k]; const why=t.na||(t.zero?`$0: ${t.note}`:""); return `<th scope="col">${l}${why?`<small>${why}</small>`:""}</th>`;}).join("");
  const body=ROWS.map(([l,f])=>`<tr><th scope="row">${l}</th>${COLS.map(([k])=>{const s=m.s[k]; return `<td>${s.na||s.zero?`<span class="na">—</span>`:f(s)}</td>`;}).join("")}</tr>`).join("");
  const notes=COLS.map(([k,l])=>m.s[k].note&&!m.s[k].zero&&!m.s[k].na?`<li><b>${l}:</b> ${m.s[k].note}</li>`:"").join("");
  const src=[c.rent_src&&`Rent: ${c.rent_src}`,c.adr_src&&`Nightly: ${c.adr_src}`,c.cagr_src&&`Trend: ${c.cagr_src}`,m.rule&&`Transfer tax: ${m.rule.ttNote}`,c.str_note&&`Short-term rental: ${c.str_note}`].filter(Boolean);
  const missing=!x.cf?`<p class="cfmiss">Comps not filled yet. The next daily or Thursday scan adds rent, nightly rate and area trend for starred listings.</p>`:"";
  return `<article class="cfcard">${head}${missing}<p class="cfpoolnote">${pnote}</p>${poolCtl}${facts}<div class="cfscroll"><table class="cftable"><thead><tr><th></th>${th}</tr></thead><tbody>${body}</tbody></table></div>${notes?`<ul class="cfnotes">${notes}</ul>`:""}${src.length?`<p class="cfsrc">${src.join(" · ")}${c.as_of?` (as of ${c.as_of})`:""}</p>`:""}</article>`;
}

function shortlist(){
  const stars=window.__cfStars?window.__cfStars():new Map(), rej=window.__cfRejected?window.__cfRejected():new Set();
  return CF.filter(x=>(stars.get(x.key)||0)>0&&!rej.has(x.key)&&x.price).map(x=>Object.assign({},x,{stars:stars.get(x.key)}))
    .sort((a,b)=>b.stars-a.stars||a.price-b.price);
}
function render(){
  const L=shortlist();
  root.innerHTML=L.length?L.map(card).join(""):`<p class="cfmiss">Star a listing (any rating) to see its cash flow here.</p>`;
  $("#cfCount").textContent=L.length?`${L.length} starred`:"";
}
root.addEventListener("change",e=>{ const k=e.target.dataset&&e.target.dataset.k; if(k){ POOL.set(k,e.target.checked); render(); } });
window.__cfRender=render;
render();
})();
