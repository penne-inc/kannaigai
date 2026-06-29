# microCMS 切り離し（凍結）手順

プロジェクト終了時に **一度だけ** 実行する手順。microCMS への依存（記事データ・画像CDN）を断ち、リポジトリ内のHTML＋ローカル画像だけで動く**純粋な静的サイト**に固定する。実行後は microCMS を閉じてよい。

> ⚠️ 不可逆に近い作業。実行前に必ずブランチを切ること（例：`git switch -c freeze/kannaigai18`）。

---

## 何が起きるか

| | 凍結前 | 凍結後 |
|---|---|---|
| 記事データ | microCMS API | **生成HTMLに焼き込み済み** |
| 画像 | microCMSのCDN（`images.microcms-assets.io`） | **リポジトリ内 `news/{slug}/images/`** |
| ビルド | GitHub Actions が毎回生成 | **不要**（静的ファイルを直接配信） |
| microCMS | 必要 | **閉じてよい** |

---

## 手順

### 1. ブランチを切る
```bash
git switch -c freeze/kannaigai18
```

### 2. 最新の状態でビルド（microCMSから取得）
```bash
cd kannaigai18
MICROCMS_SERVICE_DOMAIN=kannaigaiopen18 \
MICROCMS_API_KEY=（読取専用キー） \
node build/build.mjs
```

### 3. 画像をローカル化（凍結）
```bash
node build/freeze.mjs
```
→ 生成HTML内の `images.microcms-assets.io` の画像を `news/{slug}/images/` にDLし、`<img>` のパスを書き換える。

### 4. 生成物を Git 管理に戻してコミット
凍結後は生成物が「成果物」になるので、gitignore を解除して中身ごとコミットする。

`.gitignore` から次の行を削除（または対象を除外）：
```
/kannaigai18/index.html
/kannaigai18/news/*/index.html
```

その上で：
```bash
cd ..
git add -f kannaigai18/index.html "kannaigai18/news"
git add kannaigai18/.gitignore .gitignore
git commit -m "kannaigai18: microCMSを切り離し静的サイトに凍結"
```

### 5. ビルド機構と動的依存を撤去
- `.github/workflows/deploy.yml` を削除（自動ビルド停止）
- `kannaigai18/config.js`・`kannaigai18/js/news.js`・`kannaigai18/news/preview/` を削除（プレビュー＝microCMS依存のため）
- 必要なら GitHub Pages のソースを「ブランチ配信」に戻す

```bash
git rm .github/workflows/deploy.yml
git rm -r kannaigai18/news/preview kannaigai18/config.js kannaigai18/js/news.js
git commit -m "kannaigai18: ビルド機構とmicroCMS依存を撤去"
```

### 6. 動作確認 → マージ
```bash
cd kannaigai18 && python -m http.server 8000
# トップ・各記事で画像が表示される（images.microcms-assets.io を参照していない）ことを確認
```
問題なければ develop → main へマージ。

### 7. microCMS を閉じる
本番で画像・記事が正常表示されることを確認できたら、microCMS のサービスを解約・削除してよい。

---

## 確認ポイント

- [ ] 生成HTMLに `images.microcms-assets.io` が**残っていない**
  ```bash
  grep -rl "images.microcms-assets.io" kannaigai18 || echo "OK: 残存なし"
  ```
- [ ] 各記事ページで画像が表示される（ネットワークタブで microCMS ドメインを参照していない）
- [ ] OGP画像（og:image）も自ドメインの絶対URLになっている

---

## 注意

- microCMSの画像URLに変換パラメータ（`?w=...&fm=webp` など）が付いている場合、`freeze.mjs` はその変換後画像をDLする。問題があれば手動で差し替える。
- 凍結後は記事の追加・編集は**HTMLを直接編集**するか、別のCMSへ移行する必要がある。
