# 関内外OPEN!18 サイト

GitHub Pages でホスティングする静的サイト。お知らせは **microCMS（メンバー編集用）＋ `data/admin-news.json`（管理者がGitHubで直接編集）** の2系統を、詳細ページ1枚が `?id=` で読み分けて表示します。microCMS の下書きプレビュー（draftKey）にも対応しています。

## URL構成

| URL | 中身 |
|-----|------|
| `https://kannaigai.com/kannaigai18/` | トップ（`index.html`）。お知らせ一覧を表示 |
| `https://kannaigai.com/kannaigai18/news/?id={slug}` | お知らせ詳細（`news/index.html`） |

トップページに最新のお知らせ一覧（microCMS＋admin-news.json をマージ・日付降順）が並び、各項目から `news/?id={slug}` の詳細へ遷移します。

## ファイル構成

```
kannaigai18/
├── index.html             トップページ（お知らせ一覧）
├── news/index.html        お知らせ詳細（?id= で1記事表示）
├── config.js              microCMS接続設定・カテゴリ定義 ← ここを編集
├── js/news.js             データ層（microCMS/JSON読み分け・draftKeyプレビュー）
├── css/news.css           お知らせ用スタイル
├── data/admin-news.json   管理者が直接編集するお知らせ
└── content/関内外OPEN18.md  サイト掲載原稿（計画書ベース）
```

## 識別子（slug / id）

- **microCMS**：記事の「コンテンツID」が `?id=` の値になります。作成時に分かりやすいIDを手入力できます（例：`idea-compost-1`）。
- **admin-news.json**：各エントリの `slug` が `?id=` の値になります。
- microCMS と admin-news.json で **同じ id/slug が重複した場合は microCMS を優先**します。

## カテゴリ（ラベル）

4プロジェクト＝4つの活動体（発見・共創・交流・発酵）＋ 全体お知らせ。`config.js` の `NEWS_CATEGORIES` で定義。

| key | ラベル | 視点 |
|-----|--------|------|
| `redesign` | つながるリデザイン | 共創 |
| `bikkuri` | びっくり！YOKOHAMA | 発見 |
| `meet` | MEET KANNAIGAI | 交流 |
| `compost` | アイデアコンポスト | 発酵 |
| `general` | お知らせ | （全体） |

microCMS のセレクトフィールドの選択肢には、上の `key`（推奨）または「ラベル」をそのまま設定すれば自動で対応します。

---

## microCMS セットアップ手順

### 1. サービス・APIを作成

1. [microCMS](https://microcms.io/) でアカウント作成 → サービスを作成
2. 「APIを作成」→ **リスト形式** を選び、エンドポイントを `news` に
3. 以下のフィールドを追加（フィールドIDは `config.js` の `fields` と一致させる）

| フィールドID | 種類 | 用途 |
|---|---|---|
| `title` | テキスト | 見出し |
| `body` | リッチエディタ | 本文（HTMLで返る） |
| `date` | 日時 | 表示・並び替え用の日付 |
| `category` | セレクト | 上表の `key` を選択肢に設定 |

> 記事作成時、「コンテンツID」に `idea-compost-1` のような分かりやすいIDを入れると、そのまま `?id=` の値になります。

### 2. 読み取り専用APIキーを発行

1. サービス設定 → 「APIキー」→ 新しいキーを作成
2. **GET のみ ON**、他（POST/PUT/PATCH/DELETE）は OFF
3. 発行したキーを `config.js` の `apiKey` に貼り付け
4. `serviceDomain` に `https://◯◯.microcms.io` の `◯◯` 部分を設定

> 読み取り専用キーは公開リポジトリにコミットしても、公開記事を読めるだけで書き込み・削除はできないため運用上問題ありません。

### 3. メンバーを招待（最大3名＋管理者）

サービス設定 →「メンバー管理」→ メールアドレスで招待。ロールで権限を割り当て可能。無料プランはメンバー3名まで。

### 4. 画面プレビュー（下書きプレビュー）設定

1. API設定 →「画面プレビュー」→ 遷移先URLに次を設定：

   ```
   https://kannaigai.com/kannaigai18/news/?id={CONTENT_ID}&draftKey={DRAFT_KEY}
   ```

2. 編集画面の「プレビュー」ボタンから、上記URLに `id`・`draftKey` 付きで遷移
3. `js/news.js` が `draftKey` を検知し、下書きを取得して「プレビュー表示中」バナー付きで表示します

---

## 管理者によるお知らせ追加（GitHub直接編集）

`data/admin-news.json` の配列に1件追記して push するだけ。`slug` がそのまま記事URLになります。

```json
{
  "slug": "report-2027",
  "date": "2026-07-15",
  "title": "見出し",
  "category": "compost",
  "body": "<p>本文HTML。<a href=\"https://example.com\">リンク</a>も書けます。</p>"
}
```

→ 記事URL: `https://kannaigai.com/kannaigai18/news/?id=report-2027`

- `slug` は半角英数字とハイフン推奨（URLに使われる）
- `category` は上表の `key`（または「ラベル」）
- `body` は HTML（`<p>` `<a>` `<strong>` 程度でOK）
- microCMS が一時的に落ちても、この JSON 側は表示されます（その逆も同様）

---

## ローカルでの確認

`fetch` を使うため、HTTP サーバー経由で開きます（macOS に python が無い場合は venv で用意）。

```bash
# kannaigai18 ディレクトリで
python3 -m venv .venv
source .venv/bin/activate
python -m http.server 8000
```

- トップ：<http://localhost:8000/>
- お知らせ詳細（サンプル）：<http://localhost:8000/news/?id=idea-compost-1>

> `.venv/` はコミット不要です（`.gitignore` で除外）。

---

## 補足：記事ごとのOGP（SNSシェア画像）について

現在のクエリ方式（`?id=`）では、SNSのクローラはJSを実行しないため、シェア時のOGP画像・タイトルは**全記事共通**になります。記事ごとに個別のOGPを出したくなった場合は、GitHub Actions で各記事を静的HTML生成するビルド方式へ移行が必要です。
