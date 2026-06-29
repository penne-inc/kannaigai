// ============================================================
// kannaigai18 お知らせ 静的サイト生成（SSG）
// ------------------------------------------------------------
// microCMS（公開済み）＋ data/admin-news.json をマージし、
//   - トップ:   kannaigai18/index.html（お知らせ一覧）
//   - 詳細:     kannaigai18/news/{slug}/index.html（記事ごとOGP付き）
// を生成する。GitHub Actions（ビルド時）でも、ローカルでも実行可能。
//
// 環境変数（GitHub Secrets で渡す。未設定なら admin-news.json のみ生成）:
//   MICROCMS_SERVICE_DOMAIN, MICROCMS_API_KEY, (任意) MICROCMS_ENDPOINT
// ============================================================
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');            // kannaigai18/
const SITE = 'https://kannaigai.com/kannaigai18';
const DEFAULT_OGP = `${SITE}/image/ogp.png`;

const SERVICE = process.env.MICROCMS_SERVICE_DOMAIN || '';
const APIKEY = process.env.MICROCMS_API_KEY || '';
const ENDPOINT = process.env.MICROCMS_ENDPOINT || 'news';

// microCMS フィールド名（スキーマに合わせて変更可）
const FIELDS = { title: 'title', body: 'content', date: 'date', category: 'category', image: 'eyecatch' };

// ---- ユーティリティ ----
const categories = JSON.parse(await readFile(path.join(ROOT, 'data/categories.json'), 'utf8'));

function resolveCategory(raw) {
    const fallback = categories.find(c => c.key === 'general')
        || { key: 'general', label: 'お知らせ', viewpoint: '', color: '#555555' };
    let value = Array.isArray(raw) ? raw[0] : raw;
    if (value && typeof value === 'object') value = value.name || value.label || value.key || value.id;
    if (value === undefined || value === null || value === '') return fallback;
    const display = String(value).trim();
    const lc = display.toLowerCase();
    const matched = categories.find(c => c.key.toLowerCase() === lc || c.label.toLowerCase() === lc);
    return matched || { key: 'other', label: display, viewpoint: '', color: '#555555' };
}

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const stripTags = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
function excerpt(html, n = 100) {
    const t = stripTags(html);
    return t.length > n ? t.slice(0, n) + '…' : t;
}
function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// ---- データ取得 ----
async function fetchMicrocms() {
    if (!SERVICE || !APIKEY || SERVICE.startsWith('YOUR_')) {
        console.warn('⚠ microCMS未設定: admin-news.json のみで生成します');
        return [];
    }
    const out = [];
    let offset = 0;
    const limit = 100;
    while (true) {
        const url = `https://${SERVICE}.microcms.io/api/v1/${ENDPOINT}?limit=${limit}&offset=${offset}`;
        const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': APIKEY } });
        if (!res.ok) throw new Error(`microCMS ${res.status}: ${await res.text()}`);
        const j = await res.json();
        out.push(...(j.contents || []));
        offset += limit;
        if (offset >= (j.totalCount || 0)) break;
    }
    return out;
}

function normalize(raw, source) {
    const dateVal = raw[FIELDS.date] || raw.publishedAt || raw.createdAt || '';
    const imageRaw = raw[FIELDS.image];
    const image = (imageRaw && imageRaw.url) ? imageRaw.url : (raw.image || '');
    return {
        slug: raw.slug || raw.id || '',
        title: raw[FIELDS.title] || '(無題)',
        body: raw[FIELDS.body] || '',
        date: dateVal,
        dateDisplay: fmtDate(dateVal),
        category: resolveCategory(raw[FIELDS.category]),
        image,
        source
    };
}

// ---- テンプレート ----
function head({ title, description, url, image, noindex = false, cssPath }) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    ${noindex ? '<meta name="robots" content="noindex">' : ''}
    <link rel="canonical" href="${esc(url)}">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="関内外OPEN!18">
    <meta property="og:url" content="${esc(url)}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${esc(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${esc(image)}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${cssPath}">
</head>`;
}

function categoryBadge(cat) {
    const vp = cat.viewpoint ? `<span class="viewpoint">${esc(cat.viewpoint)}</span>` : '';
    return `<span class="news-category" style="--cat-color:${esc(cat.color)}">${esc(cat.label)}${vp}</span>`;
}

function detailHtml(item) {
    const url = `${SITE}/news/${item.slug}/`;
    const description = excerpt(item.body) || item.title;
    const image = item.image || DEFAULT_OGP;
    return `${head({ title: `${item.title}｜関内外OPEN!18`, description, url, image, cssPath: '../../css/news.css' })}
<body>
    <div class="news-wrap">
        <article class="news-detail">
            <div class="news-meta">
                <span class="news-date">${esc(item.dateDisplay)}</span>
                ${categoryBadge(item.category)}
            </div>
            <h1 class="news-title">${esc(item.title)}</h1>
            <div class="news-body">${item.body}</div>
            <p class="news-back-wrap"><a class="news-back" href="../../">← 関内外OPEN!18 トップへ</a></p>
        </article>
    </div>
</body>
</html>
`;
}

function topHtml(items) {
    const listItems = items.map(item => `            <li class="news-list-item">
                <a href="news/${esc(item.slug)}/" class="news-list-link">
                    <span class="news-date">${esc(item.dateDisplay)}</span>
                    ${categoryBadge(item.category)}
                    <span class="news-list-title">${esc(item.title)}</span>
                </a>
            </li>`).join('\n');

    const list = items.length
        ? `<ul class="news-list">\n${listItems}\n        </ul>`
        : `<div class="news-empty">現在お知らせはありません。</div>`;

    return `${head({
        title: '関内外OPEN!18',
        description: 'みなれたまちの、視点を変える。2026年7月〜2027年2月',
        url: `${SITE}/`,
        image: DEFAULT_OGP,
        cssPath: 'css/news.css'
    })}
<body>
    <style>
        body { font-family: 'Noto Sans JP', sans-serif; margin: 0; color: #1a1a1a; }
        .top-hero { text-align: center; padding: 80px 24px 48px; }
        .top-hero h1 { font-size: 2rem; letter-spacing: 0.06em; margin: 0 0 12px; }
        .top-hero .sub { color: #777; font-size: 1rem; margin: 0 0 8px; }
        .top-hero .period { color: #999; font-size: 0.85rem; margin: 0; }
        .top-note { text-align: center; font-size: 0.8rem; color: #bbb; padding: 32px 0 64px; }
    </style>
    <header class="top-hero">
        <h1>関内外OPEN!18</h1>
        <p class="sub">みなれたまちの、視点を変える。</p>
        <p class="period">2026年7月 〜 2027年2月</p>
    </header>
    <main class="news-wrap">
        <div class="news-heading"><span class="en">NEWS</span><span class="ja">お知らせ</span></div>
        ${list}
    </main>
    <p class="top-note">サイト準備中</p>
</body>
</html>
`;
}

// ---- 既存の生成物を掃除（preview は残す）----
async function cleanGenerated() {
    const newsDir = path.join(ROOT, 'news');
    let entries = [];
    try {
        entries = await readdir(newsDir, { withFileTypes: true });
    } catch { return; }
    for (const e of entries) {
        if (e.isDirectory() && e.name !== 'preview') {
            await rm(path.join(newsDir, e.name), { recursive: true, force: true });
        }
    }
}

// ---- 実行 ----
const cms = (await fetchMicrocms()).map(c => normalize(c, 'microcms'));
const adminRaw = JSON.parse(await readFile(path.join(ROOT, 'data/admin-news.json'), 'utf8'));
const admin = (Array.isArray(adminRaw) ? adminRaw : []).map(a => normalize(a, 'admin'));

// slug 重複は microCMS を優先（admin → cms の順で上書き）
const bySlug = new Map();
[...admin, ...cms].forEach(i => bySlug.set(i.slug, i));
const items = [...bySlug.values()]
    .filter(i => i.slug)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

await cleanGenerated();
await writeFile(path.join(ROOT, 'index.html'), topHtml(items));
for (const item of items) {
    const dir = path.join(ROOT, 'news', item.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), detailHtml(item));
}

console.log(`✅ 生成完了: 記事 ${items.length} 件 (microCMS ${cms.length} / admin ${admin.length})`);
items.forEach(i => console.log(`   - /news/${i.slug}/  [${i.category.label}] ${i.title}`));
