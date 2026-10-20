/**
 * LIFF 一覧ページ向けの API
 *
 * クライアントから送られた ID トークンを LINE の検証 API で確認し、
 * そこから得たユーザー ID の日記だけを返す（クライアントが名乗るユーザー ID は信用しない）
 *
 *   action: 'list'  … 日記の一覧
 *   action: 'image' … 写真1枚（size: 'thumb' | 'full'）を base64 で返す
 */

function handleApi(body) {
  const userId = verifyIdToken(body.idToken);
  if (!userId) return jsonResponse({ ok: false, error: 'unauthorized' });

  if (!isAllowedUser(userId)) {
    logUnknownUser(userId, 'LIFF の一覧ページを開こうとした');
    return jsonResponse({ ok: false, error: 'forbidden' });
  }

  if (body.action === 'list') return jsonResponse({ ok: true, days: listDays(userId) });
  if (body.action === 'image') return getImage(userId, body.fileId, body.size);
  return jsonResponse({ ok: false, error: 'bad_request' });
}

/**
 * ID トークンを検証してユーザー ID を返す。無効なら null
 * 写真ごとに API を呼ぶので、検証結果はトークンの有効期限までキャッシュする
 */
function verifyIdToken(idToken) {
  if (typeof idToken !== 'string' || !idToken) return null;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'idt:' + sha256Hex(idToken);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: getProp('LIFF_CHANNEL_ID') },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return null;

  const data = JSON.parse(res.getContentText());
  if (!data.sub) return null;

  const ttl = Math.min(21600, Math.floor(data.exp - Date.now() / 1000));
  if (ttl > 0) cache.put(cacheKey, data.sub, ttl);
  return data.sub;
}

/** 日付ごとにまとめる。日付は新しい順、1日の中は送信順 */
function listDays(userId) {
  const entries = readEntries()
    .filter((e) => e.userId === userId)
    .sort((a, b) => a.timestamp - b.timestamp);

  const days = {};
  entries.forEach((e) => {
    if (!days[e.date]) {
      days[e.date] = { date: e.date, label: dayLabel(new Date(e.timestamp)), entries: [] };
    }
    days[e.date].entries.push({
      time: e.time,
      type: e.type,
      text: e.type === 'text' ? e.text : '',
      fileId: e.type === 'image' ? e.fileId : '',
    });
  });

  return Object.keys(days).sort().reverse().map((date) => days[date]);
}

function dayLabel(date) {
  return formatJst(date, 'yyyy年M月d日') + '（' + weekdayJst(date) + '）';
}

function getImage(userId, fileId, size) {
  // 本人の投稿に含まれる写真かどうかを必ず確認する
  const entry = readEntries().find((e) => e.userId === userId && e.type === 'image' && e.fileId === fileId);
  if (!entry) return jsonResponse({ ok: false, error: 'not_found' });

  const driveId = size === 'full' ? entry.fileId : (entry.thumbId || entry.fileId);
  const blob = DriveApp.getFileById(driveId).getBlob();
  return jsonResponse({
    ok: true,
    mimeType: blob.getContentType(),
    data: Utilities.base64Encode(blob.getBytes()),
  });
}
