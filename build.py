"""Build Listing check: run `python3 build.py` in this folder -> listing-check.html (one self-contained file to publish)."""
import re, html
# (area, address, price, url, extra dict)
import json

from datetime import datetime
from zoneinfo import ZoneInfo
_LA=ZoneInfo("America/Los_Angeles")
_MON={m:i for i,m in enumerate(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],1)}
_OHRE=re.compile(r"^(\w{3}) (\w{3}) (\d{1,2}), (\d{1,2})(?::(\d\d))?\s*(AM|PM)?\s*[–-]\s*(\d{1,2})(?::(\d\d))?\s*(AM|PM)$")
def oh_times(label, scan_date):
    """'Sat Nov 21, 11:30 AM–2:30 PM' -> [start_ms, end_ms, 'Sat Nov 21', '11:30 AM–2:30 PM'] in LA time, or None."""
    m=_OHRE.match(label.strip())
    if not m: print("WARN: open house label not parsed:", label); return None
    wd,mon,day,h1,m1,ap1,h2,m2,ap2=m.groups()
    sy,sm=int(scan_date[:4]),int(scan_date[5:7]); mo=_MON[mon]
    year=sy+1 if mo<sm-6 else sy
    def h24(h,ap): h=int(h)%12; return h+12 if ap=="PM" else h
    e=h24(h2,ap2)*60+int(m2 or 0)
    st=h24(h1,ap1 or ap2)*60+int(m1 or 0)
    if not ap1 and st>e: st=h24(h1,"AM")*60+int(m1 or 0)
    ms=lambda mins:int(datetime(year,mo,int(day),mins//60,mins%60,tzinfo=_LA).timestamp()*1000)
    return [ms(st),ms(e),f"{wd} {mon} {int(day)}",label.split(",",1)[1].strip()]
SCAN_DATE=json.load(open("data/listings.json"))["scan_date"]
def _load():
    j=json.load(open("data/listings.json"))
    out=[]
    for r in j["listings"]:
        x={}
        for k,v in r.items():
            if k in ("neighborhood","address","price","url"): continue
            if k=="open_houses": x["oh"]=[(o["sort"],o["label"]) for o in v]
            elif isinstance(v,dict) and "result" in v: x[k]=(v["result"],v["detail"])
            else: x[k]=v
        if r.get("out"): continue
        out.append((r["neighborhood"],r["address"],r["price"],r["url"],x))
    return out
L=_load()

E=html.escape
DIRS={"n","s","e","w","north","south","east","west"}
def key(a):
    t=re.sub(r'[^a-z0-9 ]',' ',a.lower()).split()
    rest=[w for w in t[1:] if w not in DIRS]
    return t[0]+"-"+rest[0]
def slug(a): return re.sub(r'[^a-z0-9]+','-',a.lower()).strip('-')
LBL={"pass":"Pass","check":"Check","fail":"Fail"}
def office(x):
    sf,lot=x.get("sf"),x.get("lot_sf")
    have=[f"{sf:,} sf" if sf else "living area not captured",f"{lot:,} sf lot" if lot else "lot not captured"]
    d=", ".join(have)
    if (sf and sf>=2400) or (lot and lot>=7000): return ("pass",d)
    if sf and lot: return ("fail",d+"; under both")
    return ("check",d)
def rows(price,x):
    ex=x.get("price_exempt")
    if price is None: p=("check","List price not found; listing link not found")
    elif ex and not 1300000<=price<=2750000: p=("pass",f"${price:,}, outside $1.3M–$2.75M; {ex}")
    elif price>2750000: p=("fail",f"${price:,}, above the $2.75M ceiling")
    elif price<1300000: p=("fail",f"${price:,}, below the $1.3M floor")
    elif price>2600000: p=("pass",f"${price:,}, above the $2.6M target but under the ceiling")
    else: p=("pass",f"${price:,}")
    size=x.get("size","Met scan minimums")
    return [
     ("Active listing","pass",f"Active in {datetime.strptime(SCAN_DATE,'%Y-%m-%d'):%b} {int(SCAN_DATE[8:])} scan"),
     ("Price $1.3M–$2.75M",*p),
     ("3+ bed, 2+ bath","pass",size),
     ("2,400+ sf or 7,000+ sf lot",*office(x)),
     ("Pool: full in-ground, or room for 18×20 with access",*x.get("pool",("pass","In-ground pool stated in listing"))),
     ("Grocery in walking distance",*x.get("grocery",("check","Not checked yet"))),
     ("Highly rated elementary within 2 mi",*x.get("school",("check","Not checked yet"))),
     ("Not a steep hillside",*x.get("terrain",("pass","Not flagged"))),
    ]+([("No HOA",*x["hoa"])] if x.get("hoa") else [])
LA_CITY={"Valley Village","Sherman Oaks","Van Nuys","North Hollywood / Toluca Lake","Studio City","Eagle Rock","Larchmont / Hancock Park","Silver Lake","Los Feliz","Fairfax / Melrose","Mar Vista","Cheviot Hills","Palms"}
def pmt(price):
    L=max(price-1000000,0); r=.073/12; n=360
    return L*r/(1-(1+r)**-n)
REF={"Sherman Oaks":(295,"AirDNA, Sherman Oaks")}
LA_REF=(267,"BNBCalc, Los Angeles")
PAS_REF=(197,"BNBCalc, Pasadena")
def exit_rows(area,price,x):
    m=pmt(price) if price is not None else None; goal=3*m if m is not None else None
    if area in LA_CITY:
        adr,src=REF.get(area,LA_REF); nights=120
        rule="City of LA: primary residence only, up to 120 nights a year."
    elif area=="Pasadena":
        adr,src=PAS_REF; nights=90
        rule="Pasadena: you must live there 9+ months a year; whole-home rentals up to 90 nights, unlimited if you stay on site."
    else:
        adr=None
    if adr and goal is None:
        strd=("check",rule+" List price not found, so break-even can't be computed.")
    elif adr:
        be=goal/nights
        if be<=adr: st="pass"; v=f"Break-even is ${be:,.0f} a night over {nights} nights, at or below the area average of ${adr} ({src})."
        elif be<=2*adr: st="check"; v=f"Break-even is ${be:,.0f} a night over {nights} nights, above the area average of ${adr} ({src}). Pool homes usually beat that average, so confirm with comps."
        else: st="fail"; v=f"Break-even is ${be:,.0f} a night over {nights} nights, more than twice the area average of ${adr} ({src})."
        strd=(st,rule+" "+v+" Renting the whole home means moving out on those nights; an ADU avoids that.")
    elif area=="Glendale":
        strd=("check","Glendale: hosted only, so you stay on site during every booking (room rentals, not the whole home). No yearly night cap. Income from room rentals not checked yet.")
    elif area=="Burbank":
        strd=("fail","Burbank doesn’t allow stays under 30 days, hosted or not.")
    elif area=="La Cañada Flintridge":
        strd=("fail","La Cañada Flintridge doesn’t allow short-term rentals.")
    elif area=="La Crescenta":
        strd=("check","Unincorporated LA County: primary residence only, with a yearly county registration. Night limits and rates not checked yet.")
    else:
        strd=("check","Rules not checked yet.")
    if x.get("str_") and strd[0]!="fail": strd=("check",x["str_"][1]+". "+strd[1])
    va=x.get("va",("check","Lot and house size not captured in the scan; ADU room not checked yet"))
    return m,goal,[
     ("Airbnb income covering 3 months of mortgage",*strd),
     ("Forced value add (ADU, addition, fixer, lot)",*va),
    ]
def exit_verdict(er):
    s=[q[1] for q in er]
    return "pass" if "pass" in s else "fail" if all(q=="fail" for q in s) else "check"
EVT={"pass":"Yes","check":"Needs check","fail":"No"}
def verdict(r):
    s=[x[1] for x in r]
    return "fail" if "fail" in s else "check" if "check" in s else "pass"
VT={"pass":"Fit","check":"Needs check","fail":"Not a fit"}
panels=[];opts=[];groups={};keys={}
for area,addr,price,url,x in L:
    sid=slug(addr); r=rows(price,x); v=verdict(r)
    n=sum(1 for q in r if q[1]=="check")
    sub={"pass":"Meets every filter.","check":f"{n} filter{'s' if n>1 else ''} still to confirm.","fail":"Fails at least one filter."}[v]
    m,goal,er=exit_rows(area,price,x); ev=exit_verdict(er)
    esub={"pass":"At least one exit path is there.","check":"No exit path confirmed yet.","fail":"No exit path found."}[ev]
    oh=x.get("oh",[]); nxt=oh[0][1] if oh else None
    keys[key(addr)]=sid
    opts.append(f'<option value="{E(addr)}, {E(area)}">')
    ohtxt=f"Open house {nxt}" if nxt else "No open house found"
    newtag=('<span class="new">New</span> ' if x.get("new") else "")+('<span class="new fx">Fixer</span> ' if x.get("fixer") else "")
    prio=(0 if office(x)[0]=="pass" else 1) if x.get("fixer") else 2
    ohs=[t for t in (oh_times(lab,SCAN_DATE) for _,lab in oh) if t]
    li=f'<li data-key="{key(addr)}" data-price="{price if price is not None else ""}" data-fx="{1 if x.get('fixer') else 0}" data-v="{v}" data-ev="{ev}" data-ohs="{E(json.dumps(ohs))}"><a href="#{sid}"><span class="dot {v}" aria-hidden="true"></span><span class="addr">{newtag}{E(addr)}</span><span class="meta">{f"${price/1e6:.2f}M" if price is not None else "Price unknown"}. Exit: {EVT[ev].lower()}</span><span class="vt {v}">{VT[v]}</span></a><button class="x" type="button" aria-label="Reject {E(addr)}" title="Reject">×</button></li>'
    groups.setdefault(area,[]).append(((oh[0][0] if oh else 99999,prio),("Open house "+nxt) if nxt else "No upcoming open house",li))
    tr="".join(f'<tr><th scope="row">{E(k)}</th><td><span class="tag {s}">{LBL[s]}</span></td><td>{E(d)}</td></tr>' for k,s,d in r)
    etr="".join(f'<tr><th scope="row">{E(k)}</th><td><span class="tag {s}">{LBL[s]}</span></td><td>{E(d)}</td></tr>' for k,s,d in er)
    ohp=("Open houses: "+"; ".join(o[1] for o in oh)+".") if oh else "No open house found."
    note=f'<p class="note">{E(ohp)}{(" "+E(x["note"])) if x.get("note") else ""}</p>'
    link=f'<a href="{E(url)}" rel="noopener" target="_blank">Open listing</a>' if url else '<span class="muted">Listing link not captured in scan</span>'
    panels.append(f'''<article class="panel" id="{sid}" data-key="{key(addr)}" tabindex="-1">
<p class="where">{E(area)}</p><h2>{E(addr)}</h2><div class="stars" role="group" aria-label="Your rating"><button type="button" class="star" data-n="1" aria-label="1 of 3 stars" aria-pressed="false">★</button><button type="button" class="star" data-n="2" aria-label="2 of 3 stars" aria-pressed="false">★</button><button type="button" class="star" data-n="3" aria-label="3 of 3 stars" aria-pressed="false">★</button><span class="shint">Each star is one person’s yes; 2 moves it to financing.</span></div>
<div class="offerbox" aria-live="polite"></div>
{note}
<details class="dtl sup"{"" if v=="pass" else " open"}><summary><span class="sk">Basics</span> <span class="tag {v}">{VT[v]}</span> <span class="ss">{sub}</span></summary>
<div class="scroll"><table><thead><tr><th scope="col">Filter</th><th scope="col">Result</th><th scope="col">Details</th></tr></thead><tbody>{tr}</tbody></table></div></details>
<details class="dtl sup"{"" if ev=="pass" else " open"}><summary><span class="sk">Exit</span> <span class="tag {ev}">{EVT[ev]}</span> <span class="ss">{esub}</span></summary>
<p class="ss2">{f"Mortgage is about ${m:,.0f} a month, so 3 months is about ${goal:,.0f}." if m is not None else "Mortgage not computed: list price not found."}</p>
<div class="scroll"><table><thead><tr><th scope="col">Path</th><th scope="col">Result</th><th scope="col">Details</th></tr></thead><tbody>{etr}</tbody></table></div></details>
<details class="dtl sup"><summary><span class="sk">Financing detail</span> <span class="ss">Income paths, loan screen, comps</span></summary><div class="finbox"></div></details>
<p class="links">{link}</p></article>''')
items=[]
for area,lis in groups.items():
    lis.sort(key=lambda t:t[0])
    slots=[]
    for _,lab,l in lis:
        if slots and slots[-1][0]==lab: slots[-1][1].append(l)
        else: slots.append((lab,[l]))
    body="".join(f'<div class="slot"><p class="slotlbl">{E(lab)}</p><ul>'+"".join(ls)+'</ul></div>' for lab,ls in slots)
    items.append(f'<div class="nb" data-nbhd="{E(area)}"><h3>{E(area)}</h3>{body}</div>')
import os
_js=open("src/app.js").read().replace("%SHEET_URL%",json.dumps(os.environ.get("LISTING_SHEET_URL",""))).replace("%SHEET_TOKEN%",json.dumps(os.environ.get("LISTING_SHEET_TOKEN","")))
def _cfrow(t):
    nb,addr,price,url,x=t; pool=x.get("pool"); r=rows(price,x)
    return {"key":key(addr),"addr":addr,"nbhd":nb,"price":price,"pool":pool[0] if pool else "pass","cf":x.get("cf"),"val":x.get("val"),"sf":x.get("sf"),
            "v":verdict(r),"checks":[k for k,st,_ in r if st=="check"],"fails":[k for k,st,_ in r if st=="fail"],"oh":[o[1] for o in x.get("oh",[])]}
_cf=json.dumps([_cfrow(t) for t in L],ensure_ascii=False).replace("</","<\\/")
_js=_js.replace("%VOTERS%",json.dumps(json.load(open("data/listings.json")).get("voters",["Voter 1","Voter 2","Voter 3"]),ensure_ascii=False))
_js+="\n"+open("src/cashflow.js").read().replace("%CFDATA%",_cf).replace("%AREA%",json.dumps(json.load(open("data/listings.json")).get("area_trend",{}),ensure_ascii=False))
_sd=datetime.strptime(SCAN_DATE,"%Y-%m-%d")
tpl=open("src/index.template.html").read().replace("%SCANLABEL%",f"{_sd:%b} {_sd.day}").replace("%CSS%",open("src/styles.css").read()).replace("%JS%",_js)
out=tpl.replace("%OPTS%","".join(opts)).replace("%ITEMS%","\n".join(items)).replace("%PANELS%","\n".join(panels)).replace("%COUNT%",str(len(L))).replace("%KEYS%",__import__("json").dumps(keys))
open("listing-check.html","w").write(out)
print(len(out))
