// アニメーションタイミング定数
const TIMING = {
    INITIAL_PAUSE: 1000,      // 画面中央での静止時間
    LOGO_MOVEMENT: 2000,      // ロゴ移動にかかる時間
    OVERLAY_FADE: 600,        // オーバーレイフェードアウト時間
    SECTION_INTERVAL: 300     // セクション間のフェードイン間隔
};

// CSS transitionのeasing関数
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * 要素の位置とサイズをfixedポジションで固定
 */
function fixElementPosition(element, rect) {
    element.style.position = 'fixed';
    element.style.top = rect.top + 'px';
    element.style.left = rect.left + 'px';
    element.style.width = rect.width + 'px';
    element.style.transition = `all ${TIMING.LOGO_MOVEMENT}ms ${EASING}`;
}

/**
 * ロゴをターゲット位置に移動
 * ブラウザの再描画を挟んでスムーズなトランジションを実現
 */
function moveLogoToTarget(element, targetRect) {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            element.style.top = targetRect.top + 'px';
            element.style.left = targetRect.left + 'px';
            element.style.width = targetRect.width + 'px';
        });
    });
}

/**
 * オーバーレイをフェードアウトして削除
 */
function fadeOutOverlay(overlay) {
    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.style.display = 'none';
    }, TIMING.OVERLAY_FADE);
}

/**
 * コンテンツセクションを順次フェードイン
 */
function fadeInSections(sections) {
    sections.forEach((section, index) => {
        setTimeout(() => {
            section.classList.add('visible');
        }, index * TIMING.SECTION_INTERVAL);
    });
}

/**
 * オープニングアニメーションのメイン処理
 */
function runOpeningAnimation() {
    // DOM要素の取得
    const openingOverlay = document.getElementById('openingOverlay');
    const openingLogoWrapper = document.querySelector('.opening-logo-wrapper');
    const logoWrapper = document.querySelector('.logo-wrapper');
    const sections = document.querySelectorAll('.fade-in-section');

    // 初期位置を取得して固定
    const startRect = openingLogoWrapper.getBoundingClientRect();
    fixElementPosition(openingLogoWrapper, startRect);

    // アニメーションシーケンス開始
    setTimeout(() => {
        // ターゲット位置を取得
        const targetRect = logoWrapper.getBoundingClientRect();

        // ロゴを移動
        moveLogoToTarget(openingLogoWrapper, targetRect);

        // 移動完了後の処理
        setTimeout(() => {
            fadeOutOverlay(openingOverlay);
            fadeInSections(sections);
        }, TIMING.LOGO_MOVEMENT);

    }, TIMING.INITIAL_PAUSE);
}

/**
 * アーカイブリストの展開/折りたたみ機能
 */
function initArchiveToggle() {
    const toggleButton = document.getElementById('archiveToggle');
    const archiveList = document.querySelector('.archive-list');
    const toggleText = document.querySelector('.archive-toggle-text');

    if (!toggleButton || !archiveList) return;

    toggleButton.addEventListener('click', () => {
        const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            // 折りたたむ
            archiveList.classList.remove('expanded');
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleText.textContent = 'もっと見る';
        } else {
            // 展開する
            archiveList.classList.add('expanded');
            toggleButton.setAttribute('aria-expanded', 'true');
            toggleText.textContent = '閉じる';
        }
    });
}

// DOMの読み込み完了後の初期化
document.addEventListener('DOMContentLoaded', () => {
    // オープニングアニメーション無効化 - セクションを即座に表示
    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach(section => section.classList.add('visible'));

    initArchiveToggle();
});
