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

/**
 * モバイルナビゲーションのモーダル機能
 */
function initNavToggle() {
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('nav-toggle');
    const navModal = document.getElementById('nav-modal');

    if (!navToggle || !navModal) return;

    const navLinks = navModal.querySelectorAll('a');

    // トグルボタンのクリックイベント
    navToggle.addEventListener('click', () => {
        const isOpen = nav.classList.contains('is-open');

        if (isOpen) {
            closeNav();
        } else {
            openNav();
        }
    });

    // リンククリックでモーダルを閉じる
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeNav();
        });
    });

    // モーダル背景クリックで閉じる
    navModal.addEventListener('click', (e) => {
        if (e.target === navModal) {
            closeNav();
        }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
            closeNav();
        }
    });

    function openNav() {
        nav.classList.add('is-open');
        navModal.classList.add('is-open');
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.setAttribute('aria-label', 'メニューを閉じる');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        nav.classList.remove('is-open');
        navModal.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'メニューを開く');
        document.body.style.overflow = '';
    }
}

/**
 * 目がマウスを追従するアニメーション
 */
function initEyeTracking() {
    const eyes = document.querySelectorAll('.hero-mv-eye');

    if (eyes.length === 0) return;

    // 最大移動量（px）
    const MAX_MOVE = 15;

    // マウス位置を追跡
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isMouseMoving = false;

    // マウス移動イベント
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isMouseMoving = true;
    });

    // アニメーションループ
    function updateEyes() {
        eyes.forEach(eye => {
            const rect = eye.getBoundingClientRect();
            const eyeCenterX = rect.left + rect.width / 2;
            const eyeCenterY = rect.top + rect.height / 2;

            // マウスへの角度を計算
            const deltaX = mouseX - eyeCenterX;
            const deltaY = mouseY - eyeCenterY;
            const angle = Math.atan2(deltaY, deltaX);

            // 距離を計算（近いほど大きく動く、遠いと最大値）
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const moveAmount = Math.min(MAX_MOVE, distance * 0.05);

            // 移動量を計算
            const moveX = Math.cos(angle) * moveAmount;
            const moveY = Math.sin(angle) * moveAmount;

            // transform を適用
            eye.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });

        requestAnimationFrame(updateEyes);
    }

    // アニメーション開始
    requestAnimationFrame(updateEyes);
}

/**
 * ナビゲーションのスクロールフェードイン（Intersection Observer使用）
 */
function initNavScrollFadeIn() {
    const nav = document.getElementById('nav');
    const heroHeader = document.querySelector('.hero-header');

    if (!nav || !heroHeader) {
        console.warn('Nav or hero-header not found');
        return;
    }

    // hero-headerを監視
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // hero-headerが画面外に出たらnavを表示
            if (!entry.isIntersecting) {
                nav.classList.add('is-visible');
            } else {
                nav.classList.remove('is-visible');
            }
        });
    }, {
        threshold: 0,
        rootMargin: '0px'
    });

    observer.observe(heroHeader);
}

/**
 * ローディングオーバーレイの制御
 * デスクトップのみ画像を読み込み、スマホでは読み込まない
 * 初回訪問時は2秒間表示、次回以降はスキップ
 */
function initLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const MOBILE_BREAKPOINT = 768;
    const STORAGE_KEY = 'kannaigai17_visited';
    const FIRST_VISIT_DURATION = 3000;

    if (!loadingOverlay) return;

    // 訪問済みかチェック
    const hasVisited = localStorage.getItem(STORAGE_KEY);

    // 訪問済みの場合はスキップ
    if (hasVisited) {
        loadingOverlay.classList.add('is-hidden');
        return;
    }

    // 初回訪問をマーク
    localStorage.setItem(STORAGE_KEY, 'true');

    // スマホの場合は画像を読み込まず、指定時間後にローディングを終了
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
        setTimeout(() => {
            loadingOverlay.classList.add('is-hidden');
        }, FIRST_VISIT_DURATION);
        return;
    }

    // デスクトップの場合: vue-readyイベントで画像読み込み完了を監視
    window.addEventListener('vue-ready', () => {
        const heroMv = document.querySelector('.hero-mv');

        if (!heroMv) {
            loadingOverlay.classList.add('is-hidden');
            return;
        }

        const images = heroMv.querySelectorAll('.hero-mv-image');
        let loadedCount = 0;
        const totalImages = images.length;
        let imagesLoaded = false;
        let timerFinished = false;

        function tryHideOverlay() {
            if (imagesLoaded && timerFinished) {
                loadingOverlay.classList.add('is-hidden');
            }
        }

        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount >= totalImages) {
                imagesLoaded = true;
                tryHideOverlay();
            }
        }

        // タイマー
        setTimeout(() => {
            timerFinished = true;
            tryHideOverlay();
        }, FIRST_VISIT_DURATION);

        if (totalImages === 0) {
            imagesLoaded = true;
            timerFinished = true;
            tryHideOverlay();
            return;
        }

        // 画像読み込み完了を監視
        images.forEach(img => {
            if (img.complete) {
                checkAllLoaded();
            } else {
                img.addEventListener('load', checkAllLoaded);
                img.addEventListener('error', checkAllLoaded);
            }
        });
    });

    // フォールバック: 5秒後に強制的に非表示
    setTimeout(() => {
        loadingOverlay.classList.add('is-hidden');
    }, 5000);
}

/**
 * プロジェクトカードのスクロール連動揺れアニメーション
 */
function initProjectCardShake() {
    const cards = document.querySelectorAll('.project-card');

    if (cards.length === 0) return;

    // 揺れのパラメータ
    const SHAKE_INTENSITY = 4; // 最大揺れ幅（px）
    const ROTATE_INTENSITY = 1.5; // 最大回転角度（deg）
    const SHAKE_SPEED = 0.015; // 揺れの速度係数
    const DECAY_RATE = 0.95; // 減衰率

    let lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    let currentIntensity = 0;

    // 各カードの位相（バラバラに動くように）
    const cardPhases = new Map();
    cards.forEach((card, index) => {
        cardPhases.set(card, index * Math.PI / 2);
    });

    // IntersectionObserverでビューポート内のカードを検出
    const visibleCards = new Set();
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                visibleCards.add(entry.target);
            } else {
                visibleCards.delete(entry.target);
                // 画面外に出たらリセット
                entry.target.style.setProperty('--shake-x', '0px');
                entry.target.style.setProperty('--shake-y', '0px');
                entry.target.style.setProperty('--shake-rotate', '0deg');
            }
        });
    }, {
        threshold: 0,
        rootMargin: '50px'
    });

    cards.forEach(card => observer.observe(card));

    // requestAnimationFrameで統合ループ（スクロール監視 + アニメーション）

    function animationLoop() {
        const currentScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);

        // スクロールを検出したら強度を上げる
        if (scrollDelta > 0.5) {
            currentIntensity = Math.min(currentIntensity + scrollDelta * 0.08, 1);
            lastScrollY = currentScrollY;
        }

        // 揺れアニメーション
        if (currentIntensity > 0.01 && visibleCards.size > 0) {
            const time = performance.now() * SHAKE_SPEED;

            visibleCards.forEach(card => {
                const phase = cardPhases.get(card) || 0;

                // サイン波で揺れを生成（カードごとに位相が異なる）
                const shakeX = Math.sin(time + phase) * SHAKE_INTENSITY * currentIntensity;
                const shakeY = Math.cos(time * 1.3 + phase) * SHAKE_INTENSITY * 0.6 * currentIntensity;
                const rotate = Math.sin(time * 0.7 + phase * 0.5) * ROTATE_INTENSITY * currentIntensity;

                card.style.setProperty('--shake-x', `${shakeX}px`);
                card.style.setProperty('--shake-y', `${shakeY}px`);
                card.style.setProperty('--shake-rotate', `${rotate}deg`);
            });

            // 減衰
            currentIntensity *= DECAY_RATE;
        } else if (currentIntensity <= 0.01) {
            // 揺れが止まったらリセット
            visibleCards.forEach(card => {
                card.style.setProperty('--shake-x', '0px');
                card.style.setProperty('--shake-y', '0px');
                card.style.setProperty('--shake-rotate', '0deg');
            });
            currentIntensity = 0;
        }

        requestAnimationFrame(animationLoop);
    }

    // アニメーションループ開始
    requestAnimationFrame(animationLoop);
}

// DOMの読み込み完了後の初期化
document.addEventListener('DOMContentLoaded', () => {
    // ローディング制御
    initLoading();
});

// Vueのデータ読み込み完了後の初期化
window.addEventListener('vue-ready', () => {
    // セクションを表示
    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach(section => section.classList.add('visible'));

    initArchiveToggle();
    initNavToggle();
    initNavScrollFadeIn();
    initEyeTracking();
    initProjectCardShake();
});
