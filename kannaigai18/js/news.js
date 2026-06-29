// ============================================================
// お知らせ詳細
// ------------------------------------------------------------
// /kannaigai18/news/?id={slug} の ?id= を読み、該当する1記事を表示する。
// データソースは2系統:
//   1. microCMS API ........ メンバーが管理画面から編集（id = コンテンツID）
//   2. ../data/admin-news.json  管理者がGitHubで直接編集（slug で対応）
// microCMS の下書きプレビュー（draftKey）にも対応する。
// ============================================================

// admin-news.json の場所を news.js 自身の位置から解決する。
// これによりトップ(/kannaigai18/)・詳細(/kannaigai18/news/)のどちらから
// 読み込んでも常に /kannaigai18/data/admin-news.json を指す。
const NEWS_JS_SRC = (document.currentScript && document.currentScript.src) || '';
const ADMIN_NEWS_URL = NEWS_JS_SRC
    ? new URL('../data/admin-news.json', NEWS_JS_SRC).href
    : 'data/admin-news.json';

/**
 * カテゴリの生値（key / label / セレクトの配列）を正規化。
 * 未知のカテゴリは「お知らせ」相当にフォールバック。
 */
function resolveCategory(raw) {
    const categories = window.NEWS_CATEGORIES || [];
    const fallback = categories.find(c => c.key === 'general')
        || { key: 'general', label: 'お知らせ', viewpoint: '', color: '#555555' };

    // 配列（複数選択）は先頭を採用
    let value = Array.isArray(raw) ? raw[0] : raw;
    // 参照フィールドはオブジェクトで返るため表示名（name/label）を優先
    if (value && typeof value === 'object') {
        value = value.name || value.label || value.key || value.id;
    }
    if (value === undefined || value === null || value === '') return fallback;

    const display = String(value).trim();
    const lc = display.toLowerCase();
    const matched = categories.find(c =>
        c.key.toLowerCase() === lc || c.label.toLowerCase() === lc
    );
    if (matched) return matched;

    // 定義に無いカテゴリは、その名前をそのままラベルとして表示（グレー）
    return { key: 'other', label: display, viewpoint: '', color: '#555555' };
}

/**
 * 日付文字列を表示用（YYYY.MM.DD）に整形。
 */
function formatNewsDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
}

/**
 * 1件のお知らせを共通の形に正規化。
 *   { slug, title, date, dateDisplay, body, category, source, isDraft }
 */
function normalizeItem(raw, source) {
    const f = (window.NEWS_CONFIG && window.NEWS_CONFIG.fields) || {};
    const titleKey = f.title || 'title';
    const bodyKey = f.body || 'body';
    const dateKey = f.date || 'date';
    const categoryKey = f.category || 'category';

    const dateValue = raw[dateKey] || raw.publishedAt || raw.createdAt || '';

    return {
        // microCMSは id=コンテンツID、admin-news.json は slug を識別子に使う
        slug: raw.slug || raw.id || '',
        title: raw[titleKey] || '(無題)',
        date: dateValue,
        dateDisplay: formatNewsDate(dateValue),
        body: raw[bodyKey] || '',
        category: resolveCategory(raw[categoryKey]),
        source: source,        // 'microcms' | 'admin'
        isDraft: false
    };
}

/**
 * admin-news.json から slug 一致の1件を取得（無ければ null）。
 */
async function fetchAdminItem(slug) {
    const res = await fetch(ADMIN_NEWS_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`admin-news.json 取得失敗: ${res.status}`);
    const list = await res.json();
    const hit = (Array.isArray(list) ? list : []).find(x => (x.slug || x.id) === slug);
    return hit ? normalizeItem(hit, 'admin') : null;
}

/**
 * microCMS から id 一致の1件を取得（未公開・存在しない場合は null）。
 * draftKey を渡すと下書きを取得（プレビュー）。
 */
async function fetchMicrocmsItem(cfg, id, draftKey) {
    let url = `https://${cfg.serviceDomain}.microcms.io/api/v1/${cfg.endpoint}/${encodeURIComponent(id)}`;
    if (draftKey) url += `?draftKey=${encodeURIComponent(draftKey)}`;

    const res = await fetch(url, {
        headers: { 'X-MICROCMS-API-KEY': cfg.apiKey }
    });
    if (res.status === 404) return null;       // 未公開・存在しない
    if (!res.ok) throw new Error(`microCMS 取得失敗: ${res.status}`);

    const item = normalizeItem(await res.json(), 'microcms');
    if (draftKey) item.isDraft = true;
    return item;
}

/**
 * admin-news.json の全件を取得。
 */
async function fetchAdminList() {
    const res = await fetch(ADMIN_NEWS_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`admin-news.json 取得失敗: ${res.status}`);
    const list = await res.json();
    return (Array.isArray(list) ? list : []).map(x => normalizeItem(x, 'admin'));
}

/**
 * microCMS の公開済みお知らせ一覧を取得（未設定なら空配列）。
 */
async function fetchMicrocmsList(cfg) {
    if (!cfg || !cfg.serviceDomain || cfg.serviceDomain.startsWith('YOUR_')) {
        return [];
    }
    const url = `https://${cfg.serviceDomain}.microcms.io/api/v1/${cfg.endpoint}`
        + `?limit=${cfg.limit || 100}`;
    const res = await fetch(url, {
        headers: { 'X-MICROCMS-API-KEY': cfg.apiKey }
    });
    if (!res.ok) throw new Error(`microCMS 取得失敗: ${res.status}`);
    const json = await res.json();
    return (json.contents || []).map(c => normalizeItem(c, 'microcms'));
}

/**
 * 全ソースを統合したお知らせ一覧を返す（日付の降順）。
 * slug が重複する場合は microCMS を優先。
 * 片方のソースが落ちても、もう片方は表示する（allSettled）。
 */
async function loadNewsList() {
    const cfg = window.NEWS_CONFIG;
    const results = await Promise.allSettled([fetchMicrocmsList(cfg), fetchAdminList()]);
    results.forEach(r => {
        if (r.status === 'rejected') console.warn('お知らせ一覧の取得エラー:', r.reason);
    });

    // admin → microcms の順に入れて、同一slugはmicroCMSで上書き（優先）
    const bySlug = new Map();
    const admin = results[1].status === 'fulfilled' ? results[1].value : [];
    const cms = results[0].status === 'fulfilled' ? results[0].value : [];
    [...admin, ...cms].forEach(item => bySlug.set(item.slug, item));

    return Array.from(bySlug.values())
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * URLの ?id= と ?draftKey= を読み、該当記事を解決して返す。
 *   { item, isPreview, notFound }
 * 優先順位: 下書き > microCMS公開 > admin-news.json
 */
async function loadNewsDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const draftKey = params.get('draftKey');

    if (!id) return { item: null, isPreview: false, notFound: true };

    const isPreview = !!draftKey;
    const cfg = window.NEWS_CONFIG;
    const cmsReady = cfg && cfg.serviceDomain && !cfg.serviceDomain.startsWith('YOUR_');

    const candidates = [];

    // admin-news.json（ローカル・軽量）
    try {
        const admin = await fetchAdminItem(id);
        if (admin) candidates.push(admin);
    } catch (e) {
        console.warn(e);
    }

    // microCMS（設定済みのときのみ）
    if (cmsReady) {
        try {
            const cms = await fetchMicrocmsItem(cfg, id, isPreview ? draftKey : null);
            if (cms) candidates.push(cms);
        } catch (e) {
            console.warn(e);
        }
    }

    const item = candidates.find(c => c.isDraft)
        || candidates.find(c => c.source === 'microcms')
        || candidates.find(c => c.source === 'admin')
        || null;

    return { item, isPreview, notFound: !item };
}
