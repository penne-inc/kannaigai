/* ============================================================
   トップページ：スクロールに応じた登場演出
   ------------------------------------------------------------
   JSが動いたときだけ html に .js-reveal を付け、そこから初めて
   要素を隠す。JS無効・スクリプトエラー時は全要素が最初から見える。
   ============================================================ */
(function () {
    'use strict';

    var root = document.documentElement;
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    // 動きを抑える設定なら何もしない（要素は表示されたまま）
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // IntersectionObserver 非対応のブラウザでも内容は見える
    if (!('IntersectionObserver' in window)) return;

    root.classList.add('js-reveal');

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
        });
    }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.08
    });

    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
})();
