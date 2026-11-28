# Listing check v8.13.0 — PRD

Nov 22, 2026 · Exported from the Claude Doc "Listing check v8.2.0 — PRD"

## Overview

Listing check tells a home buyer, in one tap, whether an LA listing fits their needs and whether it has a way out. It is a single hosted page, built from the weekly listing scan.

**Problem.** The buyer is searching for a primary residence with a pool, $1.3M–$2.75M, across 14 LA neighborhoods (Valley Village dropped by the buyer, Nov 26, 2026; Sherman Oaks, Van Nuys and Cheviot Hills dropped Nov 27, 2026). Scans skip dropped neighborhoods; addresses entered there still get checked. Each week brings about 36 candidate listings, and judging each one means checking 8 filters by hand across listing sites, maps and school rankings. A wrong pick is costly, so each home also needs an exit: a forced value add, or Airbnb income worth 3 months of mortgage.

**Who it's for.** The buyer and anyone they share the link with, such as a spouse or agent. Use is weekly, around open houses: Thursday twilight and the weekend.

## Instructions for Claude

Read this section before changing Listing check. The rest of the PRD is the spec; this section is how to work on it.

**Role.** You maintain one hosted page for a home buyer. Work in small increments: keep the happy path working first (enter or pick a listing, see its verdict and table), then add other paths in order of value to the buyer. Build only what a request asks for.

**Sources of truth**

| What | Where |
| --- | --- |
| Live page | `index.html` in the repo, served by GitHub Pages and encrypted with StatiCrypt. The GitHub Action "Build and encrypt page" rebuilds it from `src/` and `data/` on every push to main. |
| Repository | GitHub `bd3vani/homein2027`. The weekly scan opens a pull request here. |
| Portable bundle | This folder: `build.py`, `src/` (template, CSS, JS), `data/listings.json`, `data/saved-user-data.json`, this PRD and README.md. |
| Weekly scan | Scheduled task, Thursdays 9:47 AM Pacific, so Thursday twilight open houses are caught. |
| Scan data and buyer criteria | Project file claude_prospecting-handoff.md (if present) |
| Spec and version history | This PRD |
| Shared data and Starred analysis | [Google Sheet](https://docs.google.com/spreadsheets/d/1LYYPUgIz2QuCC12P-3ufATq0tb3jcv9CFPP1ldBKR8g/edit?usp=sharing). Its bound Apps Script (`apps-script/Code.gs`) stores added, rejected and starred listings and keeps a Starred tab of 3-star listings. |

**Hard rules**

- MUST build with HTML, CSS and JavaScript. The only outside service is the Google Apps Script web app on the Starred analysis sheet.
- MUST NOT add other connectors or third-party APIs, or fetch any other site from the page.
- MUST NOT commit the plain built page (`listing-check.html`), the StatiCrypt password or the Sheet token. The repo is public; only the encrypted `index.html` is committed. Secrets live in GitHub Actions secrets: `STATICRYPT_PASSWORD`, `LISTING_SHEET_URL`, `LISTING_SHEET_TOKEN`.
- MUST update the existing page by merging to main. Never publish a second copy.
- MUST bump the header label by 0.1.0 for each shipped change (v8.2.0 → v8.3.0) and add a Version history row.
- MUST keep the database collections and key format below unchanged. Renaming either loses the buyer's added, rejected and starred listings.
- MUST keep rejected listings in the weekly report data; rejection only hides them on the page.
- MUST NOT invent listing facts. An unknown value is "Not checked yet" with a Check result.
- MUST cite rules and rates from pages you actually opened, with the as-of date.

**Standing scan step: cash-flow comps.** Every scheduled scan (daily and Thursday) also reads the Sheet's "stars" tab. For each starred listing (any rating, not removed) with no `cf` object in `data/listings.json`, research and add `cf`: city; units [{beds, baths, rent}] from rental comps; rent_src; adr (whole-home nightly rate for that size and area, from AirDNA, AirROI or BNBCalc); adr_src; cagr5 (neighborhood or city 5-year annual price growth from Zillow ZHVI or Redfin, as a decimal); cagr_src; pool_add {room, access, note} when there's no pool (true/false only when confirmed); hoa_mo; str_note; as_of. Cite only pages you opened and leave out what you can't find. List them in the PR under "Cash-flow comps added".

**Standing scan step: valuation.** For every listing with 2+ stars that has no `val`, add `val`: status; list_date; list_hist (each listing, relist and price cut with date and price); avm (Zillow/Redfin/Trulia estimates); comps = 5–7 recent sales (last 12 months) within about 1 mile with similar beds, baths and size, each with address, price, date, beds, baths, sf and source; note on anything that skews value (fixer, location edge). Cite only pages you opened.

**Data contract**

- Listing key: lowercase the address, drop punctuation, then join the street number and the first following word that isn't N, S, E, W, North, South, East or West. Example: "1163 N Geneva St" → `1163-geneva`.
- Database collections, one document per listing, document id = key:
    - `added`: key, street, nbhd, why, input, added (ISO date)
    - `removed`: key, street, removed (ISO date). Delete the document to restore.
    - `stars`: key, street, stars (0–3), at (ISO date)
- Storage order: Claude artifact database if present, else the Apps Script web app (GET `?t=TOKEN` returns all three collections; POST `{token, op: set|delete, coll, key, doc}` writes one), else the viewer's browser. The page polls the sheet every 30 seconds.

**Verdict logic**

- Each row is pass, check or fail.
- Needs verdict: any fail → Not a fit; else any check → Needs check; else Fit.
- Exit verdict: any path passes → Yes; every path fails → No; else Needs check.
- Monthly mortgage: principal and interest on price minus $1,000,000, at 7.3% over 360 months. Exit target = 3 × monthly.
- Airbnb break-even = exit target ÷ nights allowed (City of LA 120, Pasadena 90). Pass if at or below the area average nightly rate; Check if up to 2× it; else Fail.
- Address lookup (buyer-added addresses, new in 8.5.0): research these first, on their own budget. Try three searches (Zillow, Redfin, then homes.com or a brokerage). If no listing is found, never call it "not for sale": add it with `price: null`, note "Listing link not found", and fill beds, baths, living area, lot and year built from public records where found. A null price shows Price unknown and a Check price row.
- Price exemptions: a listing with `price_exempt` passes the price filter outside $1.3M–$2.75M. Current: 11701 W Washington Blvd, Mar Vista ($1,095,000), buyer decision Nov 22, 2026.
- Rent comps must be actual rental listings: for each unit, search rentals with the same beds and baths and similar square feet within about 2 miles, record each one in `cf.units[].comps` (address, rent, beds, baths, sf, source) and use their average as `cf.units[].rent`. Never use market averages as rent.
- Cash-flow comps (`cf` on a listing): city, unit rents, whole-home nightly rate, neighborhood 5-year price trend, pool-build room and access, HOA, with sources and an as-of date. The daily and Thursday scans fill `cf` for every starred listing that lacks it. Without `cf`, the section shows PITI and live-in only.
- Area averages (Nov 2026): Sherman Oaks $295, other City of LA $267, Pasadena $197.
- Burbank and La Cañada Flintridge always fail the Airbnb path. Glendale and La Crescenta are Check.

**Defaults for terms the buyer hasn't defined**

- Grocery "walking distance" (buyer decision Nov 26, 2026): a full grocery within 1 mile (about 20 minutes on foot). Pass when the scan names the store and a distance of 1 mile or less; Fail when the nearest full grocery is farther; otherwise Check.
- School "highly rated" (buyer decision Nov 26, 2026): the assigned elementary within 2 miles rates GreatSchools 8/10 or higher. Pass at 8+, Fail below 8. With only a SchoolDigger percentile, the 85th and above passes and lower is Check. Ivanhoe Elementary counts as highly rated.
- "Steep hillside": Check when the scan flags hillside; otherwise Pass.
- Pool "room to build": Check unless lot size and yard layout are known (buyer confirmed Nov 26, 2026: room counts only when confirmed).

**How to ship a change**

1. Read the live page with Artifact "read" (or start from this bundle).
2. Small change: Artifact "edit" with exact old and new text. Large change: edit `src/` or `data/`, run `python3 build.py`, and publish `listing-check.html` with the page's url.
3. Test in a headless browser: pick a listing and see its verdict; add an address; tap × three times to reject, then restore; rate 3 stars and see it under Starred; try each filter chip; reload and confirm everything persisted; no script errors.
4. Update this PRD: requirements, acceptance checks and Version history.
5. Tell the buyer in plain language what changed, any assumption you made, and the next most valuable step.

**When a request is ambiguous**

Build the reading most likely to match the buyer's intent and state the assumption in one line, with the alternative. Ask first only when the readings would build different things that are costly to undo.

## Goals and non-goals

**Goals**

1. A verdict on any weekly-scan listing in under 10 seconds: one tap shows Fit, Needs check or Not a fit, plus an Exit verdict.
2. Every verdict is explained: each filter shows pass, check or fail with the evidence behind it.
3. The list stays the buyer's own: new addresses can be added, poor fits rejected, and favorites starred, and those choices persist across sessions and viewers.
4. Fewer open filters each week: the share of "Not checked yet" rows falls as the weekly run fills data in.

**Non-goals**

- **No connectors or third-party APIs beyond the Sheet script.** Data that needs the web comes from Claude in the project, saved into the page.
- **No live web lookups from the page.** A pasted URL is matched and filed, not scraped.
- **No investment-property analysis.** It assumes primary occupancy; full cash-flow and cap-rate modeling is out of scope.
- **No accounts.** Anyone with the page password sees the same shared list.

## User stories

The happy path comes first: enter or pick a listing, then read its verdict and table. Stories are in priority order.

**Buyer**

1. As a buyer, I want to enter an address or listing URL and see whether it's a fit, so I can skip homes that miss my needs.
2. As a buyer, I want each filter shown with pass, check or fail and the evidence, so I can trust or challenge the verdict.
3. As a buyer, I want to see whether a home has an exit (value add or Airbnb income), so I don't buy something I can't get out of.
4. As a buyer, I want the weekly report grouped by neighborhood, then open-house day, then time, from now on, so I can plan which open houses to visit, weekday twilight included.
5. As a buyer, I want one-tap filters (Fit, Exit: Yes, Open house, Starred), so I can narrow the list fast.
6. As a buyer, I want a new address filed under its neighborhood, or Other, so the list stays organized.
7. As a buyer, I want to reject a listing by tapping × three times, so poor fits stop cluttering my list in every later session.
8. As a buyer, I want to restore a rejected listing, so a mistake is never permanent.
9. As a buyer, I want to rate listings 1–3 stars and see my 3-star homes in one Starred list, so my finalists are easy to find.
10. As a buyer, I want a link to my Starred analysis spreadsheet at the top, so I can go deeper on finalists.

**Shared viewer (spouse or agent)**

1. As a shared viewer, I want to see the same added, rejected and starred listings as the buyer, so we're working from one list.

**Edge cases**

- An address with no street number, or plain text like "hello", gets a prompt for a street address.
- A rejected address typed into the box says it was rejected, instead of being re-added.
- A neighborhood or open-house subheading with nothing visible hides.
- If saving fails, the page says the change will be lost when the page closes.

## Requirements

All P0 requirements below ship in v8.2.0. A listing is "Fit" only when every needs filter passes; any check makes it "Needs check"; any fail makes it "Not a fit."

**Needs filters**

| Filter | Passes when |
| --- | --- |
| Active listing | Active in the latest weekly scan |
| Price | $1.3M–$2.75M; target $2.6M |
| Size | 3+ bedrooms and 2+ baths |
| Office proxy (changed in 8.5.0) | 2,400+ sq ft living area, or a 7,000+ sq ft lot. Computed from `sf` and `lot_sf`; Fail when both are known and under; Check when either is missing |
| Pool | An existing full in-ground pool, or room for a new 18×20 pool with access to build it; a plunge pool never counts |
| Grocery | A full grocery within walking distance |
| School | A highly rated elementary within 2 miles |
| Terrain | Not a steep hillside |
| No HOA (new in 8.5.0) | No HOA. Listings with an HOA are not added by the scan; a buyer-added listing with a known HOA fails this row. The row shows only when HOA is known. |

**Exit paths** (Exit is "Yes" if either passes)

| Path | Passes when |
| --- | --- |
| Airbnb income | Area average nightly rate covers 3 months of mortgage over the nights the city allows (LA 120, Pasadena 90 whole-home). Fails in Burbank and La Cañada Flintridge, which ban short-term rentals. Glendale is hosted-only. |
| Forced value add | Fixer, or room for an ADU or addition given lot and house size |

Mortgage = principal and interest on price minus $1M cash, 7.3%, 30 years.

**P0: must have**

- [ ] **Check box.** Accepts an address or a homes.com, Redfin or Zillow URL. A scan match opens its result the first time. Entering an address or URL already on the page again (a repeat scan match, or any added address) fills its row in the list yellow (#F4E842) without moving the page (buyer decision Nov 27, 2026: never auto-scroll); the filter resets to All if it hid the row. Entered addresses are remembered in the viewer's browser. Matching uses street number plus street name, ignoring N/S/E/W and suffix spelling.
- [ ] **Verdict panel.** Shows the needs verdict and table, the Exit verdict and table, open houses, and an Open listing link.
- [ ] **Weekly report list (changed in 8.3.0).** Grouped neighborhood > open-house day > open-house time. Neighborhoods stay in scan order. Each listing sits under its next open house that hasn't ended, on any day of the week, judged when the page is opened and refreshed every minute. Days and times run earliest first; day headings read "Open house Thu Nov 26" with "(today)" or "(tomorrow)" where true, and a running open house says "happening now." Listings sharing a time share one heading. "No upcoming open house" comes last. All times are Los Angeles time, whatever the viewer's time zone. New listings are tagged New.
- [ ] **Views and filters (changed in 8.13.0).** Top level is two views: All listings (default) and Open house (listings with an open house that hasn't ended). Under All listings sit the secondary chips: Any, Fit, Exit: Yes, Fixer, 2+ stars, 3 stars; one is active at a time. The chips hide in the Open house view. Empty subheadings and neighborhoods hide; if nothing matches, the list says so.
- [ ] **Add new address.** Files by zip or neighborhood name into a matching search area, else Other, under "No upcoming open house." Added listings show "Needs check" until the weekly run fills them.
- [ ] **Reject (changed in 8.2.0).** × appears on hover at the top-right of each row (always visible on touch screens). Tapping it three times rejects the listing; the button shows "× 1/3" and "× 2/3" and the status line counts down. The count resets after 6 seconds without a tap. No confirmation dialog. Rejected listings stay hidden in every later session and stay in the weekly report.
- [ ] **Show rejected listings.** Link at the list's end; lists rejections newest first with Restore.
- [ ] **Stars.** Each verdict panel has 3 stars. Tapping a star sets that rating; tapping the current rating clears it. Rows show their stars.
- [ ] **Starred list.** Any listing rated exactly 3 stars appears in a Starred section at the top of the list; rejected listings drop out and return on restore.
- [ ] **Starred analysis link.** A top-level link opens the [Starred analysis spreadsheet](https://docs.google.com/spreadsheets/d/1LYYPUgIz2QuCC12P-3ufATq0tb3jcv9CFPP1ldBKR8g/edit?usp=sharing) in a new tab.
- [ ] **Version label.** The header shows the build, e.g. "Listing check v8.2.0."

- [ ] **Cash flow (new in 8.6.0).** A section after the verdict panels covers every starred listing (any rating, not rejected), most stars first. Inputs sit in a collapsed Assumptions menu and last only for the page view (no storage). Per listing:
    - Monthly PITI at the rate used, with the low–high range; PITI + maintenance; cash at close (down payment, buyer closing, pool build when it applies).
    - Five columns: Live in, House hack (2+ units: you live in the largest unit), Rent all units, Airbnb at 20% legal (city night cap; $0 where banned), Airbnb at 20% gross (comps, ignoring rules).
    - Rows: income, monthly cash flow pre-tax and after tax, 5-year after-tax cash flow, sale proceeds after tax and loan payoff, total cash put in, profit, ROI (5-year and annualized), the same cash in the market at 5%, and home vs market.
    - Defaults (buyer, Nov 27, 2026): 20% down; rate 6.49%–7.26%, 6.875% used; tax 1.25%; maintenance 2%/yr (changed from 3% on Nov 27, 2026); pool build $250,000 only when there's no pool, room is confirmed and street access is confirmed (a per-listing checkbox overrides it for the view); Airbnb occupancy 20%; resale at the neighborhood 5-year trend; commission 5%, staging $4,000, seller transfer tax by city, one month of carry for a 30-day sale; market 5%/yr.
    - After tax: mortgage interest deduction (federal on the first $750,000 of loan, California on $1M), property tax (California fully; federal only within the SALT room input), rental income at ordinary rates with 27.5-year depreciation on the building share, passive losses held until sale, Airbnb expenses limited to Airbnb income, home-sale exclusion on the share you live in, recapture at 25%, gains at 20% + 3.8% + California. Market gains are taxed the same way at the end.
    - Assumptions the buyer should set: insurance (0.35%), buyer closing (1%), tax brackets (35% federal, 9.3% California), Airbnb operating costs (15%), building share (50%).

- [ ] **Flow (new in 8.7.0).** The page runs in four steps, labeled and linked from the header: 1 Find (check box), 2 Evaluate the basics (verdict panel), 3 Evaluate as a group (list and filters), 4 Evaluate financing (cash flow). The cash-flow section can show Starred (default) or All listings, and lists each unit's rent comps.
- [ ] **Ruled out.** A listing with `out` in the data is kept but left off the page (5221 La Forest Dr, Nov 27, 2026; all 10 Sherman Oaks, Van Nuys and Cheviot Hills listings, Nov 27, 2026).

- [ ] **Layout (new in 8.9.0): table + side drawer.** The address box is the first thing on the page. Below it, every listing is one row in a sortable table: Listing (with neighborhood), Price, Basics, Exit, Next open house, Votes, Stars, Best vs market, and a reject ×. By default rows group by neighborhood in scan order, then by next open house; clicking a header sorts by it (again reverses). Filter chips sit above the table, with the financing assumptions menu. Selecting a row (click, Enter or Space; arrow keys move between rows) opens a drawer on the right with the listing's stars, vote, basics, exit and financing; the table stays visible and the row stays highlighted. On screens under 761px the drawer is full screen with “Back to table”; Escape closes it. Checking an address opens its drawer; a repeat entry highlights its row yellow. The step labels, Starred analysis link and stale footer were removed.
- [ ] **Collapsed passes (8.9.0).** When every filter passes, the filter table sits behind “All 8 filters pass. Show them”. When an exit path passes, the exit table sits behind “An exit path is there. Show the paths”. Otherwise both are open.
- [ ] **Group vote = stars (changed in 8.10.0).** The 3 stars are the vote: each star is one person’s yes, and 2 stars moves a listing to financing. There is no separate vote box or Votes column. Chips: “2+ stars” (advancing) and “3 stars”. The `votes` Sheet tab is no longer written.
- [ ] **Financing (changed in 8.8.0, step 4).** Scope defaults to Advancing (2 of 3 Yes) when any listing advances, else Starred; All is available.
    - Income paths: Live in, House hack, Rent all units, Airbnb 20% legal, Airbnb 20% gross, Live in + shoots (Peerspace 2 bookings × 4 hrs a month at the median nearby rate, less 20% host fee and 10% wear, plus 1 film day a year at $5,000; only homes with a pool), and Best legal combo (live there or house hack, plus shoots, plus legal Airbnb nights for single-unit homes).
    - Owner paths use owner-occupied loans; Rent all and Airbnb gross use a conventional investment loan (25% down, rate +0.625%) or DSCR.
    - Financing screen: every eligible path × loan, ranked by 5-year after-tax profit vs the same cash in the market; the best 6 show with cash at close, after-tax monthly cash flow, DSCR, profit and annualized ROI. Loans tested: 30-yr fixed at 20%, 25%, 30% down and $1M down; 7/6 ARM; 1 and 2 discount points; conforming 10% and 5% down with PMI; FHA 3.5% down with MIP; conventional investment 25% down; DSCR 25% and 20% down.
    - PMI, MIP and points surface only when they beat the same path without them. Loans over the 2026 LA County limit for the unit count (1 unit $1,249,125; 2 units $1,599,375; 3 units $1,933,200; 4 units $2,402,625) and DSCR below the minimum are listed under “Not surfaced” with the reason.

- [ ] **Offer-first drawer (new in 8.11.0).** The drawer leads with the offer decision. Top: Ready to offer / Not yet: n to resolve / Pass, with the offer range, walk-away price and list price. Then four tiles: fair value from sold comps (median $/sf × living area, with the 25th–75th percentile range, count and confidence), break-even vs market (highest price at which the best path and loan match the market return, found by bisection on price), ceiling (the lower of the two, buyer decision Nov 27, 2026) and leverage (days on market and price cuts, up to −4%). Then the best path at the opening offer (cash at close, after-tax monthly, 5-year vs market), the list of what must be resolved (failing or unconfirmed filters, fewer than 2 stars, missing comps, status), the sold comps with automated estimates and listing history, and finally Basics, Exit and Financing detail as collapsed sections.
    - Opening offer = lower of ceiling and fair-value low, less leverage, never above list. Pass when a filter fails, when no price beats the market, or when the ceiling is more than 15% under list.
    - Rent saved: living there saves the rent for the same home, so owner paths count this home’s rent comps for the share you live in (input; 0 turns it off). Without rent comps, the price isn’t tested against the market and the listing shows “Needs comps”.
    - Resale uses the listing’s own trend if set, else the area trend (`area_trend`), else the LA fallback.

**P1: next**

- Side-by-side compare of 2–3 listings.
- Disclosure check: paste text or upload page photos; Claude in the page flags risks.
- Monthly payment display was proposed and skipped by the buyer on Nov 22, 2026; don't build it unless asked.

**P2: later**

- Lot size, house size and year built per listing, filled by the weekly run.
- Per-address Airbnb comps, filled by the weekly run.
- Long-term rental as a third exit path.

## Data and storage

Scan data is baked into the page at each build; everything the user changes is saved in the Starred analysis Google Sheet through its Apps Script. If the database is unavailable, changes fall back to the viewer's browser.

| Data | Where it lives | Written by | Key |
| --- | --- | --- | --- |
| Weekly scan listings, filter results, open houses | `data/listings.json`, baked into the page by `build.py` | Claude in the project | Street number + street name |
| Added addresses | Sheet tab: added | Page, on Check listing | Same key |
| Rejected listings | Sheet tab: removed | Page, on the third × tap; deleted on Restore | Same key |
| Star ratings (0–3) | Sheet tab: stars | Page, on star tap | Same key |
| 3-star finalists | Sheet tab: Starred | Apps Script, after every write; rejected listings drop out. Columns from E on are yours and stay with their row. | Same key |

**Two roles for Claude**

- **Claude in the project** searches the web, runs the weekly scan, rebuilds the page and can read or write the database. It fills data the page can't fetch: lot size, rates, rules.
- **Claude in the page** can be called from JavaScript but can't browse. It's reserved for reasoning over what the page hands it, such as disclosure text (P1).

Shared data is last-write-wins: if two viewers rate the same listing at once, the later rating stands.

## Success metrics and acceptance

Success means the buyer uses the page every week and the open questions on each listing shrink. Baselines are from the Nov 21 scan.

| Metric | Type | Baseline (Nov 21) | Target |
| --- | --- | --- | --- |
| Listings with a final needs verdict (Fit or Not a fit) | Leading | 3 of 36 | 20 of 36 within 2 weekly runs |
| "Not checked yet" rows across all listings | Leading | Most grocery, school and ADU rows | Halved within 2 weekly runs |
| Listings rated or rejected per week | Leading | 0 | 10+ per week |
| Starred listings toured at an open house | Lagging | None | Every 3-star listing with an open house |
| Time from opening the page to a verdict | Leading | Not measured | Under 10 seconds |

**Acceptance checks for v8.1.0 and v8.2.0** (all passed in a headless browser test)

- [x] Given a listing panel, when I tap the third star, then the listing appears under Starred and the status reads "added to Starred."
- [x] Given a 2-star listing, then it does not appear under Starred, and its row shows 2 stars.
- [x] Given a reload, then ratings and the Starred list are unchanged.
- [x] Given a starred listing, when I reject it, then it leaves Starred; when I restore it, then it returns.
- [x] Given the list, then each neighborhood shows open-house subheadings and rows don't repeat the time (28 subheadings on Nov 22).
- [x] When I tap × once, then the button reads "× 1/3" and the status says 2 more taps; on the third tap the listing is rejected.
- [x] When I tap Fit, then only Fit listings show (3); Exit: Yes shows 19; Open house this weekend showed 16 on Nov 22 (v8.2.0; replaced by Open house in v8.3.0); Starred shows only 3-star listings, or a no-match message.
- [x] The page loads with no script errors.
- [x] (v8.3.0) With the clock at Sat Nov 21, 11 AM PT, Sherman Oaks shows "Open house Sat Nov 21 (today)" with 1–3 PM and 1–4 PM, then "Open house Sun Nov 22 (tomorrow)" with 1–5 PM, then "No upcoming open house"; the Open house chip shows 16. On Nov 22 evening it shows 1 (Dec 6). Same result with the viewer in New York time.
- [x] (v8.3.0) Star, reject and add sync through the Sheet API to a second viewer with empty browser storage.
- [x] (v8.3.0) The encrypted page refuses a wrong password and opens all 36 listings with the right one.

## Risks and open questions

The biggest risk is stale or missing data: most verdicts are "Needs check" until the weekly run fills grocery, school and lot data.

**Risks**

- **Airbnb test uses area averages.** Averages are skewed toward 1-bedrooms, so a pool home likely earns more; per-address comps (P2) would fix this.
- **City rules change.** Short-term rental rules are hard-coded from Nov 2026 research. Pasadena's 90-night cap came from a third-party site and is unconfirmed.
- **Whole-home Airbnb means moving out.** The Airbnb path assumes you leave on rented nights unless the home has a permitted ADU.
- **Shared list, one password.** Anyone with the page password can add, reject or rate. The Sheet token sits inside the encrypted page.
- **Public repo.** Source, scan data and this PRD are public; only the built page is encrypted. Make the repo private to hide them (GitHub Pages on a private repo needs a paid GitHub plan).
- **Mortgage is P&I only.** The 3-month target understates true monthly cost because tax and insurance aren't included.

**Open questions**

- [ ] Should "three stars" mean a 3-star rating (as built), or three separate people starring a listing? (Buyer)
- [ ] Should star ratings be per viewer instead of one shared rating? (Buyer)
- [ ] What school percentile counts as "highly rated"? Keppel Elementary at the 78.7th is marked Check. (Buyer)
- [x] Should the Starred analysis sheet pull starred listings automatically? Yes, as of v8.3.0, through the Apps Script.

## Roadmap and version history

Next builds go in order of value to the buyer; each is one 0.1.0 increment.

1. **v8.6.0: Side-by-side compare.** Starred finalists in columns.
2. **v8.7.0: Disclosure check.** Claude in the page flags risks from pasted disclosures.
3. **Weekly run upgrades.** Lot and house size, Airbnb comps and long-term rent filled per listing.

**Version history**

| Version | What changed |
| --- | --- |
| v8.13.0 | Two top-level views (All listings, Open house); secondary chips sit under All listings |
| v8.12.2 | Sherman Oaks, Van Nuys and Cheviot Hills dropped: 10 listings ruled out; scans skip them |
| v8.12.1 | No auto-scroll: opening a listing, closing the drawer, rejecting and re-entering an address never move the page; in-page links use pushState; page loads at the top; duplicates are highlighted in place |
| v8.12.0 | Sold comps for every active listing (24-month window, beds ±1, size 0.6–1.6×, same zips); multi-unit homes use 2–4 unit sales; pass line names the failing filter when price holds; single-value ranges collapse |
| v8.11.0 | Offer-first drawer: fair value from sold comps, break-even vs market, ceiling (lower of the two), offer range, leverage, blockers; rent saved counted for owner paths; area price trends for every neighborhood; valuation non-goal lifted |
| v8.10.0 | Stars are the group vote (2 stars advances); separate vote box and Votes column removed |
| v8.9.0 | Table + side drawer layout; anonymous votes (tap fills the next slot, undo your own); passing filter and exit tables collapse; step labels, Starred analysis link and stale copy removed |
| v8.8.0 | Group vote (3 voters, 2 of 3 Yes advances); financing adds shoots (Peerspace + film), best legal combo, and a loan screen (fixed, ARM, points, PMI, FHA, investment, DSCR) ranked by profit vs market |
| v8.7.0 | Four-step flow (find, basics, group, financing); rent from averages of actual rental listings for every listing; maintenance 2%; All-listings toggle in cash flow; 5221 La Forest Dr ruled out |
| v8.6.0 | Cash flow section for starred listings: PITI, four exits (legal and gross Airbnb), 5-year after-tax resale profit and ROI vs 5% market; inputs in a collapsible menu, not saved |
| v8.5.0 | Narrowing (buyer, Nov 26): school passes at GreatSchools 8+ and fails below; grocery passes within 1 mile; office-proxy row computed from sf and lot_sf instead of always passing; fixers tagged, given a Fixer chip and listed first in their open-house slot (office-proxy passes first); Valley Village dropped from the search. Also: No HOA filter (fails listings with a known HOA); null price supported for added addresses with no listing link found; added addresses researched first with three searches |
| v8.4.0 | Repeat entries scroll to the listing's row and fill it yellow (#F4E842) |
| v8.3.0 | Hosted on GitHub Pages, encrypted with StatiCrypt; shared data and the Starred tab in the Google Sheet via Apps Script; weekly scan moved to Thursday mornings to catch Thursday twilight open houses; list grouped neighborhood > next upcoming open-house day > time, from the moment the page is viewed; "Open house this weekend" chip became "Open house"; Sheet script opens the sheet by ID so it can run standalone |
| v8.2.0 | Open-house subheadings within each neighborhood; quick filters; reject takes three taps instead of a dialog; exportable bundle |
| v8.1.0 | Star ratings, Starred list, Starred analysis link, version label |
| v8 | Remove wording changed to Reject |
| v7 | Show rejected listings, with Restore |
| v6 | Reject with × and a confirmation dialog, saved across sessions |
| v5 | Nightly-rate test, city short-term rental rules, first ADU checks |
| v4 | Exit verdict: forced value add or Airbnb income worth 3 months of mortgage |
| v3 | JavaScript: check box matches the scan, adds new addresses by neighborhood or Other |
| v2 | List grouped by neighborhood and sorted by next open house; 6 more listings |
| v1 | HTML and CSS only: pick a listing, see its verdict and filter table |
