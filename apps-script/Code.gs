/**
 * Listing check: shared storage in the Starred analysis Google Sheet.
 *
 * The page sends stars, rejections and added addresses here. This script
 * writes them as rows, one tab per collection, and keeps a "Starred" tab of
 * every 3-star listing that isn't rejected.
 *
 * Tabs it manages (created on first use):
 *   added    key | street | nbhd | why | input | added | json
 *   removed  key | street | removed | json
 *   stars    key | street | stars | at | json
 *   Starred  key | street | stars | starred at   (add your own columns from E on;
 *                                                 they stay with their row)
 *
 * The json column is the source of truth the page reads back. Don't edit it.
 *
 * Works as a standalone script (script.google.com) or bound to the sheet:
 * it always opens the sheet by ID, so the Extensions menu isn't needed.
 *
 * Setup: see apps-script/README.md.
 */

const SHEET_ID = '1LYYPUgIz2QuCC12P-3ufATq0tb3jcv9CFPP1ldBKR8g';

const COLLS = {
  added: ['key', 'street', 'nbhd', 'why', 'input', 'added'],
  removed: ['key', 'street', 'removed'],
  stars: ['key', 'street', 'stars', 'at'],
};
const STARRED_TAB = 'Starred';
const STARRED_HEAD = ['key', 'street', 'stars', 'starred at'];

function token_() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN') || '';
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, head) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange('A:Z').setNumberFormat('@'); // keep keys and dates as text
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function collSheet_(c) {
  return sheet_(c, COLLS[c].concat('json'));
}

function docs_(c) {
  const sh = collSheet_(c);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const width = COLLS[c].length + 1;
  return sh.getRange(2, 1, n, width).getValues()
    .map(r => { try { return JSON.parse(r[width - 1]); } catch (e) { return null; } })
    .filter(d => d && d.key);
}

/** GET ?t=TOKEN → { ok, added:[], removed:[], stars:[] } */
function doGet(e) {
  if (!token_() || (e.parameter.t || '') !== token_()) return out_({ ok: false, error: 'bad token' });
  const res = { ok: true };
  Object.keys(COLLS).forEach(c => { res[c] = docs_(c); });
  return out_(res);
}

/** POST {token, op:"set"|"delete", coll, key, doc} → { ok } */
function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad json' }); }
  if (!token_() || b.token !== token_()) return out_({ ok: false, error: 'bad token' });
  if (!COLLS[b.coll] || !/^[a-z0-9-]{1,80}$/.test(b.key || '')) return out_({ ok: false, error: 'bad request' });
  if (b.op !== 'set' && b.op !== 'delete') return out_({ ok: false, error: 'bad op' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = collSheet_(b.coll);
    const keys = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
    const i = keys.indexOf(b.key);
    if (b.op === 'set') {
      const d = Object.assign({}, b.doc || {}, { key: b.key });
      const row = COLLS[b.coll].map(f => (d[f] == null ? '' : String(d[f]).slice(0, 1000))).concat(JSON.stringify(d));
      if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
      else sh.appendRow(row);
    } else if (i >= 0) {
      sh.deleteRow(i + 2);
    }
    refreshStarred_();
  } finally {
    lock.releaseLock();
  }
  return out_({ ok: true });
}

/** Keep the Starred tab equal to 3-star listings that aren't rejected. Extra columns stay with their row. */
function refreshStarred_() {
  const removed = new Set(docs_('removed').map(d => d.key));
  const want = {};
  docs_('stars').forEach(d => { if (+d.stars === 3 && !removed.has(d.key)) want[d.key] = d; });

  const sh = sheet_(STARRED_TAB, STARRED_HEAD);
  const n = sh.getLastRow() - 1;
  const have = n > 0 ? sh.getRange(2, 1, n, 1).getValues().map(r => r[0]) : [];
  for (let i = have.length - 1; i >= 0; i--) {
    if (!want[have[i]]) sh.deleteRow(i + 2);
  }
  Object.keys(want).forEach(k => {
    if (have.indexOf(k) < 0) {
      const d = want[k];
      sh.appendRow([d.key, d.street || '', String(d.stars), d.at || '']);
    }
  });
}

/** Run once from the editor: creates the tabs and a random TOKEN if none is set. */
function setup() {
  Object.keys(COLLS).forEach(collSheet_);
  sheet_(STARRED_TAB, STARRED_HEAD);
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('TOKEN')) p.setProperty('TOKEN', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('TOKEN = ' + p.getProperty('TOKEN'));
}
