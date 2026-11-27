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
 ["rateLo","Rate, low",6.49,"%","Loan","Your range for an 850 score, late Nov 2026"],
 ["rateHi","Rate, high",7.26,"%","Loan"],
 ["rate","30-yr fixed rate used",6.875,"%","Loan","Midpoint; edit to test"],
 ["term","Term",30,"yrs","Loan"],
 ["closeBuy","Buyer closing costs",1,"% of price","Loan","Assumption"],
 ["ptsCut","Rate cut per point",0.25,"%","Loan","1 point = 1% of the loan"],
 ["armSpread","7/6 ARM vs 30-yr fixed",-0.40,"%","Loan","MND Nov 17, 2026: 7.10% vs 7.48%"],
 ["fhaSpread","FHA vs 30-yr fixed",-0.43,"%","Loan","MND Nov 17, 2026: 7.05% vs 7.48%"],
 ["fhaMip","FHA annual MIP",0.75,"% of loan/yr","Loan","Plus 1.75% upfront, financed"],
 ["pmi5","PMI, 5% down",0.63,"% of loan/yr","Loan","760+ score range 0.56–0.70%"],
 ["pmi10","PMI, 10% down",0.38,"% of loan/yr","Loan","760+ score range 0.30–0.46%"],
 ["invSpread","Investment loan vs owner rate",0.625,"%","Loan","Conventional investment property, 25% down; assumption"],
 ["dscrRate","DSCR rate, 25% down",7.25,"%","Loan","Par 6.99% at 70% LTV, Nov 2026; +0.25% at 80%"],
 ["dscrMin","DSCR minimum",1.0,"x","Loan","Rent ÷ PITIA; most lenders 1.0–1.25"],
 ["ptax","Property tax",1.25,"% of price/yr","Carry"],
 ["ins","Insurance",0.35,"% of price/yr","Carry","Assumption; set from your quote"],
 ["maint","Maintenance",2,"% of price/yr","Carry","Plumbing, roof, systems"],
 ["pool","Pool build cost",250000,"$","Carry","Added only when there's no pool, room is confirmed and build access is confirmed"],
 ["occ","Airbnb occupancy",20,"%","Income"],
 ["strCost","Airbnb operating costs",15,"% of revenue","Income","Cleaning, supplies, platform fees; assumption"],
 ["vac","Long-term vacancy",0,"%","Income"],
 ["mgmt","Long-term management",0,"% of rent","Income"],
 ["grow","Rent and nightly-rate growth",0,"%/yr","Income"],
 ["rentAvoided","Rent you'd otherwise pay (live-in)",0,"$/mo","Income","Counts as a saving where you live there"],
 ["psRate","Peerspace hourly rate",250,"$/hr","Shoots","Median of 11 LA pool-home Peerspace listings, Nov 2026"],
 ["psBook","Peerspace bookings",2,"/mo","Shoots","Conservative"],
 ["psHrs","Hours per booking",4,"hrs","Shoots"],
 ["psFee","Peerspace host fee",20,"%","Shoots","15–20% per Peerspace"],
 ["psCost","Shoot cleaning and wear",10,"% of revenue","Shoots","Assumption"],
 ["filmDays","Film shoot days",1,"/yr","Shoots"],
 ["filmRate","Film location fee",5000,"$/day","Shoots","LA homeowner day rates average $5,000–$6,000"],
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
// 2026 Los Angeles County limits by units (FHFA conforming and HUD FHA are the same here)
const LIMIT=[0,1249125,1599375,1933200,2402625];

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

// Loan menu. occ: "own" = you live there; "inv" = investment (DSCR). extra: costs that need to earn their keep.
function loans(x,nUnits){
  const P=x.price, lim=LIMIT[Math.min(4,Math.max(1,nUnits))], f=V.rate;
  const L=[
    {id:"fix20",label:"30-yr fixed, 20% down",down:.20,rate:f,occ:"own",base:true},
    {id:"fix25",label:"30-yr fixed, 25% down",down:.25,rate:f,occ:"own"},
    {id:"fix30",label:"30-yr fixed, 30% down",down:.30,rate:f,occ:"own"},
    {id:"cash1m",label:"30-yr fixed, $1M down",down:Math.min(.95,Math.max(.20,1000000/P)),rate:f,occ:"own"},
    {id:"arm",label:"7/6 ARM, 20% down",down:.20,rate:f+V.armSpread,occ:"own",note:"Rate fixed 7 years, past the hold"},
    {id:"pts1",label:"30-yr fixed, 20% down, 1 point",down:.20,rate:f-V.ptsCut,pts:1,occ:"own",extra:"points"},
    {id:"pts2",label:"30-yr fixed, 20% down, 2 points",down:.20,rate:f-2*V.ptsCut,pts:2,occ:"own",extra:"points"},
    {id:"pmi10",label:"Conforming, 10% down + PMI",down:.10,rate:f,pmi:V.pmi10,occ:"own",extra:"PMI",max:lim},
    {id:"pmi5",label:"Conforming, 5% down + PMI",down:.05,rate:f,pmi:V.pmi5,occ:"own",extra:"PMI",max:lim},
    {id:"fha",label:"FHA, 3.5% down + MIP",down:.035,rate:f+V.fhaSpread,mip:V.fhaMip,ufmip:.0175,occ:"own",extra:"MIP",max:lim},
    {id:"inv25",label:"Investment 30-yr fixed, 25% down",down:.25,rate:f+V.invSpread,occ:"inv",max:lim,note:"Conforming investment loan; underwritten on your income"},
    {id:"dscr25",label:"DSCR, 25% down",down:.25,rate:V.dscrRate,occ:"inv",dscr:true},
    {id:"dscr20",label:"DSCR, 20% down",down:.20,rate:V.dscrRate+.25,occ:"inv",dscr:true}
  ];
  return L.map(l=>{ const base=P*(1-l.down); return Object.assign(l,{loanAmt:base*(1+(l.ufmip||0)),eligible:!l.max||base<=l.max,why:l.max&&base>l.max?`Loan ${usd(base)} is over the ${nUnits}-unit limit ${usd(l.max)}`:""}); });
}

const PATHS=[["live","Live in"],["hack","House hack"],["rent","Rent all units"],["strLegal","Airbnb 20%, legal"],["strGross","Airbnb 20%, gross"],["shoot","Live in + shoots"],["combo","Best legal combo"]];
const OWN=new Set(["live","hack","strLegal","shoot","combo"]);

// Build the income mix for a path. Returns {na} or {rent, rentedShare, ownerShare, str, strNights, shoot, note}
function mix(x,kind){
  const c=x.cf||{}, rule=CITY[cityOf(x)]||null;
  const units=(c.units||[]).filter(u=>u&&u.rent>0), rentAll=units.reduce((s,u)=>s+u.rent,0);
  const longTerm=r=>r*12*(1-V.vac/100)*(1-V.mgmt/100);
  const shootOK=x.pool==="pass";
  const shootYr=V.psRate*V.psBook*V.psHrs*12*(1-V.psFee/100-V.psCost/100)+V.filmDays*V.filmRate;
  const strLegalNights=rule&&rule.strCap?Math.min(365*V.occ/100,rule.strCap):0;
  const own=units.length>1?units.reduce((a,u)=>u.beds>a.beds||(u.beds===a.beds&&u.rent>a.rent)?u:a,units[0]):null;
  const m={rent:0,rentedShare:0,ownerShare:1,str:0,strNights:0,shoot:0,note:""};
  switch(kind){
    case "live": return m;
    case "hack":
      if(!units.length) return {na:"Unit rents not filled yet"};
      if(units.length<2) return {na:"Single unit"};
      return Object.assign(m,{rent:longTerm(rentAll-own.rent),rentedShare:(rentAll-own.rent)/rentAll,ownerShare:own.rent/rentAll,note:`You live in the ${own.beds}-bed unit`});
    case "rent":
      if(!units.length) return {na:"Rent comps not filled yet"};
      return Object.assign(m,{rent:longTerm(rentAll),rentedShare:1,ownerShare:0});
    case "strLegal":
      if(!c.adr) return {na:"Nightly comps not filled yet"};
      if(!rule||rule.strCap==null) return {na:rule?rule.strNote:"City not set"};
      if(!strLegalNights) return {zero:true,note:rule.strNote};
      return Object.assign(m,{str:c.adr*strLegalNights*(1-V.strCost/100),strNights:strLegalNights,note:rule.strNote});
    case "strGross":
      if(!c.adr) return {na:"Nightly comps not filled yet"};
      return Object.assign(m,{str:c.adr*365*V.occ/100*(1-V.strCost/100),strNights:365*V.occ/100,ownerShare:0,note:"Ignores city rules; treated as an investment property"});
    case "shoot":
      if(!shootOK) return {na:"No pool to anchor shoots"};
      return Object.assign(m,{shoot:shootYr,note:`Peerspace ${V.psBook}×${V.psHrs} hrs/mo at $${V.psRate}/hr, ${V.filmDays} film day/yr at ${usd(V.filmRate)}`});
    case "combo": {
      const parts=[];
      if(own&&units.length>1){ Object.assign(m,{rent:longTerm(rentAll-own.rent),rentedShare:(rentAll-own.rent)/rentAll,ownerShare:own.rent/rentAll}); parts.push("house hack"); }
      if(shootOK){ m.shoot=shootYr; parts.push("shoots"); }
      if(units.length<2&&strLegalNights&&c.adr){ m.str=c.adr*strLegalNights*(1-V.strCost/100); m.strNights=strLegalNights; parts.push(`Airbnb ${Math.round(strLegalNights)} nights`); }
      if(!parts.length) return {na:"No legal income to add"};
      m.note="Live there + "+parts.join(" + "); return m;
    }
  }
}

// One path on one loan, over the hold. Everything after tax.
function evalPath(x,kind,ln){
  const mx=mix(x,kind); if(mx.na||mx.zero) return mx;
  if(!ln.eligible) return {na:ln.why};
  if((ln.occ==="own")!==OWN.has(kind)) return {na:ln.occ==="inv"?"DSCR is for investment use":"Owner-occupied loan"};
  const c=x.cf||{}, rule=CITY[cityOf(x)]||null;
  const P=x.price, Y=Math.max(1,Math.round(V.years)), n=V.term*12, r=ln.rate/1200, L=ln.loanAmt;
  const down=P*ln.down, poolCost=poolNeeded(x)?V.pool:0, closing=P*V.closeBuy/100, ptsCost=(ln.pts||0)*L/100;
  const upfront=down+closing+poolCost+ptsCost;
  const piMo=pmt(L,r,n), taxYr=P*V.ptax/100, insYr=P*V.ins/100, maintYr=P*V.maint/100, hoaYr=(c.hoa_mo||0)*12;
  const income0=mx.rent+mx.str+mx.shoot;
  let dscr=null;
  if(ln.dscr){ const gross=(mx.rent/((1-V.vac/100)*(1-V.mgmt/100))||mx.str/(1-V.strCost/100))/12; dscr=gross/(piMo+(taxYr+insYr+hoaYr)/12); if(dscr<V.dscrMin) return {na:`DSCR ${dscr.toFixed(2)} is under ${V.dscrMin}`,dscr}; }
  const cagr=c.cagr5, sale=cagr!=null?P*Math.pow(1+cagr,Y):null;
  const tt=rule?rule.tt(sale||P):0.0011;
  const fed=V.fedOrd/100, ca=V.caOrd/100, ord=fed+ca, cg=V.fedCG/100+V.niit/100+ca;
  const basisBldg=(P+closing+poolCost)*V.bldg/100;
  const dedShare=mx.ownerShare*(1-mx.strNights/365);
  let cum=0, shortfall=0, depTaken=0, suspended=0, insYr1=0; const yrs=[];
  for(let y=1;y<=Y;y++){
    const g=Math.pow(1+V.grow/100,y-1), rent=mx.rent*g, str=mx.str*g, shoot=mx.shoot*g;
    const intY=interestYear(L,r,n,y), balStart=bal(L,r,n,(y-1)*12);
    const mi=(ln.pmi&&balStart>0.78*P?ln.pmi:0)/100*L+(ln.mip||0)/100*balStart; // PMI drops at 78% of price; FHA MIP stays
    if(y===1) insYr1=mi;
    const carry=pmt(L,r,n)*12+taxYr+insYr+maintYr+hoaYr+mi;
    const pre=rent+str+shoot-carry+(mx.ownerShare>0?V.rentAvoided*12*mx.ownerShare:0);
    let tax=0;
    const ownInt=(intY+(y===1?ptsCost:0))*dedShare;
    tax-=ownInt*Math.min(1,750000/L)*fed+ownInt*Math.min(1,1000000/L)*ca;      // mortgage interest (and points in year 1)
    tax-=Math.min(taxYr*dedShare,V.saltRoom)*fed+taxYr*dedShare*ca;              // property tax
    if(mx.rentedShare>0){
      const dep=basisBldg*mx.rentedShare/27.5; depTaken+=dep;
      const net=rent-(intY+taxYr+insYr+maintYr+hoaYr+mi)*mx.rentedShare-dep;
      if(net>0) tax+=net*ord; else suspended+=-net;                               // passive losses wait for the sale
    }
    if(mx.strNights){
      const sh=mx.ownerShare>0?mx.strNights/365:1;
      if(mx.ownerShare>0) tax+=Math.max(0,str-(intY+taxYr+insYr+maintYr+hoaYr)*sh)*ord;   // limited to income (your residence)
      else { const dep=basisBldg/27.5; depTaken+=dep; const net=str-(intY+taxYr+insYr+maintYr+hoaYr+mi)-dep; if(net>0) tax+=net*ord; else suspended+=-net; }
    }
    if(shoot) tax+=shoot*ord;
    const after=pre-tax; cum+=after; if(after<0) shortfall+=-after; yrs.push(after);
  }
  const out={note:mx.note,ln,dscr,incomeMo:income0/12,carryMo:(piMo*12+taxYr+insYr+maintYr+hoaYr+insYr1)/12,preMo:yrs.length?(income0-(piMo*12+taxYr+insYr+maintYr+hoaYr+insYr1))/12:0,cfMo:yrs[0]/12,cum,upfront};
  if(sale==null){ out.noSale=true; return out; }
  const saleCosts=sale*V.comm/100+V.stage+sale*tt+out.carryMo*V.saleMonths;
  const loanEnd=bal(L,r,n,Y*12);
  const gain=sale-saleCosts-(P+closing+poolCost-depTaken);
  const recap=Math.min(Math.max(gain,0),depTaken), rest=Math.max(0,gain-recap);
  const excluded=Math.min(rest*mx.ownerShare,mx.ownerShare>0?V.excl:0);
  const saleTax=recap*(V.recap/100+ca)+(rest-excluded)*cg-suspended*ord;
  const proceeds=sale-saleCosts-loanEnd-saleTax, invested=upfront+shortfall, profit=proceeds+cum-upfront;
  let mk=upfront*Math.pow(1+V.mkt/100,Y), mIn=upfront;
  yrs.forEach((a,i)=>{ if(a<0){ mk+=-a*Math.pow(1+V.mkt/100,Y-i-1); mIn+=-a; } });
  const mProfit=(mk-mIn)*(1-cg);
  return Object.assign(out,{sale,saleCosts,tt,proceeds,saleTax,profit,invested,roi:profit/invested,ann:Math.pow(Math.max(1e-9,1+profit/invested),1/Y)-1,mProfit,mRoi:mProfit/mIn,delta:profit-mProfit});
}

const ROWS=[
 ["Income /mo",s=>usd(s.incomeMo)],
 ["Cash flow /mo, pre-tax",s=>usd(s.preMo)],
 ["Cash flow /mo, after tax (yr 1)",s=>usd(s.cfMo)],
 ["5-yr after-tax cash flow",s=>usd(s.cum)],
 ["Sale proceeds after tax and loan",s=>s.noSale?"—":usd(s.proceeds)],
 ["Total cash put in",s=>s.noSale?"—":usd(s.invested)],
 ["Profit",s=>s.noSale?"—":usd(s.profit)],
 ["ROI, annualized",s=>s.noSale?"—":pct(s.ann)],
 ["Same cash in the market",s=>s.noSale?"—":usd(s.mProfit)],
 ["Home vs market",s=>s.noSale?"—":`<b class="${s.delta>=0?"pos":"neg"}">${s.delta>=0?"+":""}${usd(s.delta)}</b>`]
];

// Financing screen: every eligible path × loan; show what's competitive.
function screen(x,nUnits){
  const LN=loans(x,nUnits), base={}, all=[], hidden=[], inel=new Set();
  PATHS.forEach(([k])=>{ const b=LN.find(l=>l.id===(OWN.has(k)?"fix20":"inv25")); const r=evalPath(x,k,b); if(!r.na&&!r.zero&&!r.noSale) base[k]=r; });
  PATHS.forEach(([k,pl])=>LN.forEach(l=>{
    const r=evalPath(x,k,l); if(r.na){ if(!l.eligible) inel.add(l.label+": "+l.why); else if(r.dscr!=null) inel.add(`${l.label} for ${pl}: ${r.na}`); return; } if(r.zero||r.noSale) return;
    r.path=pl; r.kind=k;
    if(l.extra&&base[k]&&r.delta<=base[k].delta){ hidden.push(`${l.label} for ${pl}: ${l.extra} doesn't pay off (${usd(r.delta-base[k].delta)} vs no ${l.extra})`); return; }
    all.push(r);
  }));
  all.sort((a,b)=>b.delta-a.delta);
  const seen=new Set();
  const uniq=all.filter(r=>{ const k=r.ln.id+"|"+Math.round(r.profit); if(seen.has(k)) return false; seen.add(k); return true; });
  return {top:uniq.slice(0,6),hidden,inel:[...inel],n:uniq.length};
}

function card(x){
  const c=x.cf||{}, city=cityOf(x), rule=CITY[city]||null;
  const units=(c.units||[]).filter(u=>u&&u.rent>0), nUnits=Math.max(1,units.length);
  const base=loans(x,nUnits).find(l=>l.id==="fix20");
  const S={}; PATHS.forEach(([k])=>S[k]=evalPath(x,k,OWN.has(k)?base:loans(x,nUnits).find(l=>l.id==="inv25")));
  const live=S.live, P=x.price, Y=Math.max(1,Math.round(V.years));
  const piti=k=>pmt(P*.8,k/1200,V.term*12)+P*(V.ptax+V.ins)/1200;
  const head=`<div class="cfhead"><h3>${x.addr}</h3><p>${x.nbhd}${city&&city!==x.nbhd?` · ${city}`:""} · ${usd(P)}${x.stars?` · ${"★".repeat(x.stars)}${"☆".repeat(3-x.stars)}`:""}${x.votes!=null?` · ${x.votes} of 3 Yes`:""}</p></div>`;
  const pnote=x.pool==="pass"?"Has a pool: no pool cost; shoots possible":(c.pool_add?`${c.pool_add.note||""}`:"No pool and room/access not confirmed");
  const facts=`<dl class="cffacts">
   <div><dt>PITI /mo, 20% down</dt><dd>${usd(piti(V.rate))}<small>${usd(piti(V.rateLo))}–${usd(piti(V.rateHi))} at ${V.rateLo}–${V.rateHi}%</small></dd></div>
   <div><dt>PITI + maintenance /mo</dt><dd>${usd(piti(V.rate)+P*V.maint/1200+(c.hoa_mo||0))}</dd></div>
   <div><dt>Cash at close, 20% down</dt><dd>${usd(live.upfront||P*.2+P*V.closeBuy/100)}</dd></div>
   <div><dt>Rent, all units /mo</dt><dd>${units.length?usd(units.reduce((s,u)=>s+u.rent,0)):"—"}<small>${units.length?(units.length>1?`${units.length} units, `:"")+`avg of ${units.map(u=>u.n||0).reduce((a,b)=>a+b,0)} listings`:""}</small></dd></div>
   <div><dt>Airbnb at ${V.occ}% /mo, gross</dt><dd>${c.adr?usd(c.adr*365*V.occ/100/12):"—"}<small>${c.adr?`$${c.adr}/night`:""}</small></dd></div>
   <div><dt>Shoots /mo, net</dt><dd>${x.pool==="pass"?usd((V.psRate*V.psBook*V.psHrs*12*(1-V.psFee/100-V.psCost/100)+V.filmDays*V.filmRate)/12):"—"}<small>${x.pool==="pass"?"Peerspace + film days":"Needs a pool"}</small></dd></div>
   <div><dt>Resale in ${Y} yrs</dt><dd>${live.sale!=null?usd(live.sale):"—"}<small>${c.cagr5!=null?`${(c.cagr5*100).toFixed(1)}%/yr`:"No area trend yet"}</small></dd></div>
  </dl>`;
  const poolCtl=x.pool==="pass"?"":`<label class="cfpool"><input type="checkbox" data-k="${x.key}" ${poolNeeded(x)?"checked":""}> Add ${usd(V.pool)} pool build (this view only)</label>`;
  const th=PATHS.map(([k,l])=>{const t=S[k]; const why=t.na||(t.zero?`$0: ${t.note}`:""); return `<th scope="col">${l}${why?`<small>${why}</small>`:""}</th>`;}).join("");
  const body=ROWS.map(([l,f])=>`<tr><th scope="row">${l}</th>${PATHS.map(([k])=>{const s=S[k]; return `<td>${s.na||s.zero?`<span class="na">—</span>`:f(s)}</td>`;}).join("")}</tr>`).join("");
  const notes=PATHS.map(([k,l])=>S[k].note&&!S[k].zero&&!S[k].na?`<li><b>${l}:</b> ${S[k].note}</li>`:"").join("");
  // financing screen
  const sc=screen(x,nUnits);
  const fin=sc.top.length?`<h4>Financing screen <small>${sc.n} path × loan combinations; best ${sc.top.length} by profit vs the market</small></h4><div class="cfscroll"><table class="cftable cffin"><thead><tr><th>Path</th><th>Loan</th><th>Cash at close</th><th>Cash flow /mo after tax</th><th>DSCR</th><th>5-yr profit</th><th>ROI /yr</th><th>vs market</th></tr></thead><tbody>${sc.top.map((r,i)=>`<tr${i===0?' class="best"':""}><th scope="row">${r.path}</th><td>${r.ln.label}</td><td>${usd(r.upfront)}</td><td>${usd(r.cfMo)}</td><td>${r.dscr!=null?r.dscr.toFixed(2):"—"}</td><td>${usd(r.profit)}</td><td>${pct(r.ann)}</td><td><b class="${r.delta>=0?"pos":"neg"}">${r.delta>=0?"+":""}${usd(r.delta)}</b></td></tr>`).join("")}</tbody></table></div>${sc.hidden.length||sc.inel.length?`<details class="cfcomps"><summary>Not surfaced (${sc.hidden.length+sc.inel.length})</summary><ul>${sc.hidden.concat(sc.inel).map(h=>`<li>${h}</li>`).join("")}</ul></details>`:""}`:`<p class="cfmiss">Financing screen needs the area price trend; it fills when comps are added.</p>`;
  const src=[c.rent_src&&`Rent: ${c.rent_src}`,c.adr_src&&`Nightly: ${c.adr_src}`,c.cagr_src&&`Trend: ${c.cagr_src}`,rule&&`Transfer tax: ${rule.ttNote}`,c.str_note&&`Short-term rental: ${c.str_note}`].filter(Boolean);
  const comps=(c.units||[]).filter(u=>u.comps&&u.comps.length).map((u,i,arr)=>`<details class="cfcomps"><summary>Rent comps${arr.length>1?`, unit ${i+1} (${u.beds||"studio"} bd / ${u.baths} ba)`:""}: ${usd(u.rent)} average of ${u.n}</summary><ul>${u.comps.map(k=>`<li>${k.addr}: ${usd(k.rent)}, ${k.beds||"studio"} bd / ${k.baths??"?"} ba${k.sf?`, ${Number(k.sf).toLocaleString("en-US")} sf`:""} <span>(${k.src})</span></li>`).join("")}</ul></details>`).join("");
  const missing=!x.cf?`<p class="cfmiss">Comps not filled yet. The next daily or Thursday scan adds rent, nightly rate and area trend.</p>`:"";
  return `<article class="cfcard">${head}${missing}<p class="cfpoolnote">${pnote}</p>${poolCtl}${facts}${comps}<h4>Income paths <small>30-yr fixed, 20% down; investment paths on a 25% down investment loan</small></h4><div class="cfscroll"><table class="cftable"><thead><tr><th></th>${th}</tr></thead><tbody>${body}</tbody></table></div>${notes?`<ul class="cfnotes">${notes}</ul>`:""}${fin}${src.length?`<p class="cfsrc">${src.join(" · ")}${c.as_of?` (as of ${c.as_of})`:""}</p>`:""}</article>`;
}

let SCOPE=null; // "advance" | "starred" | "all"; null = advance if any, else starred
function shortlist(){
  const stars=window.__cfStars?window.__cfStars():new Map(), rej=window.__cfRejected?window.__cfRejected():new Set(), yes=window.__cfYes?window.__cfYes():new Map();
  const adv=CF.filter(x=>(yes.get(x.key)||0)>=2&&!rej.has(x.key)&&!x.out&&x.price);
  const sc=SCOPE||(adv.length?"advance":"starred");
  document.querySelectorAll(".cfscope button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.s===sc)));
  const L=sc==="advance"?adv:CF.filter(x=>(sc==="all"||(stars.get(x.key)||0)>0)&&!rej.has(x.key)&&!x.out&&x.price);
  return {sc,L:L.map(x=>Object.assign({},x,{stars:stars.get(x.key)||0,votes:yes.has(x.key)?yes.get(x.key):null})).sort((a,b)=>(b.votes||0)-(a.votes||0)||b.stars-a.stars||a.price-b.price)};
}
function render(){
  const {sc,L}=shortlist();
  const label={advance:"advancing (2 of 3 Yes)",starred:"starred",all:"listings"}[sc];
  root.innerHTML=L.length?L.map(card).join(""):`<p class="cfmiss">${sc==="advance"?"No listing has 2 of 3 Yes votes yet.":sc==="starred"?"Star a listing (any rating) to see its cash flow here.":"No listings."}</p>`;
  $("#cfCount").textContent=L.length?`${L.length} ${label}`:"";
}
root.addEventListener("change",e=>{ const k=e.target.dataset&&e.target.dataset.k; if(k){ POOL.set(k,e.target.checked); render(); } });
document.querySelectorAll(".cfscope button").forEach(b=>b.addEventListener("click",()=>{ SCOPE=b.dataset.s; render(); }));
window.__cfRender=render;
render();
})();
