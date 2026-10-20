const { LIFF_ID, API_URL } = window.APP_CONFIG;

const ERROR_MESSAGES = {
  unauthorized: 'ログインの有効期限が切れました。ページを開き直してください。',
  forbidden: 'このページを見る権限がありません。',
  not_found: '写真が見つかりませんでした。',
};

const MAX_PARALLEL_IMAGE_REQUESTS = 4;

let idToken = null;

async function main() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    idToken = liff.getIDToken();
    const { days } = await callApi({ action: 'list' });
    render(days);
  } catch (err) {
    showError(err.message);
  }
}

async function callApi(params) {
  const res = await fetch(API_URL, {
    method: 'POST',
    // text/plain にすると、GAS が対応していない CORS の事前リクエストが発生しない
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ kind: 'api', idToken, ...params }),
  });
  if (!res.ok) throw new Error(`通信エラーが発生しました（${res.status}）`);
  const data = await res.json();
  if (!data.ok) throw new Error(ERROR_MESSAGES[data.error] || 'エラーが発生しました。');
  return data;
}

// ---------- 表示 ----------

function render(days) {
  const status = document.getElementById('status');
  if (days.length === 0) {
    status.textContent = 'まだ日記がありません。トークで送ってみましょう。';
    return;
  }
  status.hidden = true;

  const container = document.getElementById('days');
  days.forEach((day) => {
    const section = el('section', 'day');
    section.append(el('h2', 'day-title', day.label));
    groupEntries(day.entries).forEach((group) => section.append(renderGroup(group)));
    container.append(section);
  });
}

/** 続けて送った写真を1つのグループにまとめる */
function groupEntries(entries) {
  const groups = [];
  entries.forEach((entry) => {
    const last = groups[groups.length - 1];
    if (entry.type === 'image' && last && last.type === 'image') {
      last.fileIds.push(entry.fileId);
    } else if (entry.type === 'image') {
      groups.push({ type: 'image', time: entry.time, fileIds: [entry.fileId] });
    } else {
      groups.push({ type: 'text', time: entry.time, text: entry.text });
    }
  });
  return groups;
}

function renderGroup(group) {
  const row = el('div', 'entry');
  row.append(el('div', 'time', group.time));

  const body = el('div', 'entry-body');
  if (group.type === 'text') {
    body.append(el('p', 'text', group.text));
  } else {
    const photos = el('div', 'photos');
    group.fileIds.forEach((fileId) => photos.append(renderPhoto(fileId)));
    body.append(photos);
  }
  row.append(body);
  return row;
}

function renderPhoto(fileId) {
  const button = el('button', 'photo');
  button.type = 'button';
  button.dataset.fileId = fileId;
  button.addEventListener('click', () => openViewer(fileId, button.querySelector('img')));
  thumbObserver.observe(button);
  return button;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showError(message) {
  const status = document.getElementById('status');
  status.hidden = false;
  status.textContent = message;
  const retry = el('button', null, '再読み込み');
  retry.type = 'button';
  retry.addEventListener('click', () => location.reload());
  status.append(document.createElement('br'), retry);
}

// ---------- 写真の読み込み ----------

// 画面に近づいた写真だけ縮小版を読み込む
const thumbObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    thumbObserver.unobserve(entry.target);
    const button = entry.target;
    loadImage(button.dataset.fileId, 'thumb')
      .then((src) => {
        const img = el('img');
        img.alt = '';
        img.src = src;
        button.append(img);
      })
      .catch((err) => console.error(err));
  });
}, { rootMargin: '300px' });

// GAS への同時リクエスト数を制限する
const imageQueue = [];
let runningImageRequests = 0;

function loadImage(fileId, size) {
  return new Promise((resolve, reject) => {
    imageQueue.push({ fileId, size, resolve, reject });
    runImageQueue();
  });
}

function runImageQueue() {
  while (runningImageRequests < MAX_PARALLEL_IMAGE_REQUESTS && imageQueue.length > 0) {
    const job = imageQueue.shift();
    runningImageRequests++;
    callApi({ action: 'image', fileId: job.fileId, size: job.size })
      .then((data) => job.resolve(`data:${data.mimeType};base64,${data.data}`))
      .catch(job.reject)
      .finally(() => {
        runningImageRequests--;
        runImageQueue();
      });
  }
}

// ---------- 拡大表示 ----------

const viewer = document.getElementById('viewer');
const viewerImg = viewer.querySelector('img');
let viewingFileId = null;

function openViewer(fileId, thumbImg) {
  viewingFileId = fileId;
  // 原寸を読み込むまでは縮小版を表示しておく
  viewerImg.src = thumbImg ? thumbImg.src : '';
  viewer.hidden = false;
  loadImage(fileId, 'full')
    .then((src) => {
      if (viewingFileId === fileId) viewerImg.src = src;
    })
    .catch((err) => console.error(err));
}

viewer.addEventListener('click', () => {
  viewer.hidden = true;
  viewingFileId = null;
  viewerImg.removeAttribute('src');
});

main();
