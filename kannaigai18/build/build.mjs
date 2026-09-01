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
const DEFAULT_OGP = `${SITE}/image/ogp.jpg`;

const SERVICE = process.env.MICROCMS_SERVICE_DOMAIN || '';
const APIKEY = process.env.MICROCMS_API_KEY || '';
const ENDPOINT = process.env.MICROCMS_ENDPOINT || 'news';

// microCMS フィールド名（スキーマに合わせて変更可）
const FIELDS = { title: 'title', body: 'content', date: 'date', category: 'category', image: 'eyecatch' };

// ---- ユーティリティ ----
const categories = JSON.parse(await readFile(path.join(ROOT, 'data/categories.json'), 'utf8'));
const projects = JSON.parse(await readFile(path.join(ROOT, 'data/projects.json'), 'utf8'));

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
    const cssLinks = (Array.isArray(cssPath) ? cssPath : [cssPath])
        .map(p => `<link rel="stylesheet" href="${p}">`).join('\n    ');
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
    ${cssLinks}
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

// ---- メインビジュアル（PSDレイヤー分解アニメーション）----
// 座標は ito_kv_idea_18_0831_ol-03.psd の 1920x1080 キャンバス基準。
// PSDの実数値をそのまま持ち、% 変換はビルド時に行う（差し替え時の照合を容易にするため）。
const KV_W = 1920, KV_H = 1080;
const KV_PARTS = [
    { f: 'circle-l', x: 2,    y: 122,  w: 955, h: 955, cls: 'kv-circle', delay: 0.15 },
    { f: 'circle-r', x: 962,  y: 122,  w: 955, h: 955, cls: 'kv-circle', delay: 0.30 },
    { f: 'core-l',   x: 450,  y: 570,  w: 60,  h: 60,  cls: 'kv-pop',    delay: 0.85 },
    { f: 'core-r',   x: 1410, y: 570,  w: 60,  h: 60,  cls: 'kv-pop',    delay: 0.90 },
    { f: 'logo',     x: 16,   y: 16,   w: 547, h: 59,  cls: 'kv-rise',   delay: 1.00 },
    { f: 'year',     x: 15,   y: 83,   w: 63,  h: 15,  cls: 'kv-fade',   delay: 1.15 },
    { f: 'mark',     x: 1847, y: 13,   w: 61,  h: 59,  cls: 'kv-fade',   delay: 1.15 },
    // 「発見・共創・交流・発酵」— 読み順に 0.09s 間隔で出す
    { f: 'ch-01',    x: 1127, y: 227,  w: 105, h: 92,  cls: 'kv-pop',    delay: 1.25 },
    { f: 'ch-02',    x: 1389, y: 230,  w: 103, h: 90,  cls: 'kv-pop',    delay: 1.34 },
    { f: 'ch-03',    x: 1388, y: 393,  w: 101, h: 93,  cls: 'kv-pop',    delay: 1.43 },
    { f: 'ch-04',    x: 1645, y: 392,  w: 105, h: 93,  cls: 'kv-pop',    delay: 1.52 },
    { f: 'ch-05',    x: 1128, y: 714,  w: 103, h: 93,  cls: 'kv-pop',    delay: 1.61 },
    { f: 'ch-06',    x: 1387, y: 714,  w: 105, h: 93,  cls: 'kv-pop',    delay: 1.70 },
    { f: 'ch-07',    x: 1387, y: 881,  w: 105, h: 92,  cls: 'kv-pop',    delay: 1.79 },
    { f: 'ch-08',    x: 1648, y: 880,  w: 104, h: 93,  cls: 'kv-pop',    delay: 1.88 },
    { f: 'copy',     x: 63,   y: 529,  w: 292, h: 140, cls: 'kv-rise',   delay: 2.10 },
    { f: 'url',      x: 121,  y: 1051, w: 157, h: 10,  cls: 'kv-fade',   delay: 2.30 }
];

const pct = (v, total) => `${(v / total * 100).toFixed(4)}%`;

function kvStage() {
    const parts = KV_PARTS.map(p => {
        const style = `left:${pct(p.x, KV_W)};top:${pct(p.y, KV_H)};width:${pct(p.w, KV_W)};animation-delay:${p.delay}s`;
        // 円だけは内側の img を無限にゆっくり回す（登場アニメとtransformが競合しないよう二重化）
        const inner = `<img src="image/kv/${p.f}.webp" width="${p.w}" height="${p.h}" alt="" decoding="async">`;
        return `            <div class="kv-part ${p.cls}" style="${style}">${inner}</div>`;
    }).join('\n');

    return `        <div class="kv-stage" role="img"
             aria-label="関内外OPEN!18 みなれた街の、視点を変える。発見・共創・交流・発酵">
${parts}
        </div>
        <img class="kv-sp" src="image/kv-sp.webp" width="1080" height="1920"
             alt="関内外OPEN!18 みなれた街の、視点を変える。発見・共創・交流・発酵" fetchpriority="high">`;
}

// 未確定フィールドは「情報をお寄せください」プレースホルダで表示する。
// data/projects.json の null をそのまま可視化し、担当者への情報請求リストを兼ねる。
function factRow(label, value, placeholder = '情報をお寄せください') {
    const v = value
        ? esc(value)
        : `<span class="tbd">${esc(placeholder)}</span>`;
    return `                    <dt>${esc(label)}</dt><dd>${v}</dd>`;
}

function projectCard(p) {
    const cat = categories.find(c => c.key === p.key) || {};
    const color = cat.color || '#555555';
    const vivid = cat.vivid || color;

    const links = p.links && p.links.length
        ? p.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(' ／ ')
        : `<span class="tbd">情報をお寄せください</span>`;

    const facts = [
        factRow('協働パートナー', p.partners, '調整中／情報をお寄せください'),
        factRow('スケジュール', p.schedule),
        factRow('会場', p.venue, '調整中／情報をお寄せください'),
        factRow('広報開始', p.prBegin),
        factRow('担当', p.lead),
        `                    <dt>関連リンク</dt><dd>${links}</dd>`
    ].join('\n');

    return `            <article class="project reveal" style="--p-color:${esc(color)};--p-vivid:${esc(vivid)}">
                <div class="project-head">
                    <span class="project-no">PROJECT ${esc(p.no)}</span>
                    <span class="project-viewpoint">${esc(p.viewpoint)}</span>
                </div>
                <h3 class="project-title">${esc(p.title)}</h3>
                <p class="project-subtitle">${esc(p.subtitle)}</p>
                <p class="project-body">${esc(p.body)}</p>
                <dl class="project-facts">
${facts}
                </dl>
            </article>`;
}

const SCHEDULE = [
    ['6月末', '各プロジェクトで連携先等の調整／全体リリース'],
    ['7月', 'プロジェクト始動（〜2月 適宜広報）／アイデアコンポスト ① 開催'],
    ['8月', '持続可能な事業および体制の構築について検討を開始'],
    ['10月', 'MEET KANNAIGAI 広報開始／アイデアコンポスト ② 開催'],
    ['11月', 'MEET KANNAIGAI 開催'],
    ['12月', 'つながるリデザイン 広報開始／アイデアコンポスト ③ 開催'],
    ['1月中旬', '関内外OPEN!18 報告会の広報開始'],
    ['2月下旬', '関内外OPEN!18 報告会'],
    ['3月下旬', 'レポート記事公開']
];

function topHtml(items) {
    const listItems = items.map(item => `                <li class="news-list-item">
                    <a href="news/${esc(item.slug)}/" class="news-list-link">
                        <span class="news-date">${esc(item.dateDisplay)}</span>
                        ${categoryBadge(item.category)}
                        <span class="news-list-title">${esc(item.title)}</span>
                    </a>
                </li>`).join('\n');

    const list = items.length
        ? `<ul class="news-list">\n${listItems}\n            </ul>`
        : `<div class="news-empty">現在お知らせはありません。</div>`;

    const viewpoints = categories
        .filter(c => c.viewpoint)
        .map(c => `<li style="--vp-color:${esc(c.color)}">${esc(c.viewpoint)}</li>`)
        .join('\n                ');

    const scheduleRows = SCHEDULE
        .map(([when, what]) => `                <li><span class="when">${esc(when)}</span><span class="what">${esc(what)}</span></li>`)
        .join('\n');

    return `${head({
        title: '関内外OPEN!18',
        description: 'みなれたまちの、視点を変える。2026年7月〜2027年2月',
        url: `${SITE}/`,
        image: DEFAULT_OGP,
        cssPath: ['css/news.css', 'css/top.css']
    })}
<body>
    <header class="kv">
        <h1 class="sr-only">関内外OPEN!18 ｜ みなれたまちの、視点を変える。</h1>
${kvStage()}
    </header>

    <main>
        <section class="intro reveal">
            <p class="lead">クリエイターとまちと市民をつなぎ、<br>創造的活動を展開する。</p>
            <p>18年目を迎える「関内外OPEN!」は、活動の舞台を関内エリアから横浜全域へと広げます。テーマは「みなれたまちの、視点を変える。」。<strong>発見・共創・交流・発酵</strong> の4つの視点から、継続的な価値創出とコミュニティ形成に取り組みます。あわせて、持続可能な事業および体制の構築についても検討を進めます。</p>
            <ul class="viewpoints">
                ${viewpoints}
            </ul>
        </section>

        <section class="section" id="projects">
            <div class="section-head reveal"><h2 class="en">PROJECTS</h2><span class="ja">4つのプロジェクト</span></div>
            <div class="projects">
${projects.map(projectCard).join('\n')}
            </div>
        </section>

        <section class="section reveal" id="schedule">
            <div class="section-head"><h2 class="en">SCHEDULE</h2><span class="ja">年間スケジュール</span></div>
            <ul class="schedule">
${scheduleRows}
            </ul>
        </section>

        <section class="section reveal" id="news">
            <div class="section-head"><h2 class="en">NEWS</h2><span class="ja">お知らせ</span></div>
            <div class="news-wrap">
                ${list}
            </div>
        </section>

        <section class="section reveal" id="about">
            <div class="section-head"><h2 class="en">ABOUT</h2><span class="ja">開催概要</span></div>
            <dl class="overview">
                <dt>名称</dt><dd>関内外OPEN!18</dd>
                <dt>実施期間</dt><dd>2026年7月 〜 2027年2月</dd>
                <dt>報告会</dt><dd>2027年2月27日(土)／オンライン開催</dd>
                <dt>会場</dt><dd>各プロジェクトごとに調整（報告会はオンライン）</dd>
                <dt>主催</dt><dd>関内外クリエイターズ、アーツコミッション・ヨコハマ（公益財団法人横浜市芸術文化振興財団）</dd>
                <dt>共催</dt><dd>横浜市にぎわいスポーツ文化局（予定）</dd>
            </dl>
        </section>
    </main>

    <footer class="site-footer">
        <ul class="sns">
            <li><a href="https://kannaigai.com/" target="_blank" rel="noopener">HP</a></li>
            <li><a href="https://www.instagram.com/kannaigaiopen/" target="_blank" rel="noopener">Instagram</a></li>
            <li><a href="https://www.facebook.com/kannaigaiopen/" target="_blank" rel="noopener">Facebook</a></li>
        </ul>
        <p class="copy">&copy; 関内外OPEN! ／ 関内外クリエイターズ</p>
    </footer>

    <script src="js/top.js" defer></script>
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
