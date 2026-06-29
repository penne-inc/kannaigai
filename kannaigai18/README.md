# 関内外OPEN!18 サイト

GitHub Pages でホスティング。お知らせは **microCMS（メンバー編集）＋ `data/admin-news.json`（管理者がGit編集）** を、**GitHub Actions がビルド時にマージして静的HTML生成**します。記事ごとにOGP（SNSシェア画像・タイトル）を埋め込むため、Facebook/X/LINE でのシェアに強い構成です。

## URL構成

| URL | 中身 | 生成 |
|-----|------|------|
| `https://kannaigai.com/kannaigai18/` | トップ（お知らせ一覧） | ビルド生成 |
| `https://kannaigai.com/kannaigai18/news/{slug}/` | お知らせ詳細（記事ごとOGP） | ビルド生成 |
| `https://kannaigai.com/kannaigai18/news/preview/?id={id}&draftKey={key}` | 下書きプレビュー（編集者用・noindex） | 手書き（クライアント描画） |

## 仕組み

```
microCMSで公開 / admin-news.json をGit編集
   ↓ webhook(公開時) または push(main)
GitHub Actions (.github/workflows/deploy.yml)
   ├ build/build.mjs が microCMS取得＋admin-news.jsonマージ
   ├ トップ index.html と 各記事 news/{slug}/index.html を生成（OGP埋め込み）
   └ サイト全体（kannaigai17含む）を GitHub Pages へデプロイ
```

- **APIキーはビルド時のみ使用** → 公開ページのHTMLには出ません（GitHub Secrets管理）
- `config.js` の読み取り専用キーは**下書きプレビューページ専用**

## ファイル構成

```
kannaigai18/
├── build/build.mjs        ★ 静的生成スクリプト（Node・依存なし）
├── data/
│   ├── admin-news.json     管理者が直接編集するお知らせ（[] で0件）
│   └── categories.json     カテゴリ定義（ビルドとプレビュー共通の単一ソース）
├── news/preview/index.html 下書きプレビュー（クライアント描画）
├── config.js               microCMS設定（プレビュー専用・読取専用キー）
├── js/news.js              プレビュー用データ層
├── css/news.css
├── content/関内外OPEN18.md  サイト掲載原稿
└── （生成物）index.html / news/{slug}/index.html  ※gitignore
```

---

## 初回セットアップ（リポジトリ管理者が一度だけ）

### 1. GitHub Secrets を登録
リポジトリ Settings → Secrets and variables → Actions → New repository secret

| 名前 | 値 |
|------|----|
| `MICROCMS_SERVICE_DOMAIN` | `kannaigaiopen18`（`https://◯◯.microcms.io` の ◯◯） |
| `MICROCMS_API_KEY` | **読み取り専用**APIキー（GETのみ） |

### 2. GitHub Pages のソースを切り替え
Settings → Pages → Build and deployment → Source を **「GitHub Actions」** に変更。
（CNAME＝kannaigai.com はリポジトリ直下のファイルがそのまま使われます）

### 3. microCMS の Webhook（公開時に自動ビルド）
microCMS → API設定 → Webhook → **GitHub Actions** を選択し、以下を設定：

- リポジトリ：`penne-inc/kannaigai`（owner/repo）
- イベントタイプ：`microcms-publish`
- GitHub の **Personal Access Token**（Fine-grained, 対象リポジトリの **Contents: Read** と **Actions: Read and write**）

これで記事を公開/更新すると `repository_dispatch (microcms-publish)` が発火し、数十秒〜1分で本番反映されます。

### 4. microCMS の画面プレビュー
microCMS → API設定 → 画面プレビュー に以下を設定：

```
https://kannaigai.com/kannaigai18/news/preview/?id={CONTENT_ID}&draftKey={DRAFT_KEY}
```

---

## 記事の追加

### メンバー（microCMS）
管理画面で記事を作成・公開するだけ。**コンテンツID**が記事URLの `{slug}` になります（例：`idea-compost-1` を手入力すると `/news/idea-compost-1/`）。未入力だと自動IDになります。

### 管理者（GitHub直接編集）
`data/admin-news.json` の配列に追記して push：

```json
[
  {
    "slug": "report-2027",
    "date": "2026-07-15",
    "title": "見出し",
    "category": "compost",
    "body": "<p>本文HTML。<a href=\"https://example.com\">リンク</a>可。</p>"
  }
]
```

→ `https://kannaigai.com/kannaigai18/news/report-2027/`

## カテゴリ（ラベル）

`data/categories.json` が単一ソース。microCMS のカテゴリ名（または `key`）がこの `label`/`key` と一致すると色・視点バッジが付きます（不一致はその名前をグレー表示）。

| key | label | 視点 |
|-----|-------|------|
| `redesign` | つながるリデザイン | 共創 |
| `bikkuri` | びっくり！YOKOHAMA | 発見 |
| `meet` | MEET KANNAIGAI | 交流 |
| `compost` | アイデアコンポスト | 発酵 |
| `general` | お知らせ | （全体） |

---

## ローカルでのビルド & 確認

```bash
# kannaigai18 ディレクトリで
python3 -m venv .venv && source .venv/bin/activate   # 初回のみ

# 静的生成（microCMSキーを環境変数で渡す）
MICROCMS_SERVICE_DOMAIN=kannaigaiopen18 \
MICROCMS_API_KEY=（読取専用キー） \
node build/build.mjs

# サーバー起動して確認
python -m http.server 8000
```

- トップ：<http://localhost:8000/>
- 詳細：<http://localhost:8000/news/{slug}/>
- プレビュー：<http://localhost:8000/news/preview/?id={id}&draftKey={key}>

> 生成物（`index.html`, `news/{slug}/`）は `.gitignore` 済み。ビルドのたびに作り直されます。

---

## 補足：記事ごとのOGP画像

現在 og:image は共通画像（`image/ogp.png`）です。記事ごとに画像を出すには、microCMS に画像フィールド（フィールドID `eyecatch`）を追加すれば、その画像が自動で og:image に使われます（`build/build.mjs` の `FIELDS.image` で変更可）。
