/**
 * 初期設定用の関数（エディタ上部の「実行」から手動で実行する）
 *
 *   setup()          … シートと写真フォルダ、Workers との共有キーを作る（何度実行しても OK）
 *   createRichMenu() … リッチメニューを作り直して、全員のデフォルトに設定する
 */

const REQUIRED_PROPS = [
  'CHANNEL_ACCESS_TOKEN',
  'LIFF_CHANNEL_ID',
  'LIFF_URL',
  'RICHMENU_IMAGE_URL',
  'ALLOWED_USER_IDS',
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, SHEET_ENTRIES, ENTRY_HEADERS);
  ensureSheet(ss, SHEET_UNKNOWN, ['受信日時', 'userId', '内容']);

  const props = PropertiesService.getScriptProperties();

  if (!props.getProperty('PHOTO_FOLDER_ID')) {
    // DriveApp で作ったフォルダは、自分だけが見られる非公開の状態になる
    const folder = DriveApp.createFolder('LINE日記_写真');
    props.setProperty('PHOTO_FOLDER_ID', folder.getId());
    console.log('写真フォルダを作成しました: ' + folder.getUrl());
  }

  // 値はスクリプト プロパティで確認する（ログには残さない）
  if (!props.getProperty('SHARED_SECRET')) {
    props.setProperty('SHARED_SECRET', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
    console.log('SHARED_SECRET を作成しました');
  } else {
    console.log('SHARED_SECRET は作成済みです');
  }

  const missing = REQUIRED_PROPS.filter((name) => !props.getProperty(name));
  if (missing.length) {
    console.log('まだ設定されていないスクリプトプロパティ: ' + missing.join(', '));
  } else {
    console.log('スクリプトプロパティはすべて設定済みです');
  }
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function createRichMenu() {
  // 以前に作ったリッチメニューは削除してから作り直す
  const existing = JSON.parse(lineFetch('https://api.line.me/v2/bot/richmenu/list').getContentText());
  existing.richmenus.forEach((menu) => {
    lineFetch('https://api.line.me/v2/bot/richmenu/' + menu.richMenuId, { method: 'delete' });
  });

  const created = JSON.parse(lineJson('https://api.line.me/v2/bot/richmenu', {
    size: { width: 2500, height: 843 },
    selected: true,
    name: '日記メニュー',
    chatBarText: 'メニュー',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: { type: 'postback', label: 'テンプレ', data: TEMPLATE_MENU, displayText: 'テンプレ' },
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: { type: 'uri', label: '日記を見る', uri: getProp('LIFF_URL') },
      },
    ],
  }).getContentText());
  const richMenuId = created.richMenuId;

  const imageRes = UrlFetchApp.fetch(getProp('RICHMENU_IMAGE_URL'), { muteHttpExceptions: true });
  if (imageRes.getResponseCode() !== 200) {
    throw new Error('リッチメニュー画像を取得できません: ' + getProp('RICHMENU_IMAGE_URL'));
  }
  lineFetch('https://api-data.line.me/v2/bot/richmenu/' + richMenuId + '/content', {
    method: 'post',
    contentType: 'image/png',
    payload: imageRes.getBlob().getBytes(),
  });

  lineFetch('https://api.line.me/v2/bot/user/all/richmenu/' + richMenuId, { method: 'post' });
  console.log('リッチメニューを設定しました: ' + richMenuId);
}
