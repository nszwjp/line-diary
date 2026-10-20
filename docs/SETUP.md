# 設定手順

上から順番に進めてください。

> **⚠ このファイルは GitHub で公開されています。このファイルには値を書き込まないでください。**

## 値の扱い方

設定の途中で出てくる値は、次の2種類に分けて扱います。

**秘密の値（メモしない）**

| 値 | 必要になったときに確認する場所 |
|---|---|
| チャネルシークレット | LINE Developers → Messaging API チャネル →「チャネル基本設定」タブ |
| チャネルアクセストークン | LINE Developers → Messaging API チャネル →「Messaging API設定」タブの一番下 |
| SHARED_SECRET | Apps Script →（歯車）プロジェクトの設定 →「スクリプト プロパティ」 |
| 自分と友人のユーザー ID | スプレッドシートの `unknown_users` シート（登録後は上と同じスクリプト プロパティ） |

これらはどこにも書き留めず、**必要な手順のときにその画面を開いてコピーし、そのまま貼り付けて** ください。
GitHub、チャット（Claude を含む）、メモアプリなどには貼らないでください。
いつでも上の場所で確認でき、漏れたときは作り直せます（[12. 秘密の値が漏れたとき](#12-秘密の値が漏れたとき)）。

**公開してよい値（手元のメモアプリにメモしてよい）**

```
LINEログインのチャネルID  :
GAS ウェブアプリ URL      : https://script.google.com/macros/s/..../exec
LIFF ID                  :
LIFF URL                 : https://liff.line.me/<LIFF ID>
Worker の URL            : https://<名前>.<アカウント>.workers.dev
```

これらは公開されても困りません。一覧ページはLINEのIDトークンで本人確認をしてから本人の日記だけを返します。Webhookは、LINEの署名とSHARED_SECRETがそろわないと受け付けません。そのため、URLやIDを知られても日記は読めず、偽の書き込みもできません。

---

## 1. LINE公式アカウントを作り、Messaging API を有効にする

1. https://entry.line.biz/start/jp/ を開き、「LINE公式アカウントをはじめる」→「無料で作成する」
2. LINE ビジネス ID を「LINEアカウントで登録」→ 画面の指示に沿ってアカウント情報（名前は例：「わたしの日記」）を入力して作成
3. 作成後に開く LINE Official Account Manager（https://manager.line.biz/）で、作ったアカウントを選ぶ
4. 右上の **「設定」** → 左メニュー **「Messaging API」** → **「Messaging APIを利用する」**
5. プロバイダーを聞かれるので **「プロバイダーを作成」**（名前は例：「diary」）→ 同意して「OK」
6. 左メニュー **「応答設定」** を開き、次のように設定
   - チャット：**オフ**
   - あいさつメッセージ：**オフ**
   - Webhook：**オン**
   - 応答メッセージ：**オフ**

## 2. アクセストークンを発行して友だち追加する

1. https://developers.line.biz/console/ を開き、LINE アカウントでログイン
2. 手順1で作ったプロバイダー → Messaging API のチャネル（公式アカウントの名前）を開く
3. **「チャネル基本設定」** タブに **「チャネルシークレット」** があることを確認（メモ不要。手順8で使います）
4. **「Messaging API設定」** タブの一番下 **「チャネルアクセストークン（長期）」** の **「発行」** を押す
   （発行したトークンはこの画面にずっと表示されるので、メモ不要。手順7で使います）
5. 同じタブにある **QRコード** をスマホで読み取り、自分のLINEで友だち追加する（友人にもこのQRを送って追加してもらう）

## 3. LINEログインチャネルを作る（LIFF 用）

LIFF は Messaging API のチャネルには追加できないので、**同じプロバイダー** の中に LINE ログインのチャネルを作ります（同じプロバイダーにしないとユーザー ID が一致しません）。

1. LINE Developers コンソールで手順1のプロバイダーを開き、**「新規チャネル作成」** → **「LINEログイン」**
2. 入力項目
   - チャネル名：例「日記ビューア」
   - チャネル説明：例「日記一覧」
   - アプリタイプ：**「ウェブアプリ」** にチェック
   - メールアドレス：自分のメールアドレス
3. 規約に同意して「作成」
4. **「チャネル基本設定」** タブの **「チャネルID」**（数字）をメモ

LIFF アプリの追加は、ページの URL が決まってから（手順6で）行います。

## 4. GitHub にコードを置いて GitHub Pages を有効にする

リポジトリ（https://github.com/nszwjp/line-diary 、Public）の作成と GitHub Pages の有効化は済んでいます。

- GitHub Pages の URL：`https://nszwjp.github.io/line-diary/`
- 一覧ページ（LIFF のエンドポイント URL）：`https://nszwjp.github.io/line-diary/liff/`
- リッチメニュー画像：`https://nszwjp.github.io/line-diary/richmenu/richmenu.png`

ブラウザでリッチメニュー画像の URL を開き、画像が表示されることだけ確認してください。

## 5. スプレッドシートと GAS を用意する

### 5-1. スプレッドシートとスクリプトを作る

1. https://sheets.new を開き、新しいスプレッドシートを作る。名前は例「LINE日記」
2. メニュー **「拡張機能」** → **「Apps Script」**。プロジェクト名は例「LINE日記」に変更
3. 左の「ファイル」に最初からある `コード.gs` の中身を全部消し、このリポジトリの `gas/Code.gs` の中身を貼り付ける
4. 「ファイル」の横の **「＋」** → **「スクリプト」** で `Webhook` という名前のファイルを作り、`gas/Webhook.gs` の中身を貼り付ける
5. 同じように `Api`（`gas/Api.gs`）と `Setup`（`gas/Setup.gs`）も作って貼り付ける
6. 💾（保存）を押す

### 5-2. setup を実行する

1. 上部の関数選択欄で **`setup`** を選び **「実行」**
2. 「承認が必要です」と出たら **「権限を確認」** → 自分の Google アカウントを選ぶ
3. 「Google はこのアプリを確認していません」と出たら、**「詳細」** → **「LINE日記（安全ではないページ）に移動」** → **「すべて選択」** にチェック → **「続行」**
   （自分で作ったスクリプトなので問題ありません）
4. 下の「実行ログ」に `SHARED_SECRET を作成しました` と出ることを確認
   （値は自動でスクリプト プロパティに保存されています。メモ不要。手順8で使います）
5. スプレッドシートに `entries` と `unknown_users` シートができ、Google ドライブに `LINE日記_写真` フォルダができていることを確認
   （このフォルダは非公開のままにしてください。共有設定は変更しないでください）

### 5-3. ウェブアプリとしてデプロイする

1. 右上の **「デプロイ」** → **「新しいデプロイ」**
2. 歯車アイコン（種類の選択）→ **「ウェブアプリ」**
3. 次のように設定して「デプロイ」
   - 説明：`v1`
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**
4. 表示された **「ウェブアプリ」の URL**（`https://script.google.com/macros/s/.../exec`）をメモ

> 「アクセスできるユーザー：全員」にしても安全です。Webhook は SHARED_SECRET を知っている Worker からしか受け付けず、
> 一覧 API は LINE の ID トークンで本人確認をしてから、許可した2人に本人の日記だけを返します。

> **⚠ GAS のコードを修正したときは**：「デプロイ」→「デプロイを管理」→ 鉛筆アイコン →
> バージョン：**「新バージョン」** →「デプロイ」。こうすると URL を変えずに新しいコードが反映されます
> （「新しいデプロイ」を作ると URL が変わってしまいます）。

## 6. LIFF アプリを作り、一覧ページの設定を書き込む

### 6-1. LIFF アプリを追加する

1. LINE Developers コンソール → 手順3の LINE ログインチャネル → **「LIFF」** タブ → **「追加」**
2. 入力項目
   - LIFFアプリ名：例「日記」
   - サイズ：**Full**
   - エンドポイントURL：`https://nszwjp.github.io/line-diary/liff/`（最後の `/` まで入れる）
   - Scope：**openid** にチェック（profile や chat_message.write は不要）
   - 友だち追加オプション：**Off**
   - Scan QR：オフのまま
3. 「追加」を押すと一覧に **LIFF ID**（例 `2001234567-AbCdEfGh`）と **LIFF URL**（`https://liff.line.me/...`）が出るのでメモ

### 6-2. LINE ログインチャネルを「公開」にする

LINE ログインチャネルは最初「開発中」で、自分（チャネル管理者）しか LIFF を開けません。

1. 同じチャネルの画面上部、チャネル名の横にある **「開発中」** を押す → **「公開」**

公開しても、許可した2人以外は GAS 側で拒否されるので日記は見られません。

### 6-3. config.js を書き換えて push する

`liff/config.js` の2か所を書き換えて、GitHub の `main` ブランチに反映します。

```js
LIFF_ID: '2001234567-AbCdEfGh',                          // 6-1 の LIFF ID
API_URL: 'https://script.google.com/macros/s/..../exec', // 5-3 の URL
```

**おすすめ**：Claude に LIFF ID と GAS の URL を伝えて「config.js に反映して」と頼む（どちらも秘密情報ではないので伝えて大丈夫です）。

自分でやる場合は、ブラウザで https://github.com/nszwjp/line-diary/blob/main/liff/config.js を開き、
右上の鉛筆アイコン（Edit this file）→ 2か所を書き換え →「Commit changes...」→「Commit changes」。
反映まで1〜2分かかります。

## 7. GAS のスクリプトプロパティを設定する

1. Apps Script エディタ左の **歯車（プロジェクトの設定）** → 一番下の **「スクリプト プロパティ」** → **「スクリプト プロパティを編集」**
2. **「スクリプト プロパティを追加」** を押して、次の4つを追加 → 「スクリプト プロパティを保存」

| プロパティ | 値 |
|---|---|
| `CHANNEL_ACCESS_TOKEN` | 別のタブで LINE Developers → Messaging API チャネル →「Messaging API設定」タブの一番下を開き、チャネルアクセストークンをコピーして貼り付ける |
| `LIFF_CHANNEL_ID` | 手順3の LINE ログインのチャネル ID |
| `LIFF_URL` | 6-1 の LIFF URL（`https://liff.line.me/...`） |
| `RICHMENU_IMAGE_URL` | `https://nszwjp.github.io/line-diary/richmenu/richmenu.png` |

`PHOTO_FOLDER_ID` と `SHARED_SECRET` は setup が自動で作ったものなので、そのままにしてください。
`ALLOWED_USER_IDS` は手順10で追加します。

## 8. Cloudflare Worker を作る

1. https://dash.cloudflare.com/sign-up でアカウントを作成（無料。カード登録は不要）
2. ダッシュボード左メニュー **「Workers & Pages」**（「コンピューティング」の中にある場合もあります）→ **「作成」**
3. **「Hello World から始める」**（Start with Hello World!）→ 名前を例 `line-diary-webhook` にして **「デプロイ」**
4. **「コードを編集」** を押し、エディタの中身（`worker.js`）を全部消して、このリポジトリの `worker/worker.js` を貼り付け → 右上 **「デプロイ」**
5. Worker の画面に戻り **「設定」** タブ → **「変数とシークレット」** → **「追加」** で次の3つを追加。**種類はすべて「シークレット」**

| 変数名 | 値 |
|---|---|
| `LINE_CHANNEL_SECRET` | 別のタブで LINE Developers → Messaging API チャネル →「チャネル基本設定」タブを開き、チャネルシークレットをコピーして貼り付ける |
| `GAS_URL` | 5-3 の GAS ウェブアプリ URL |
| `GAS_SHARED_SECRET` | 別のタブで Apps Script →（歯車）プロジェクトの設定 →「スクリプト プロパティ」を開き、`SHARED_SECRET` の値をコピーして貼り付ける |

6. 「デプロイ」を押して保存
7. Worker の画面に表示される URL（`https://line-diary-webhook.<アカウント>.workers.dev`）をメモ

## 9. LINE に Webhook URL を設定する

1. LINE Developers コンソール → Messaging API チャネル → **「Messaging API設定」** タブ
2. **「Webhook URL」** の「編集」→ 手順8の Worker の URL を入れて「更新」
3. **「検証」** を押し、「成功」と表示されることを確認
4. **「Webhookの利用」** を **オン** にする

## 10. ユーザー ID を調べて許可リストに入れる

この時点では許可リストが空なので、ボットは誰のメッセージにも反応しません。その代わり、送ってきた人のユーザー ID を `unknown_users` シートに記録します。

1. 自分の LINE から公式アカウントに何か一言送る（返信はありません）
2. 友人にも何か一言送ってもらう
3. スプレッドシートの `unknown_users` シートを開くと、`U` で始まる33文字の ID が記録されている。
   「内容」の列で誰の ID かを見分ける（メモ不要）
   - 自分の ID は、LINE Developers コンソールのチャネル基本設定タブ一番下の **「あなたのユーザーID」** でも確認できます
4. Apps Script のスクリプトプロパティに次を追加して保存（2つの ID を **カンマ区切り**。`unknown_users` シートからコピーして貼り付ける）

| プロパティ | 値 |
|---|---|
| `ALLOWED_USER_IDS` | `U1234...(自分),U5678...(友人)` |

## 11. リッチメニューを登録する

1. Apps Script エディタで関数 **`createRichMenu`** を選んで **「実行」**
2. 実行ログに `リッチメニューを設定しました` と出れば完了
3. LINE のトーク画面を開き直すと、下に「テンプレ」「日記を見る」のメニューが出ます
   （出ない場合は、トーク画面をいったん閉じて開き直してください）

> LINE Official Account Manager の「リッチメニュー」画面では作らないでください。
> そちらで作ったメニューでは「テンプレ」ボタン（postback）が使えず、ボタンを押した操作が日記として保存されてしまいます。

これで設定は完了です。続けて [TESTING.md](TESTING.md) の手順で動作確認をしてください。

## 12. 秘密の値が漏れたとき

GitHub やチャットに貼ってしまった場合は、貼った場所から消すだけでは不十分です（履歴やキャッシュに残ります）。**値そのものを作り直して** ください。

| 漏れた値 | 作り直し方 |
|---|---|
| チャネルアクセストークン | LINE Developers →「Messaging API設定」タブ → チャネルアクセストークンの **「再発行」**。新しい値を GAS の `CHANNEL_ACCESS_TOKEN` に貼り直す |
| チャネルシークレット | LINE Developers →「チャネル基本設定」タブ → チャネルシークレットの **「発行」**（再発行）。新しい値を Worker の `LINE_CHANNEL_SECRET` に貼り直し、Worker を「デプロイ」 |
| SHARED_SECRET | GAS のスクリプト プロパティで `SHARED_SECRET` を **削除** → `setup` を実行（新しい値が作られる）→ 新しい値を Worker の `GAS_SHARED_SECRET` に貼り直し、Worker を「デプロイ」 |
| ユーザー ID | 作り直せませんが、許可した2人以外はボットにも一覧ページにも拒否されるので、それだけで日記が読まれることはありません |

作り直したら [TESTING.md](TESTING.md) の「1. テンプレート」と「3. 一覧ページ」で、動いていることを確認してください。
