// ============================================================
// お知らせ 下書きプレビュー（クライアント描画）
// ------------------------------------------------------------
// 公開ページは GitHub Actions で静的生成（build/build.mjs）。
// このファイルは編集者向けの「下書きプレビュー」専用。
//   /kannaigai18/news/preview/?id={CONTENT_ID}&draftKey={DRAFT_KEY}
// microCMS の draftKey を使って未公開の下書きを取得・表示する。
// ============================================================

// news.js 自身の位置から data/ を解決（どのページから読んでも同じ場所を指す）
const NEWS_JS_SRC = (document.currentScript && document.currentScript.src) || '';
const rel = p => (NEWS_JS_SRC ? new URL(p, NEWS_JS_SRC).href : p);
const CATEGORIES_URL = rel('../data/categories.json');
const ADMIN_NEWS_URL = rel('../data/admin-news.json');

let CATEGORIES = [];
async function loadCategories() {
    try {
        CATEGORIES = await (await fetch(CATEGORIES_URL, { cache: 'no-cache' })).json();
    } catch (e) {
        console.warn('categories.json 取得失敗:', e);
        CATEGORIES = [];
    }
}

function resolveCategory(raw) {
    const fallback = CATEGORIES.find(c => c.key === 'general')
        || { key: 'general', label: 'お知らせ', viewpoint: '', color: '#555555' };
    let value = Array.isArray(raw) ? raw[0] : raw;
    if (value && typeof value === 'object') value = value.name || value.label || value.key || value.id;
    if (value === undefined || value === null || value === '') return fallback;
    const display = String(value).trim();
    const lc = display.toLowerCase();
    const matched = CATEGORIES.find(c => c.key.toLowerCase() === lc || c.label.toLowerCase() === lc);
    return matched || { key: 'other', label: display, viewpoint: '', color: '#555555' };
}

function formatNewsDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function normalizeItem(raw, source) {
    const f = (window.NEWS_CONFIG && window.NEWS_CONFIG.fields) || {};
    const titleKey = f.title || 'title';
    const bodyKey = f.body || 'content';
    const dateKey = f.date || 'date';
    const categoryKey = f.category || 'category';
    const dateValue = raw[dateKey] || raw.publishedAt || raw.createdAt || '';
    return {
        slug: raw.slug || raw.id || '',
        title: raw[titleKey] || '(無題)',
        date: dateValue,
        dateDisplay: formatNewsDate(dateValue),
        body: raw[bodyKey] || '',
        category: resolveCategory(raw[categoryKey]),
        source,
        isDraft: false
    };
}

async function fetchAdminItem(slug) {
    const res = await fetch(ADMIN_NEWS_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`admin-news.json 取得失敗: ${res.status}`);
    const list = await res.json();
    const hit = (Array.isArray(list) ? list : []).find(x => (x.slug || x.id) === slug);
    return hit ? normalizeItem(hit, 'admin') : null;
}

async function fetchMicrocmsItem(cfg, id, draftKey) {
    let url = `https://${cfg.serviceDomain}.microcms.io/api/v1/${cfg.endpoint}/${encodeURIComponent(id)}`;
    if (draftKey) url += `?draftKey=${encodeURIComponent(draftKey)}`;
    const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': cfg.apiKey } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`microCMS 取得失敗: ${res.status}`);
    const item = normalizeItem(await res.json(), 'microcms');
    if (draftKey) item.isDraft = true;
    return item;
}

/**
 * ?id= と ?draftKey= を読み、該当記事（下書き含む）を解決して返す。
 *   { item, isPreview, notFound }
 */
async function loadNewsDetail() {
    await loadCategories();

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const draftKey = params.get('draftKey');
    if (!id) return { item: null, isPreview: false, notFound: true };

    const isPreview = !!draftKey;
    const cfg = window.NEWS_CONFIG;
    const cmsReady = cfg && cfg.serviceDomain && !cfg.serviceDomain.startsWith('YOUR_');

    const candidates = [];
    try {
        const admin = await fetchAdminItem(id);
        if (admin) candidates.push(admin);
    } catch (e) { console.warn(e); }

    if (cmsReady) {
        try {
            const cms = await fetchMicrocmsItem(cfg, id, isPreview ? draftKey : null);
            if (cms) candidates.push(cms);
        } catch (e) { console.warn(e); }
    }

    const item = candidates.find(c => c.isDraft)
        || candidates.find(c => c.source === 'microcms')
        || candidates.find(c => c.source === 'admin')
        || null;
    return { item, isPreview, notFound: !item };
}
