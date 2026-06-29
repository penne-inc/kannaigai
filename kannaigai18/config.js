// ============================================================
// microCMS 連携設定（下書きプレビューページ専用）
// ------------------------------------------------------------
// 公開ページはビルド時（GitHub Actions）に生成するため、
// ブラウザ側でAPIキーを使うのは「下書きプレビュー」だけ。
// apiKey は必ず「読み取り専用（GETのみ）」キーを使うこと。
// （読み取り専用キーは公開記事を読めるだけで書き込み・削除は不可）
//
// カテゴリ定義は data/categories.json（ビルドと共通の単一ソース）。
// ============================================================
window.NEWS_CONFIG = {
    // https://xxxx.microcms.io の "xxxx" 部分（サービスID）
    serviceDomain: 'kannaigaiopen18',

    // 読み取り専用 API キー
    apiKey: 'jdd6AbNmwC4FJExgEi7Vknms8LT2b6qLJEu6',

    // お知らせ API のエンドポイント名
    endpoint: 'news',

    // microCMS 側のフィールド名
    fields: {
        title: 'title',      // テキスト
        body: 'content',     // リッチエディタ（microCMS既定のフィールドID）
        date: 'date',        // 日付（無ければ publishedAt で代用）
        category: 'category' // 参照 or セレクト（name/label/key で判定）
    }
};
