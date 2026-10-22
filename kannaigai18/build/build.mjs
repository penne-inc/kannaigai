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

// ローカル用：kannaigai18/.env があれば読み込む（.gitignore 済み）。
// CI では .env がなく Secrets の環境変数が使われるので、読み込みは失敗しても無視する。
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* .env なし */ }

const SERVICE = process.env.MICROCMS_SERVICE_DOMAIN || '';
const APIKEY = process.env.MICROCMS_API_KEY || '';
const ENDPOINT = process.env.MICROCMS_ENDPOINT || 'news';

// microCMS フィールド名（スキーマに合わせて変更可）
const FIELDS = { title: 'title', body: 'content', date: 'date', category: 'category', image: 'eyecatch' };

// ---- ユーティリティ ----
const categories = JSON.parse(await readFile(path.join(ROOT, 'data/categories.json'), 'utf8'));
const projects = JSON.parse(await readFile(path.join(ROOT, 'data/projects.json'), 'utf8'));
const meet = JSON.parse(await readFile(path.join(ROOT, 'data/meet.json'), 'utf8'));

function resolveCategory(raw) {
    const fallback = categories.find(c => c.key === 'general')
        || { key: 'general', label: 'お知らせ', viewpoint: '', color: '#dde5e8', ink: '#4a5a62' };
    let value = Array.isArray(raw) ? raw[0] : raw;
    if (value && typeof value === 'object') value = value.name || value.label || value.key || value.id;
    if (value === undefined || value === null || value === '') return fallback;
    const display = String(value).trim();
    const lc = display.toLowerCase();
    const matched = categories.find(c => c.key.toLowerCase() === lc || c.label.toLowerCase() === lc);
    return matched || { key: 'other', label: display, viewpoint: '', color: '#dde5e8', ink: '#4a5a62' };
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
function head({ title, description, url, image, noindex = false, cssPath, ogType = 'article' }) {
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

    <meta property="og:type" content="${ogType}">
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
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..800&amp;family=Noto+Sans+JP:wght@400;500;700&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700;900&amp;display=swap" rel="stylesheet">
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
    return `${head({ title: `${item.title}｜関内外OPEN!18`, description, url, image, cssPath: ['../../css/news.css', '../../css/top.css'] })}
<body class="page-news">
    <nav class="page-nav"><a href="../../">← 関内外OPEN!18</a></nav>

    <main class="news-page">
        <article class="news-detail">
            <div class="news-meta">
                <span class="news-date">${esc(item.dateDisplay)}</span>
                ${categoryBadge(item.category)}
            </div>
            <div class="news-main">
                <h1 class="news-title">${esc(item.title)}</h1>
                <div class="news-body">${item.body}</div>
                <p class="news-back-wrap"><a class="news-back" href="../../#news">← お知らせ一覧へ</a></p>
            </div>
        </article>
    </main>

${siteFooter()}
</body>
</html>
`;
}

// ---- メインビジュアル（PSDレイヤー分解アニメーション）----
// 座標は ito_kv_idea_18_0831_ol-03.psd の 1920x1080 キャンバス基準。
// PSDの実数値をそのまま持ち、% 変換はビルド時に行う（差し替え時の照合を容易にするため）。
const KV_W = 1920, KV_H = 1080;

// 円は切り抜かず1枚絵のまま使う。
// 4つのPSD（ol-01〜04）にはそれぞれ完全な円が2つ入っており、合計8種類。
// 配色は「黄→水色→緑→ピンク」の回転順列4パターン × ラフ/クリーンの2系統で、
// 順に切り替えるだけで色が1段ずつずれる巡回演出になる。
//
// 以前は円を同心4リングに切り分けて個別に逆回転させていたが、
// 切断面に隣接色が混ざって境界に濁った縁が出た。またテクスチャを
// グレースケール化して再着色すると、絵の具の色相・彩度の変化が失われて
// 質感がフラットになった。1枚絵ならどちらも起きない。
const KV_CIRCLE_BOX = { w: 955, h: 955 };
const KV_CIRCLES = [
    { side: 'l', x: 2,   y: 122, dir: 'cw',  spin: 96,  delay: 0.15, phase: 0 },
    { side: 'r', x: 962, y: 122, dir: 'ccw', spin: 124, delay: 0.30, phase: -12 }
];
// 8種類を48秒周期で巡回（1枚あたり6秒、うち3秒でゆっくり重ねて切り替える）。
// 配色パターンは4種（色の回転順列）しかないため、右円の位相は2枚分だけずらす。
// 4枚分ずらすと一周して左右が同じ配色になってしまう。
// 並びは クリーン系(ol-03/04) → ラフ系(ol-01/02) の順。
const KV_VARIANTS = ['05', '06', '07', '08', '01', '02', '03', '04'];
const KV_CYCLE = 48;   // 1枚6秒 × 8種類。css/top.css の kvFaceSwap の周期と揃えること

const KV_PARTS = [
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

// 円1つ = 8種類の画像を重ね、順に1枚ずつ表に出す。
function kvCircle(c) {
    const box = `left:${pct(c.x, KV_W)};top:${pct(c.y, KV_H)};`
        + `width:${pct(KV_CIRCLE_BOX.w, KV_W)};height:${pct(KV_CIRCLE_BOX.h, KV_H)}`;

    const step = KV_CYCLE / KV_VARIANTS.length;
    const imgs = KV_VARIANTS.map((v, n) => {
        // 負のdelayは「アニメーションが進んだ状態」で始まる。n枚目を n*step 秒後に
        // 出したいので、加算する（phase で左右をずらす）。
        const delay = n * step + c.phase;
        return `                <img class="kv-face" src="image/kv/circle-${v}.webp"`
            + ` width="720" height="720" alt="" decoding="async"`
            + ` style="animation-delay:${delay}s">`;
    }).join('\n');

    return `            <div class="kv-circle kv-circle--${c.dir}" data-side="${c.side}"`
        + ` style="${box};--spin:${c.spin}s;animation-delay:${c.delay}s, ${c.delay}s">
${imgs}
            </div>`;
}

function kvStage() {
    const circles = KV_CIRCLES.map(kvCircle).join('\n');

    const parts = KV_PARTS.map(p => {
        const style = `left:${pct(p.x, KV_W)};top:${pct(p.y, KV_H)};width:${pct(p.w, KV_W)};animation-delay:${p.delay}s`;
        const inner = `<img src="image/kv/${p.f}.webp" width="${p.w}" height="${p.h}" alt="" decoding="async">`;
        return `            <div class="kv-part ${p.cls}" style="${style}">${inner}</div>`;
    }).join('\n');

    return `        <div class="kv-stage" role="img"
             aria-label="関内外OPEN!18 みなれた街の、視点を変える。発見・共創・交流・発酵">
${circles}
${parts}
        </div>
        <img class="kv-sp" src="image/kv-sp.webp" width="1080" height="1920"
             alt="関内外OPEN!18 みなれた街の、視点を変える。発見・共創・交流・発酵" fetchpriority="high">`;
}

// 未確定（null）のフィールドは行ごと省く。確定したら data/projects.json に値を入れれば現れる。
function factRow(label, value) {
    if (!value) return '';
    return `                    <dt>${esc(label)}</dt><dd>${esc(value)}</dd>`;
}

// 配列・複数行の値（改行区切りで表示）
function factList(label, list, tag = 'span') {
    if (!list || !list.length) return '';
    const items = list.map(t => `<${tag} class="fact-item">${esc(t)}</${tag}>`).join('');
    return `                    <dt>${esc(label)}</dt><dd class="fact-list">${items}</dd>`;
}

function projectCard(p) {
    const cat = categories.find(c => c.key === p.key) || {};
    const color = cat.color || '#dde5e8';   // 面（バッジ背景・装飾円）＝KVの鮮やかな色
    const ink = cat.ink || '#4a5a62';       // 文字（サブタイトル・リンク）＝濃色

    const links = p.links && p.links.length
        ? `                    <dt>関連リンク</dt><dd>${p.links.map(l => /^https?:/.test(l.url)
            ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`
            : `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(' ／ ')}</dd>`
        : '';

    const facts = [
        factRow('日時', p.schedule),
        factRow('協働パートナー', p.partners),
        factList('内容', p.programs),
        factRow('会場', p.venue),
        factList('ツアー会場', p.tourVenues),
        factList('参加', p.participants),
        factRow('担当', p.lead),
        links
    ].filter(Boolean).join('\n');

    // 写真枠：data/projects.json の image（例: "image/projects/meet.webp"）を入れると差し替わる。
    // 未設定の間は「PHOTO」と表示した空の枠を出す。
    const photoInner = p.image
        ? `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.title)}" loading="lazy" decoding="async">`
        : `<span class="project-photo-empty">PHOTO</span>`;
    const photo = `<figure class="project-photo${p.image ? '' : ' is-empty'}">`
        + `<div class="project-photo-frame">${photoInner}</div>`
        + (p.credit ? `<figcaption>${esc(p.credit)}</figcaption>` : '')
        + `</figure>`;

    return `            <article class="project reveal" style="--p-color:${esc(color)};--p-ink:${esc(ink)}">
                <div class="project-head">
                    <span class="project-no">PROJECT ${esc(p.no)}</span>
                    <span class="project-viewpoint">${esc(p.viewpoint)}</span>
                    ${photo}
                </div>
                <h3 class="project-title">${esc(p.title)}</h3>
                <p class="project-subtitle">${esc(p.subtitle)}</p>
                <p class="project-body">${esc(p.body)}</p>
${facts ? `                <dl class="project-facts">\n${facts}\n                </dl>\n` : ''}${p.key === 'meet' ? meetDetail(meet) + '\n' : ''}            </article>`;
}

// クレジット表記（フッター・開催概要で共通）。文言は主催者指定のものをそのまま使う
const CREDITS = [
    ['主催', '関内外OPEN!18事務局（関内外クリエイターズ、アーツコミッション・ヨコハマ（公益財団法人横浜市芸術文化振興財団））'],
    ['共催', '横浜市にぎわいスポーツ文化局']
];
const GRANT = '令和８年度　文化庁　文化芸術創造拠点形成事業';

function siteFooter() {
    return `    <footer class="site-footer">
        <ul class="sns">
            <li><a href="https://kannaigai.com/" target="_blank" rel="noopener">HP</a></li>
            <li><a href="https://www.instagram.com/kannaigaiopen/" target="_blank" rel="noopener">Instagram</a></li>
            <li><a href="https://www.facebook.com/kannaigaiopen/" target="_blank" rel="noopener">Facebook</a></li>
        </ul>
        <div class="credits">
            ${CREDITS.map(([k, v]) => `<p>${esc(k)}：${esc(v)}</p>`).join('\n            ')}
            <p>${esc(GRANT)}</p>
        </div>
        <p class="copy">&copy; 関内外OPEN! ／ 関内外クリエイターズ</p>
    </footer>`;
}

// 年間スケジュールのセクションは非表示中。true にすると再表示される。
const SHOW_SCHEDULE = false;

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
        ogType: 'website',
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

${SHOW_SCHEDULE ? `        <section class="section reveal" id="schedule">
            <div class="section-head"><h2 class="en">SCHEDULE</h2><span class="ja">年間スケジュール</span></div>
            <ul class="schedule">
${scheduleRows}
            </ul>
        </section>` : ''}

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
                ${CREDITS.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('\n                ')}
                <dt>助成</dt><dd>${esc(GRANT)}</dd>
            </dl>
        </section>
    </main>

${siteFooter()}

    <script src="js/top.js" defer></script>
</body>
</html>
`;
}

// ---- MEET関内外 概要（data/meet.json）：プロジェクト03の枠に差し込む ----
const linkOrText = v => v.url
    ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.name)}</a>`
    : esc(v.name);

function meetDetail(m) {
    const wd = m.date.weekday.map(w => `<span class="maru">${esc(w)}</span>`).join('<span class="dot-sep">・</span>');
    const courses = m.tour.courses.map(c => `                <article class="course">
                    <div class="course-time">
                        <span class="course-label">COURSE ${esc(c.label)}</span>
                        <span class="course-hours">${esc(c.time)}</span>
                    </div>
                    <div class="course-body">
                        <h4 class="course-place">${esc(c.place)}</h4>
                        <ul class="course-visits">${c.visits.map(v => `<li>${linkOrText(v)}</li>`).join('')}</ul>
                        <p class="course-conductor"><span>コンダクター</span>${c.conductors.map(esc).join(' ＋ ')}</p>
                    </div>
                </article>`).join('\n');
    const notes = m.notes.map(n => `                    <li>${esc(n)}</li>`).join('\n');

    return `                <div class="meet-detail">
                <p class="meet-date"><span class="md">${esc(m.date.md)}</span>${wd}<span class="time">${esc(m.date.time)}</span></p>
                <h4 class="meet-sub">${esc(m.tour.heading)}</h4>
                <p class="meet-lead">${esc(m.tour.lead)}</p>
                <div class="courses">
${courses}
                </div>
                <dl class="project-facts">
                    <dt>集合場所</dt><dd>${esc(m.tour.meeting)}</dd>
                    <dt>定員</dt><dd>${esc(m.tour.capacity)}</dd>
                </dl>
                <p class="meet-cta"><a class="cta" href="${esc(m.applyUrl)}" target="_blank" rel="noopener">スタジオツアーの申し込み（Peatix）</a></p>
                <details class="notes-box">
                    <summary>注意事項</summary>
                    <ul class="notes">
${notes}
                    </ul>
                </details>
                </div>`;
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
