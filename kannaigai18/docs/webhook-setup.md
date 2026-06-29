# microCMS Webhook → GitHub Actions 自動ビルド 設定手順

microCMS で記事を公開・更新したら、GitHub Actions が自動でビルド＆デプロイし、本番（`https://kannaigai.com/kannaigai18/`）に反映されるようにする設定です。

---

## 前提（重要）

- `repository_dispatch` 方式の Webhook は、**`deploy.yml` が `main` ブランチに存在している**ことが必須（GitHubの仕様で、`repository_dispatch` はデフォルトブランチのワークフローしか起動しない）。
- したがって設定の順番は：
  1. `deploy.yml` を **main にマージ**
  2. GitHub Secrets を登録
  3. （本書）Webhook を設定
  4. テスト

---

## ステップ1：GitHub Secrets を登録

リポジトリ → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `MICROCMS_SERVICE_DOMAIN` | `kannaigaiopen18`（`https://◯◯.microcms.io` の ◯◯） |
| `MICROCMS_API_KEY` | 読み取り専用APIキー（GETのみ） |

- 名前は `deploy.yml` の `secrets.◯◯` と完全一致させる。
- 未登録だとビルドは通るが**記事0件**になる。

---

## ステップ2：GitHub で Personal Access Token（PAT）を発行

GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**

| 設定 | 値 |
|------|----|
| Token name | `microcms-kannaigai`（任意） |
| Repository access | Only select repositories → **kannaigai** |
| Permissions → **Contents** | Read and write |
| Permissions → **Actions** | Read and write |
| Expiration | 任意（**期限切れに注意**。切れると自動ビルドが止まる） |

→ Generate し、**表示されたトークンをコピー**（再表示されない）。

> PAT は microCMS 側に保存される。安全のため**このリポジトリ1つ・最小権限**で発行すること。

---

## ステップ3：microCMS で Webhook を登録

microCMS → 対象API（`news`）→ **API設定 → Webhook → 追加する → 「GitHub Actions」**

| 項目 | 値 |
|------|----|
| GitHubアカウント名（owner） | `penne-inc` |
| リポジトリ名 | `kannaigai` |
| **トリガーイベント名** | `microcms-publish` |
| Personal Access Token | ステップ2でコピーしたトークン |
| 通知タイミング | 「公開時」「公開終了時」「コンテンツ更新時」など必要なものを全部チェック |

> ワークフロー（`deploy.yml`）は `repository_dispatch` のイベント種別を限定していないため、`microcms-publish` 以外の名前でも発火するが、分かりやすさのため `microcms-publish` を推奨。

---

## ステップ4：GitHub Pages のソースを切り替え（未実施なら）

Settings → **Pages → Build and deployment → Source** を **「GitHub Actions」** に変更。

---

## ステップ5：動作テスト

1. microCMS で記事を**公開（または更新）**する。
2. GitHub → リポジトリの **Actions タブ**を開く。
3. 「Build & Deploy to GitHub Pages」が**自動起動**していればOK。
4. 完了後（数十秒〜1分）、本番URLに反映される。

---

## トラブルシューティング

| 症状 | 主な原因 |
|------|---------|
| Actions が起動しない | `deploy.yml` が **main に無い** / owner・repo名ミス / PAT権限不足・期限切れ |
| 起動するが記事が空 | **Secrets未登録**（`MICROCMS_API_KEY`） |
| 401 / 403 エラー | PAT の権限（Contents / Actions）不足 or 期限切れ |
| 変更が反映されない | ビルド待ち。即時確認はプレビューページ（`/news/preview/?id=...&draftKey=...`） |

---

## 関連

- ビルドの仕組み・全体構成：`kannaigai18/README.md`
- ビルドスクリプト：`kannaigai18/build/build.mjs`
- ワークフロー：`.github/workflows/deploy.yml`
