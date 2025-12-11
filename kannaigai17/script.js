document.addEventListener('DOMContentLoaded', function() {
    const openingOverlay = document.getElementById('openingOverlay');
    const openingLogo = document.getElementById('openingLogo');
    const mainLogo = document.getElementById('mainLogo');
    const fadeInSections = document.querySelectorAll('.fade-in-section');

    // 初期位置を取得（画面中央）
    const openingLogoWrapper = document.querySelector('.opening-logo-wrapper');
    const openingLogoRect = openingLogoWrapper.getBoundingClientRect();
    const startTop = openingLogoRect.top;
    const startLeft = openingLogoRect.left;
    const startWidth = openingLogoRect.width;

    // fixedポジションに変更して初期位置を設定
    openingLogoWrapper.style.position = 'fixed';
    openingLogoWrapper.style.top = startTop + 'px';
    openingLogoWrapper.style.left = startLeft + 'px';
    openingLogoWrapper.style.width = startWidth + 'px';
    openingLogoWrapper.style.transition = 'all 2s cubic-bezier(0.4, 0, 0.2, 1)';

    // (1) 画面中央に表示（1秒間静止）
    setTimeout(() => {
        // 目標位置を取得（ラッパー要素の位置）
        const logoWrapper = document.querySelector('.logo-wrapper');
        const mainLogoRect = logoWrapper.getBoundingClientRect();

        // (2) title.pngがtitle.svgの位置にゆっくり移動（2秒かけて）
        // ブラウザに再描画させてからトランジションを開始
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                openingLogoWrapper.style.top = mainLogoRect.top + 'px';
                openingLogoWrapper.style.left = mainLogoRect.left + 'px';
                openingLogoWrapper.style.width = mainLogoRect.width + 'px';
            });
        });

        // (3) 移動完了後、オーバーレイをフェードアウト
        setTimeout(() => {
            // overlayをフェードアウト
            openingOverlay.style.opacity = '0';

            // フェードアウト完了後に削除
            setTimeout(() => {
                openingOverlay.style.display = 'none';
            }, 600); // transition時間と同じ

            // (4) メインコンテンツを順次フェードイン
            fadeInSections.forEach((section, index) => {
                setTimeout(() => {
                    section.classList.add('visible');
                }, index * 300); // 各セクションを300ms間隔でフェードイン
            });
        }, 2000);
    }, 1000);
});
