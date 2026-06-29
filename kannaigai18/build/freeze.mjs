// ============================================================
// microCMS 切り離し（凍結）スクリプト
// ------------------------------------------------------------
// プロジェクト終了時に「一度だけ」実行する想定。
// build.mjs で生成済みの静的HTMLを走査し、microCMSのCDN画像
// （https://images.microcms-assets.io/...）をローカルにダウンロード
// して相対パスに書き換える。これで microCMS を閉じても画像が生き残る。
//
// 使い方:
//   1) まず通常ビルド:  MICROCMS_... node build/build.mjs
//   2) 続けて凍結:      node build/freeze.mjs
//   3) 生成物＋imagesをコミット（docs/microcms-detach.md 参照）
// ============================================================
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');                 // kannaigai18/
const SITE = 'https://kannaigai.com/kannaigai18';
const CDN_RE = /https:\/\/images\.microcms-assets\.io\/[^\s"'<>)]+/g;

const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 凍結対象の生成HTMLを収集（トップ＋各記事。preview は対象外）
async function collectHtml() {
    const files = [];
    const top = path.join(ROOT, 'index.html');
    if (existsSync(top)) files.push(top);

    const newsDir = path.join(ROOT, 'news');
    if (existsSync(newsDir)) {
        for (const e of await readdir(newsDir, { withFileTypes: true })) {
            if (e.isDirectory() && e.name !== 'preview') {
                const f = path.join(newsDir, e.name, 'index.html');
                if (existsSync(f)) files.push(f);
            }
        }
    }
    return files;
}

// HTMLファイルの site 上の絶対URLベース（og:image 用）
function siteAbsBase(fileAbs) {
    const relDir = path.relative(ROOT, path.dirname(fileAbs)).split(path.sep).join('/');
    return relDir ? `${SITE}/${relDir}` : SITE;
}

// URL からローカル保存ファイル名を決定（param違いも区別できるようハッシュ付与）
function filenameFor(url) {
    let base = decodeURIComponent(url.split('?')[0].split('/').pop() || 'image');
    base = base.replace(/[^\w.\-]/g, '_');
    const dot = base.lastIndexOf('.');
    const ext = dot > 0 ? base.slice(dot) : '';
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 6);
    return `${stem}-${hash}${ext || ''}`;
}

async function download(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`画像取得失敗 ${res.status}: ${url}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

// ---- 実行 ----
const files = await collectHtml();
if (!files.length) {
    console.error('⚠ 生成HTMLが見つかりません。先に build/build.mjs を実行してください。');
    process.exit(1);
}

let totalImg = 0;
for (const file of files) {
    let html = await readFile(file, 'utf8');
    const urls = [...new Set(html.match(CDN_RE) || [])];
    if (!urls.length) continue;

    const imgDir = path.join(path.dirname(file), 'images');
    await mkdir(imgDir, { recursive: true });
    const absBase = siteAbsBase(file);

    for (const url of urls) {
        const name = filenameFor(url);
        await download(url, path.join(imgDir, name));
        totalImg++;

        const absUrl = `${absBase}/images/${name}`;   // og:image など絶対URLが要る箇所
        const relUrl = `images/${name}`;               // 本文 <img> など

        // 1) og:image / twitter:image（content="...") は絶対URLに
        html = html.replace(
            new RegExp(`(content=")${escapeReg(url)}(")`, 'g'),
            `$1${absUrl}$2`
        );
        // 2) 残り（本文の画像など）は相対パスに
        html = html.split(url).join(relUrl);
    }

    await writeFile(file, html);
    console.log(`  ローカル化 ${urls.length}枚: ${path.relative(ROOT, file)}`);
}

console.log(`✅ 凍結完了: 画像 ${totalImg} 枚をローカル化（${files.length} ページ走査）`);
console.log('   次は docs/microcms-detach.md の手順で生成物＋imagesをコミットしてください。');
