# homein2027

Listing evaluator.

**Live page:** `index.html`, encrypted with [StatiCrypt](https://github.com/robinmoisson/staticrypt) and served by GitHub Pages. The plain build is never committed.

**Shared data:** the Starred analysis Google Sheet, through `apps-script/Code.gs`. Setup: `apps-script/README.md`.

**Rebuild:** push to main, or run the "Build and encrypt page" Action. Locally: `STATICRYPT_PASSWORD=... ./scripts/encrypt.sh`.


Everything needed to run and keep building Listing check in a different Claude project. No connectors are used.

## What's here

| File | What it is |
| --- | --- |
| `listing-check.html` | The built page: one self-contained file, ready to publish. |
| `PRD.md` | The product spec. Its "Instructions for Claude" section tells Claude how to work on the page. |
| `src/index.template.html` | Page markup, with `%CSS%`, `%JS%` and data placeholders. |
| `src/styles.css` | All styles. Light and dark themes. |
| `src/app.js` | All behavior: check box, add, reject, restore, stars, filters, saving. |
| `data/listings.json` | The Nov 21, 2026 weekly scan: 36 listings with filter results and open houses. |
| `data/saved-user-data.json` | Added, rejected and starred listings from the old page (empty at export). |
| `build.py` | Rebuilds `listing-check.html` from `src/` and `data/`. Run `python3 build.py` in this folder. |

## Move it to a new project

1. Create the new project and upload this folder's files, or the zip, to its project knowledge. Add `claude_prospecting-handoff.md` too if you have it.
2. Paste this into the project's instructions: "Before changing Listing check, read PRD.md, especially Instructions for Claude."
3. In a chat in the new project, ask Claude: "Publish listing-check.html as a new artifact with the db and user capabilities."
4. If `data/saved-user-data.json` has entries, ask Claude to write them into the new page's database: collections `added`, `removed` and `stars`, document id = listing key.
5. Ask Claude to update the live-page link in PRD.md to the new artifact's link.

## Things that don't carry over on their own

- **Saved data.** Each published page has its own database, so the new page starts empty until step 4.
- **The page link.** The new page gets a new link; share that one.
- **The weekly scan.** Scheduled runs belong to the old project. Set up the weekly scan again in the new project, and have it update `data/listings.json` and rebuild.
