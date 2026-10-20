/**
 * LINE Webhook の受け口（Cloudflare Workers）
 *
 * 1. LINE から届いたリクエストの署名（X-Line-Signature）を検証する
 * 2. 正しければ、すぐに LINE へ 200 を返し、裏で GAS へ転送する
 *
 * 必要な環境変数（Workers の「設定 → 変数とシークレット」で「シークレット」として登録）
 *   LINE_CHANNEL_SECRET : Messaging API チャネルのチャネルシークレット
 *   GAS_URL             : GAS ウェブアプリの URL（https://script.google.com/macros/s/.../exec）
 *   GAS_SHARED_SECRET   : GAS のスクリプトプロパティ SHARED_SECRET と同じ値
 */
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const signature = request.headers.get('x-line-signature');
    const body = await request.text();

    const valid = await verifySignature(body, signature, env.LINE_CHANNEL_SECRET);
    if (!valid) {
      return new Response('Invalid signature', { status: 401 });
    }

    // GAS の処理を待たずに LINE へ応答する（GAS は応答が遅いため）
    ctx.waitUntil(forwardToGas(body, env));
    return new Response('OK', { status: 200 });
  },
};

async function verifySignature(body, signature, channelSecret) {
  if (!signature || !channelSecret) return false;

  let signatureBytes;
  try {
    signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  } catch (e) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  // crypto.subtle.verify は一定時間で比較するので、タイミング攻撃にも強い
  return crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(body));
}

async function forwardToGas(body, env) {
  try {
    const res = await fetch(env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'webhook',
        secret: env.GAS_SHARED_SECRET,
        payload: body,
      }),
    });
    console.log('GAS responded:', res.status, await res.text());
  } catch (e) {
    console.error('Failed to forward to GAS:', e);
  }
}
