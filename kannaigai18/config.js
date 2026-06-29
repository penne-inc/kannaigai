// ============================================================
// microCMS 連携設定
// ------------------------------------------------------------
// ここに自分の microCMS サービスの情報を入れてください。
// apiKey は必ず「読み取り専用（GETのみ）」キーを発行して使うこと。
// 読み取り専用キーは公開リポジトリにコミットしても公開記事を読めるだけで、
// 書き込み・削除はできないため実害はありません（公開前提の運用）。
// ============================================================
window.NEWS_CONFIG = {
    // 例: https://xxxx.microcms.io の "xxxx" 部分（サービスID）
    serviceDomain: 'kannaigaiopen18',

    // 読み取り専用 API キー
    apiKey: 'jdd6AbNmwC4FJExgEi7Vknms8LT2b6qLJEu6',

    // お知らせ API のエンドポイント名（microCMSで作成したAPIのエンドポイント）
    // 記事URL: /kannaigai18/news/?id={コンテンツID}
    endpoint: 'news',

    // microCMS 側のフィールド名（スキーマに合わせて変更可）
    fields: {
        title: 'title',      // テキストフィールド
        body: 'content',     // リッチエディタ（microCMS既定のフィールドID）
        date: 'date',        // 日付フィールド（無ければ publishedAt で代用）
        category: 'category' // 参照 or セレクト（name/label/key で判定）
    }
};

// ============================================================
// カテゴリ（ラベル）定義
// ------------------------------------------------------------
// 4プロジェクト＝4つの活動体（発見・共創・交流・発酵）＋ 全体お知らせ。
// microCMS の「category」セレクトフィールドの選択肢には、
// 下の key（推奨）または label のいずれかを設定すれば自動で対応します。
// admin-news.json 側も同じく key / label どちらでも可。
// ============================================================
window.NEWS_CATEGORIES = [
    { key: 'redesign',  label: 'つながるリデザイン',     viewpoint: '共創', color: '#2f80c4' },
    { key: 'bikkuri',   label: 'びっくり！YOKOHAMA',     viewpoint: '発見', color: '#e0803a' },
    { key: 'meet',      label: 'MEET KANNAIGAI',         viewpoint: '交流', color: '#3aa676' },
    { key: 'compost',   label: 'アイデアコンポスト',       viewpoint: '発酵', color: '#9b59b6' },
    { key: 'general',   label: 'お知らせ',               viewpoint: '',    color: '#555555' }
];
