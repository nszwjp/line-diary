/**
 * LINE の Webhook イベント処理
 *
 * - 許可した2人以外のイベントは無視し、unknown_users シートに記録だけする
 * - テキストと写真は日記として保存し「受け取りました」と返信する
 * - テンプレのボタン操作は postback で届くので、日記としては保存されない
 * - スタンプなどその他のメッセージは保存しない
 */

const TEMPLATE_MENU = 'template_menu';
const TEMPLATE_FULL = 'template_full';
const TEMPLATE_SHORT = 'template_short';

function handleWebhook(body) {
  // Workers を通ったリクエストだけを受け付ける
  if (!safeEquals(String(body.secret || ''), getProp('SHARED_SECRET'))) {
    return jsonResponse({ ok: false, error: 'unauthorized' });
  }

  const payload = JSON.parse(body.payload);
  (payload.events || []).forEach((event) => {
    try {
      handleEvent(event);
    } catch (err) {
      console.error(err.stack || err);
    }
  });
  return jsonResponse({ ok: true });
}

function handleEvent(event) {
  if (event.mode && event.mode !== 'active') return;
  if (isDuplicateEvent(event.webhookEventId)) return;

  const source = event.source || {};
  if (source.type !== 'user' || !source.userId) return;
  if (!isAllowedUser(source.userId)) {
    logUnknownUser(source.userId, describeEvent(event));
    return;
  }

  if (event.type === 'postback') handlePostback(event);
  if (event.type === 'message') handleMessage(event);
}

/** 同じイベントが再送されても二重保存しない */
function isDuplicateEvent(webhookEventId) {
  if (!webhookEventId) return false;
  const cache = CacheService.getScriptCache();
  const key = 'evt:' + webhookEventId;
  if (cache.get(key)) return true;
  cache.put(key, '1', 21600);
  return false;
}

function describeEvent(event) {
  if (event.type !== 'message') return event.type;
  const message = event.message;
  if (message.type === 'text') return 'text: ' + message.text.slice(0, 30);
  return message.type;
}

// ---------- テンプレート ----------

function handlePostback(event) {
  const data = event.postback.data;

  if (data === TEMPLATE_MENU) {
    replyMessages(event.replyToken, [{
      type: 'text',
      text: 'どちらのテンプレートにしますか？',
      quickReply: {
        items: [
          quickReplyItem('しっかり版', TEMPLATE_FULL),
          quickReplyItem('ひとこと版', TEMPLATE_SHORT),
        ],
      },
    }]);
  } else if (data === TEMPLATE_FULL || data === TEMPLATE_SHORT) {
    replyText(event.replyToken, buildTemplate(data, new Date(event.timestamp)));
  }
}

function quickReplyItem(label, data) {
  return {
    type: 'action',
    action: { type: 'postback', label: label, data: data, displayText: label },
  };
}

function buildTemplate(kind, date) {
  const header = '📅 ' + formatJst(date, 'M/d') + '（' + weekdayJst(date) + '）';
  if (kind === TEMPLATE_FULL) {
    return [
      header + 'しっかり版',
      '【今日あったこと】',
      '【よかったこと】',
      '【気になったこと】',
      '【明日やりたいこと】',
    ].join('\n');
  }
  return [
    header + 'ひとこと版',
    '今日をひとことで：',
  ].join('\n');
}

// ---------- 日記の保存 ----------

function handleMessage(event) {
  const message = event.message;
  const entry = {
    sentAt: new Date(event.timestamp),
    userId: event.source.userId,
    messageId: message.id,
  };

  if (message.type === 'text') {
    entry.type = 'text';
    entry.text = message.text;
    appendEntry(entry);
    replyText(event.replyToken, '受け取りました');
    return;
  }

  if (message.type === 'image') {
    try {
      const saved = savePhoto(message.id, entry.sentAt);
      entry.type = 'image';
      entry.fileId = saved.fileId;
      entry.thumbId = saved.thumbId;
      appendEntry(entry);
    } catch (err) {
      console.error(err.stack || err);
      replyText(event.replyToken, '写真の保存に失敗しました。もう一度送ってください');
      return;
    }
    // 複数枚まとめて送られたときは、最後の1枚にだけ返信する
    const imageSet = message.imageSet;
    if (!imageSet || imageSet.index === imageSet.total) {
      replyText(event.replyToken, '受け取りました');
    }
  }
}

/** LINE から写真（原寸とプレビュー）を取得し、非公開のドライブフォルダに保存する */
function savePhoto(messageId, sentAt) {
  const folder = DriveApp.getFolderById(getProp('PHOTO_FOLDER_ID'));
  const baseName = formatJst(sentAt, 'yyyyMMdd_HHmmss') + '_' + messageId;
  const contentUrl = 'https://api-data.line.me/v2/bot/message/' + messageId + '/content';

  const original = lineFetch(contentUrl).getBlob();
  const file = folder.createFile(original.setName(baseName + extensionOf(original)));

  // 一覧ページ用の縮小版。取得できなければ原寸を使う
  let thumbId = file.getId();
  try {
    const preview = lineFetch(contentUrl + '/preview').getBlob();
    thumbId = folder.createFile(preview.setName(baseName + '_thumb' + extensionOf(preview))).getId();
  } catch (err) {
    console.warn('プレビュー画像を取得できませんでした: ' + err);
  }

  return { fileId: file.getId(), thumbId: thumbId };
}

function extensionOf(blob) {
  const type = blob.getContentType();
  if (type === 'image/png') return '.png';
  if (type === 'image/gif') return '.gif';
  return '.jpg';
}

// ---------- 返信 ----------

function replyText(replyToken, text) {
  replyMessages(replyToken, [{ type: 'text', text: text }]);
}

function replyMessages(replyToken, messages) {
  lineJson('https://api.line.me/v2/bot/message/reply', {
    replyToken: replyToken,
    messages: messages,
  });
}
