// ---- Cash flow: starred listings (any rating). Inputs live only in this page view; nothing is saved.
(function(){
const CF=%CFDATA%;
const AREA=%AREA%;
const trendOf=x=>(x.cf&&x.cf.cagr5!=null)?{cagr:x.cf.cagr5,src:x.cf.cagr_src||""}:(AREA[x.nbhd]||AREA._default||null);
const $=s=>document.querySelector(s);

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
 ["impute","Count rent saved by living there",1,"1 = yes, 0 = no","Income","Owning replaces rent: uses this home’s own rent comps for the part you live in"],
 ["rentAvoided","Rent saved, override",0,"$/mo","Income","0 = use this home’s rent comps"],
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
reset.addEventListener("click",()=>{ IN.forEach(r=>{ $("#cf_"+r[0]).value=r[2]; V[r[0]]=r[2]; }); POOL.clear(); render(true); });
menu.append(reset);
menu.addEventListener("input",e=>{ const id=e.target.id.replace(/^cf_/,""); if(id in V){ const n=parseFloat(e.target.value); V[id]=isFinite(n)?n:0; render(true); } });
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
  const compRent=((c.units||[]).filter(u=>u&&u.rent>0)).reduce((a,u)=>a+u.rent,0);
  const avoidMo=mx.ownerShare>0?(V.rentAvoided>0?V.rentAvoided*mx.ownerShare:(V.impute?compRent*mx.ownerShare:0)):0;
  let dscr=null;
  if(ln.dscr){ const gross=(mx.rent/((1-V.vac/100)*(1-V.mgmt/100))||mx.str/(1-V.strCost/100))/12; dscr=gross/(piMo+(taxYr+insYr+hoaYr)/12); if(dscr<V.dscrMin) return {na:`DSCR ${dscr.toFixed(2)} is under ${V.dscrMin}`,dscr}; }
  const tr=trendOf(x), cagr=tr?tr.cagr:null, sale=cagr!=null?P*Math.pow(1+cagr,Y):null;
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
    const pre=rent+str+shoot-carry+avoidMo*12*g;
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
  const out={note:mx.note,ln,dscr,avoidMo,incomeMo:income0/12,carryMo:(piMo*12+taxYr+insYr+maintYr+hoaYr+insYr1)/12,preMo:yrs.length?(income0+avoidMo*12-(piMo*12+taxYr+insYr+maintYr+hoaYr+insYr1))/12:0,cfMo:yrs[0]/12,cum,upfront};
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
 ["Rent saved /mo",s=>s.avoidMo?usd(s.avoidMo):"—"],
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
  const head=`<div class="cfhead"><h3>${x.addr}</h3><p>${x.nbhd}${city&&city!==x.nbhd?` · ${city}`:""} · ${usd(P)}${x.stars?` · ${"★".repeat(x.stars)}${"☆".repeat(3-x.stars)}`:""}</p></div>`;
  const pnote=x.pool==="pass"?"Has a pool: no pool cost; shoots possible":(c.pool_add?`${c.pool_add.note||""}`:"No pool and room/access not confirmed");
  const facts=`<dl class="cffacts">
   <div><dt>PITI /mo, 20% down</dt><dd>${usd(piti(V.rate))}<small>${usd(piti(V.rateLo))}–${usd(piti(V.rateHi))} at ${V.rateLo}–${V.rateHi}%</small></dd></div>
   <div><dt>PITI + maintenance /mo</dt><dd>${usd(piti(V.rate)+P*V.maint/1200+(c.hoa_mo||0))}</dd></div>
   <div><dt>Cash at close, 20% down</dt><dd>${usd(live.upfront||P*.2+P*V.closeBuy/100)}</dd></div>
   <div><dt>Rent, all units /mo</dt><dd>${units.length?usd(units.reduce((s,u)=>s+u.rent,0)):"—"}<small>${units.length?(units.length>1?`${units.length} units, `:"")+`avg of ${units.map(u=>u.n||0).reduce((a,b)=>a+b,0)} listings`:""}</small></dd></div>
   <div><dt>Airbnb at ${V.occ}% /mo, gross</dt><dd>${c.adr?usd(c.adr*365*V.occ/100/12):"—"}<small>${c.adr?`$${c.adr}/night`:""}</small></dd></div>
   <div><dt>Shoots /mo, net</dt><dd>${x.pool==="pass"?usd((V.psRate*V.psBook*V.psHrs*12*(1-V.psFee/100-V.psCost/100)+V.filmDays*V.filmRate)/12):"—"}<small>${x.pool==="pass"?"Peerspace + film days":"Needs a pool"}</small></dd></div>
   <div><dt>Resale in ${Y} yrs</dt><dd>${live.sale!=null?usd(live.sale):"—"}<small>${trendOf(x)?`${(trendOf(x).cagr*100).toFixed(1)}%/yr${c.cagr5==null?" (area)":""}`:"No area trend yet"}</small></dd></div>
  </dl>`;
  const poolCtl=x.pool==="pass"?"":`<label class="cfpool"><input type="checkbox" data-k="${x.key}" ${poolNeeded(x)?"checked":""}> Add ${usd(V.pool)} pool build (this view only)</label>`;
  const th=PATHS.map(([k,l])=>{const t=S[k]; const why=t.na||(t.zero?`$0: ${t.note}`:""); return `<th scope="col">${l}${why?`<small>${why}</small>`:""}</th>`;}).join("");
  const body=ROWS.map(([l,f])=>`<tr><th scope="row">${l}</th>${PATHS.map(([k])=>{const s=S[k]; return `<td>${s.na||s.zero?`<span class="na">—</span>`:f(s)}</td>`;}).join("")}</tr>`).join("");
  const notes=PATHS.map(([k,l])=>S[k].note&&!S[k].zero&&!S[k].na?`<li><b>${l}:</b> ${S[k].note}</li>`:"").join("");
  // financing screen
  const sc=screen(x,nUnits);
  const fin=sc.top.length?`<h4>Financing screen <small>${sc.n} path × loan combinations; best ${sc.top.length} by profit vs the market</small></h4><div class="cfscroll"><table class="cftable cffin"><thead><tr><th>Path</th><th>Loan</th><th>Cash at close</th><th>Cash flow /mo after tax</th><th>DSCR</th><th>5-yr profit</th><th>ROI /yr</th><th>vs market</th></tr></thead><tbody>${sc.top.map((r,i)=>`<tr${i===0?' class="best"':""}><th scope="row">${r.path}</th><td>${r.ln.label}</td><td>${usd(r.upfront)}</td><td>${usd(r.cfMo)}</td><td>${r.dscr!=null?r.dscr.toFixed(2):"—"}</td><td>${usd(r.profit)}</td><td>${pct(r.ann)}</td><td><b class="${r.delta>=0?"pos":"neg"}">${r.delta>=0?"+":""}${usd(r.delta)}</b></td></tr>`).join("")}</tbody></table></div>${sc.hidden.length||sc.inel.length?`<details class="cfcomps"><summary>Not surfaced (${sc.hidden.length+sc.inel.length})</summary><ul>${sc.hidden.concat(sc.inel).map(h=>`<li>${h}</li>`).join("")}</ul></details>`:""}`:`<p class="cfmiss">Financing screen needs the area price trend; it fills when comps are added.</p>`;
  const src=[c.rent_src&&`Rent: ${c.rent_src}`,c.adr_src&&`Nightly: ${c.adr_src}`,trendOf(x)&&`Trend: ${trendOf(x).src}`,rule&&`Transfer tax: ${rule.ttNote}`,c.str_note&&`Short-term rental: ${c.str_note}`].filter(Boolean);
  const comps=(c.units||[]).filter(u=>u.comps&&u.comps.length).map((u,i,arr)=>`<details class="cfcomps"><summary>Rent comps${arr.length>1?`, unit ${i+1} (${u.beds||"studio"} bd / ${u.baths} ba)`:""}: ${usd(u.rent)} average of ${u.n}</summary><ul>${u.comps.map(k=>`<li>${k.addr}: ${usd(k.rent)}, ${k.beds||"studio"} bd / ${k.baths??"?"} ba${k.sf?`, ${Number(k.sf).toLocaleString("en-US")} sf`:""} <span>(${k.src})</span></li>`).join("")}</ul></details>`).join("");
  const missing=!x.cf?`<p class="cfmiss">Comps not filled yet. The next daily or Thursday scan adds rent, nightly rate and area trend.</p>`:"";
  return `<article class="cfcard">${head}${missing}<p class="cfpoolnote">${pnote}</p>${poolCtl}${facts}${comps}<h4>Income paths <small>30-yr fixed, 20% down; investment paths on a 25% down investment loan</small></h4><div class="cfscroll"><table class="cftable"><thead><tr><th></th>${th}</tr></thead><tbody>${body}</tbody></table></div>${notes?`<ul class="cfnotes">${notes}</ul>`:""}${fin}${src.length?`<p class="cfsrc">${src.join(" · ")}${c.as_of?` (as of ${c.as_of})`:""}</p>`:""}</article>`;
}

// ---- valuation: fair value from sold comps, break-even vs the market, ceiling = the lower one
const TODAY=new Date();
const pctl=(a,q)=>{ const b=[...a].sort((x,y)=>x-y); if(!b.length) return null; const i=(b.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i); return b[lo]+(b[hi]-b[lo])*(i-lo); };
const hasRent=x=>(((x.cf||{}).units||[]).some(u=>u&&u.rent>0));
const nUnitsOf=x=>Math.max(1,(((x.cf||{}).units||[]).filter(u=>u&&u.rent>0)).length);
function bestAt(x,P){ const t=screen(Object.assign({},x,{price:P}),nUnitsOf(x)).top[0]; return t||null; }
function fairValue(x){
  const v=x.val||{}, comps=(v.comps||[]).filter(c=>c.price>0);
  if(!comps.length) return null;
  const psf=comps.filter(c=>c.sf>0).map(c=>c.price/c.sf);
  let mid,lo,hi,basis;
  if(x.sf&&psf.length>=3){ mid=pctl(psf,.5)*x.sf; lo=pctl(psf,.25)*x.sf; hi=pctl(psf,.75)*x.sf; basis=`median $${Math.round(pctl(psf,.5))}/sf × ${x.sf.toLocaleString("en-US")} sf`; }
  else { const pr=comps.map(c=>c.price); mid=pctl(pr,.5); lo=pctl(pr,.25); hi=pctl(pr,.75); basis="median sold price"; }
  const spread=lo?hi/lo:9, n=comps.length;
  const conf=n>=5&&spread<1.25?"High":n>=3&&spread<1.5?"Medium":"Low";
  return {mid,lo,hi,n,basis,conf,spread};
}
function breakEven(x){
  const L=x.price; let lo=L*0.4, hi=L*1.3;
  const f=P=>{ const t=bestAt(x,P); return t?t.delta:-Infinity; };
  if(f(hi)>=0) return {p:hi,above:true};
  if(f(lo)<0) return {p:null,below:true};
  for(let i=0;i<22;i++){ const m=(lo+hi)/2; if(f(m)>=0) lo=m; else hi=m; }
  return {p:lo};
}
const OFFER=new Map();
function offer(x){
  if(OFFER.has(x.key)) return OFFER.get(x.key);
  const v=x.val||{}, L=x.price, stars=(window.__cfStars?window.__cfStars():new Map()).get(x.key)||0;
  const fv=fairValue(x), be=trendOf(x)&&hasRent(x)?breakEven(x):null;
  const ceil=be&&be.below?null:Math.min(...[fv&&fv.mid,be&&be.p].filter(n=>n>0));
  const hist=v.list_hist||[], listed=hist.filter(h=>/list/i.test(h.event)), first=v.list_date||(listed[0]||{}).date;
  const dom=first?Math.round((TODAY-new Date(first))/864e5):null;
  const cuts=hist.filter(h=>/cut/i.test(h.event)).length+(listed.length>1&&listed[listed.length-1].price<listed[0].price?1:0);
  const lev=Math.min(.04,(dom>60?.02:0)+(cuts?.02:0));
  let open=null;
  if(isFinite(ceil)){ open=Math.min(ceil,fv?fv.lo:ceil)*(1-lev); open=Math.min(open,L); }
  const blockers=[];
  (x.fails||[]).forEach(f=>blockers.push({k:"fail",t:`Fails: ${f}`}));
  (x.checks||[]).forEach(f=>blockers.push({k:"check",t:`Confirm: ${f}`}));
  if(stars<2) blockers.push({k:"check",t:`Group: ${stars} of 2 stars needed to move forward`});
  if(!fv) blockers.push({k:"check",t:"No sold comps yet; fair value unknown"});
  if(!hasRent(x)) blockers.push({k:"check",t:"No rent comps yet; can’t test the price against the market"});
  if(be&&be.below) blockers.push({k:"fail",t:"No price above 40% of list beats the market return"});
  if(v.status&&!/^active$/i.test(v.status)) blockers.push({k:"check",t:`Status: ${v.status}`});
  const pass=(x.fails||[]).length>0||(be&&be.below)||(isFinite(ceil)&&ceil<0.85*L);
  const verdict=pass?"pass-on":blockers.length?"not-yet":"ready";
  const at=open?bestAt(x,open):null;
  const o={fv,be,ceil:isFinite(ceil)?ceil:null,open,dom,cuts,lev,blockers,verdict,at,stars,hist};
  OFFER.set(x.key,o); return o;
}
const m1=n=>n==null?"—":"$"+(n>=1e6?(n/1e6).toFixed(2)+"M":Math.round(n/1000)+"k");
window.__cfOffer=key=>{
  const x0=CF.find(c=>c.key===key);
  if(!x0) return `<div class="offer not-yet"><p class="olabel">Not yet</p><p class="oline">New address: price, comps and financing come with the next scan.</p></div>`;
  if(!x0.price) return `<div class="offer not-yet"><p class="olabel">Not yet</p><p class="oline">List price not found, so no offer can be framed.</p></div>`;
  const x=Object.assign({},x0), o=offer(x), L=x.price, v=x.val||{};
  const lbl={ready:"Ready to offer","not-yet":`Not yet: ${o.blockers.length} to resolve`,"pass-on":"Pass"}[o.verdict];
  const line=o.verdict==="pass-on"&&o.open?`Pass at list ${m1(L)}. Worth it only at ${m1(o.open)}–${m1(o.ceil)}, ${Math.round((1-o.ceil/L)*100)}% under list.`:o.verdict==="pass-on"&&!o.open?`List ${m1(L)}. ${o.be&&o.be.below?"No price makes it beat the market.":`Ceiling ${m1(o.ceil)} is ${Math.round((1-o.ceil/L)*100)}% under list.`}`
    :o.open?`Offer ${m1(o.open)}–${m1(Math.min(o.ceil,Math.max(o.open,o.ceil)))} · walk away above ${m1(o.ceil)} · list ${m1(L)}`:`List ${m1(L)} · ceiling needs ${o.fv?"the area trend":"sold comps"}`;
  const beTxt=!o.be?"—":o.be.below?"None":o.be.above?`${m1(o.be.p)}+`:m1(o.be.p);
  const lev=[o.dom!=null?`${o.dom} days on market`:null,o.cuts?`${o.cuts} price cut${o.cuts>1?"s":""}`:null].filter(Boolean).join(", ")||"No leverage signals";
  const t=o.at;
  const tiles=`<dl class="otiles">
   <div><dt>Fair value (comps)</dt><dd>${o.fv?m1(o.fv.mid):"—"}<small>${o.fv?`${m1(o.fv.lo)}–${m1(o.fv.hi)}, ${o.fv.n} sales, ${o.fv.conf.toLowerCase()} confidence`:"No sold comps yet"}</small></dd></div>
   <div><dt>Break-even vs market</dt><dd>${beTxt}<small>Highest price where the best path matches ${V.mkt}%/yr</small></dd></div>
   <div class="key"><dt>Ceiling</dt><dd>${m1(o.ceil)}<small>Lower of the two</small></dd></div>
   <div><dt>Leverage</dt><dd>${o.lev?`−${Math.round(o.lev*100)}%`:"None"}<small>${lev}</small></dd></div>
  </dl>`;
  const afford=t?`<h4 class="oh4">At the opening offer of ${m1(o.open)}</h4><dl class="otiles">
   <div><dt>Cash at close</dt><dd>${m1(t.upfront)}</dd></div>
   <div><dt>Monthly, after tax</dt><dd class="${t.cfMo<0?"neg":"pos"}">${t.cfMo<0?"(":""}$${Math.round(Math.abs(t.cfMo)).toLocaleString("en-US")}${t.cfMo<0?")":""}</dd></div>
   <div><dt>5-yr vs market</dt><dd class="${t.delta<0?"neg":"pos"}">${t.delta>=0?"+":"−"}${m1(Math.abs(t.delta))}</dd></div>
   <div><dt>Best path</dt><dd class="small">${t.path}<small>${t.ln.label}</small></dd></div>
  </dl>`:"";
  const ohs=(x.oh||[]).length?`Next open house: ${x.oh[0]}`:"No open house scheduled";
  const blk=`<h4 class="oh4">${o.blockers.length?"To resolve before an offer":"Nothing blocking"}</h4><ul class="oblk">${o.blockers.map(b=>`<li class="${b.k}">${b.t}</li>`).join("")}<li class="info">${ohs}</li></ul>`;
  const comps=(v.comps||[]).length?`<details class="cfcomps"><summary>Sold comps: ${v.comps.length} sales${o.fv?`, ${o.fv.basis}`:""}</summary><ul>${v.comps.map(c=>`<li>${c.addr}: ${m1(c.price)} on ${c.date}, ${c.beds} bd / ${c.baths} ba${c.sf?`, ${c.sf.toLocaleString("en-US")} sf, $${Math.round(c.price/c.sf)}/sf`:""} <span>(${c.src})</span></li>`).join("")}</ul>${(v.avm||[]).length?`<p class="cfsrc">Automated estimates: ${v.avm.map(a=>`${a.src} ${m1(a.value)}`).join(" · ")}</p>`:""}${o.hist.length?`<p class="cfsrc">Listing history: ${o.hist.map(h=>`${h.date} ${m1(h.price)} (${h.event})`).join(" · ")}</p>`:""}${v.note?`<p class="cfsrc">${v.note}</p>`:""}</details>`:"";
  return `<div class="offer ${o.verdict}"><p class="olabel">${lbl}</p><p class="oline">${line}</p></div>${tiles}${afford}${blk}${comps}`;
};

// ---- hooks for the table and the drawer
const BEST=new Map(); // key -> {delta,label}; cleared when inputs or votes change
function rowX(key){ const x=CF.find(c=>c.key===key); if(!x) return null; const stars=window.__cfStars?window.__cfStars():new Map(), yes=window.__cfYes?window.__cfYes():new Map(); return Object.assign({},x,{stars:stars.get(key)||0,votes:yes.has(key)?yes.get(key):null}); }
window.__cfBest=key=>{
  if(BEST.has(key)) return BEST.get(key);
  const x=rowX(key); let b=null;
  if(x&&x.price&&!x.out&&trendOf(x)&&hasRent(x)){ const u=(((x.cf||{}).units||[]).filter(u=>u&&u.rent>0)).length; const t=screen(x,Math.max(1,u)).top[0]; if(t) b={delta:t.delta,label:`${t.path}, ${t.ln.label}`}; }
  BEST.set(key,b); return b;
};
window.__cfCard=key=>{
  const x=rowX(key);
  if(!x) return `<h3 class="sec">Financing</h3><p class="cfmiss">New address: financing appears after the next scan fills its price and comps.</p>`;
  if(!x.price) return `<h3 class="sec">Financing</h3><p class="cfmiss">List price not found, so financing can’t be modeled yet.</p>`;
  const yes=x.votes||0;
  return `<h3 class="sec">Financing</h3>${yes>=2?"":`<p class="cfgate">Shown for every listing. A listing moves to financing at 2 stars; this one has ${yes}.</p>`}${card(x)}`;
};
function render(clear){
  if(clear){ BEST.clear(); OFFER.clear(); }
  if(window.__tableRefresh) window.__tableRefresh();
  if(window.__refreshFin) window.__refreshFin();
}
document.addEventListener("change",e=>{ const k=e.target.dataset&&e.target.closest(".finbox")&&e.target.dataset.k; if(k){ POOL.set(k,e.target.checked); render(true); } });
window.__cfRender=()=>render(false);
render(true);
})();
