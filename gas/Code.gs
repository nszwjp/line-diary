/**
 * 入口と共通処理
 *
 * doPost には次の2種類のリクエストが届く
 *   kind: 'webhook' … Cloudflare Workers から転送された LINE の Webhook（Webhook.gs）
 *   kind: 'api'     … LIFF の一覧ページからの API 呼び出し（Api.gs）
 *
 * GAS はステータスコードを自由に返せないため、結果は JSON の ok / error で返す
 */

const TZ = 'Asia/Tokyo';
const SHEET_ENTRIES = 'entries';
const SHEET_UNKNOWN = 'unknown_users';
const ENTRY_HEADERS = ['timestamp', 'date', 'time', 'userId', 'type', 'text', 'fileId', 'thumbId', 'messageId'];
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'bad_request' });
  }

  try {
    if (body.kind === 'webhook') return handleWebhook(body);
    if (body.kind === 'api') return handleApi(body);
    return jsonResponse({ ok: false, error: 'bad_request' });
  } catch (err) {
    console.error(err.stack || err);
    return jsonResponse({ ok: false, error: 'server_error' });
  }
}

function doGet() {
  return ContentService.createTextOutput('ok');
}

// ---------- 設定 ----------

function getProp(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('スクリプトプロパティ ' + name + ' が設定されていません');
  return value;
}

function isAllowedUser(userId) {
  const raw = PropertiesService.getScriptProperties().getProperty('ALLOWED_USER_IDS') || '';
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.indexOf(userId) !== -1;
}

// ---------- スプレッドシート ----------

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('シート ' + name + ' がありません。setup() を実行してください');
  return sheet;
}

/** 文字列を「文字列のまま」保存する（日付への自動変換や = で始まる数式化を防ぐ） */
function asText(value) {
  return value ? "'" + value : '';
}

function appendEntry(entry) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    getSheet(SHEET_ENTRIES).appendRow([
      entry.sentAt.getTime(),
      asText(formatJst(entry.sentAt, 'yyyy-MM-dd')),
      asText(formatJst(entry.sentAt, 'HH:mm')),
      asText(entry.userId),
      asText(entry.type),
      asText(entry.text),
      asText(entry.fileId),
      asText(entry.thumbId),
      asText(entry.messageId),
    ]);
  } finally {
    lock.releaseLock();
  }
}

/** entries シートを読み込む。日付・時刻は timestamp 列から日本時間で計算し直す */
function readEntries() {
  const values = getSheet(SHEET_ENTRIES).getDataRange().getValues();
  return values.slice(1).map((row) => {
    const timestamp = Number(row[0]);
    const sentAt = new Date(timestamp);
    return {
      timestamp: timestamp,
      date: formatJst(sentAt, 'yyyy-MM-dd'),
      time: formatJst(sentAt, 'HH:mm'),
      userId: String(row[3]),
      type: String(row[4]),
      text: String(row[5]),
      fileId: String(row[6]),
      thumbId: String(row[7]),
    };
  });
}

/** 許可されていないユーザーを記録する（ユーザー ID を調べるのにも使う） */
function logUnknownUser(userId, description) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    getSheet(SHEET_UNKNOWN).appendRow([
      asText(formatJst(new Date(), 'yyyy-MM-dd HH:mm:ss')),
      asText(userId),
      asText(description),
    ]);
  } finally {
    lock.releaseLock();
  }
}

// ---------- LINE API ----------

function lineFetch(url, options) {
  const res = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, options, {
    headers: { Authorization: 'Bearer ' + getProp('CHANNEL_ACCESS_TOKEN') },
  }));
  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('LINE API エラー ' + code + ' (' + url + '): ' + res.getContentText());
  }
  return res;
}

function lineJson(url, payload) {
  return lineFetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  });
}

// ---------- ユーティリティ ----------

function formatJst(date, pattern) {
  return Utilities.formatDate(date, TZ, pattern);
}

function weekdayJst(date) {
  // 'u' は曜日番号（1=月 … 7=日）
  return WEEKDAYS[Number(formatJst(date, 'u')) - 1];
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 文字列を一定時間で比較する（秘密キーの比較用） */
function safeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function sha256Hex(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
