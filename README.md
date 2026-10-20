# LINE 2人日記ボット

LINE公式アカウントに日記（文章・写真）を送ると自動で保存され、LINE の中で開くページで自分の日記だけを見られるボット。仕様は [line_project.md](line_project.md)。

## 構成

```
[LINE] ──Webhook──▶ [Cloudflare Workers] 署名検証 → GASへ転送（共有キー付き）
                                              │
                                              ▼
                        [GAS] 許可ユーザー確認 → 返信 / 保存
                          ├─ スプレッドシート（投稿1件=1行）
                          └─ Googleドライブ（写真。非公開）

[LIFF一覧ページ（GitHub Pages）] ──IDトークン──▶ [GAS API]
                          LINEの検証APIでIDトークンを確認 → 本人の日記・写真だけを返す
```

GAS はリクエストヘッダーを読めず、`X-Line-Signature` を検証できません。そのため Cloudflare Workers で署名を検証してから GAS に転送します。

## ファイル

| パス | 内容 |
|---|---|
| `worker/worker.js` | Cloudflare Workers。署名を検証して GAS へ転送 |
| `gas/Code.gs` | GAS の入口（doPost）と共通処理 |
| `gas/Webhook.gs` | LINE イベントの処理（テンプレート返信・日記保存） |
| `gas/Api.gs` | 一覧ページ用 API（ID トークン検証・一覧・写真） |
| `gas/Setup.gs` | 初期設定 `setup()` とリッチメニュー登録 `createRichMenu()` |
| `liff/` | 一覧ページ（`config.js` だけ書き換える） |
| `richmenu/` | リッチメニュー画像と、その生成スクリプト |
| `docs/SETUP.md` | 設定手順 |
| `docs/TESTING.md` | 動作確認の方法 |

## 秘密情報の置き場所

| 値 | 置き場所 |
|---|---|
| チャネルシークレット | Workers のシークレット `LINE_CHANNEL_SECRET` |
| チャネルアクセストークン | GAS のスクリプトプロパティ `CHANNEL_ACCESS_TOKEN` |
| Workers と GAS の共有キー | GAS `SHARED_SECRET`（自動生成）と Workers `GAS_SHARED_SECRET` |
| 許可するユーザー ID | GAS `ALLOWED_USER_IDS` |

`liff/config.js` の LIFF ID と GAS の URL は秘密情報ではありません。
