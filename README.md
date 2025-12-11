# Kannaigai

GitHub Pagesを使用した静的HTMLサイト

## サイトURL

独自ドメインで公開：
`https://kannaigai.com/kannaigai17/`

GitHub Pages デフォルトURL：
`https://penne-inc.github.io/kannaigai/kannaigai17/`

## 独自ドメイン設定

### 1. DNS設定（ドメイン管理会社で設定）

ドメインのDNS設定で以下のレコードを追加してください：

#### Apexドメイン（kannaigai.com）の場合：
以下の4つのAレコードを追加：
```
A    @    185.199.108.153
A    @    185.199.109.153
A    @    185.199.110.153
A    @    185.199.111.153
```

#### wwwサブドメインの場合（推奨）：
```
CNAME    www    penne-inc.github.io
```

#### Apexドメインからwwwへのリダイレクト（オプション）：
DNS管理画面でURL転送またはリダイレクト設定を行う

### 2. GitHub Pagesの設定

1. GitHubリポジトリページにアクセス
2. `Settings` > `Pages` を開く
3. **Source**セクションで以下を選択：
   - Branch: `main`
   - Folder: `/ (root)`
4. **Custom domain**セクションに `kannaigai.com` を入力
5. `Save`をクリック
6. `Enforce HTTPS`にチェック（DNS反映後に有効化）

### 3. 確認

DNS反映には最大48時間かかる場合がありますが、通常は数時間で完了します。
以下のコマンドで確認できます：

```bash
# DNSの確認
dig kannaigai.com
# または
nslookup kannaigai.com
```

反映後、`https://kannaigai.com/kannaigai17/` でアクセスできます。

## ローカルでの確認

```bash
# kannaigai17ディレクトリでHTTPサーバーを起動
cd kannaigai17
python3 -m http.server 8000
# またはnpxを使用
npx http-server
```

ブラウザで `http://localhost:8000` にアクセス

## 構成

```
kannaigai17/
├── index.html   # メインHTMLファイル
└── style.css    # スタイルシート
```

## デプロイ

```bash
git add .
git commit -m "Add kannaigai17 static site"
git push origin main
```
