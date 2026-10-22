const state = {
    items: [],
    query: "",
    filter: "all"
};

const list = document.getElementById("archiveList");
const summary = document.getElementById("archiveSummary");
const searchInput = document.getElementById("archiveSearch");
const filterButtons = document.querySelectorAll(".filter-button");
const template = document.getElementById("archiveCardTemplate");

function getPrimarySource(item) {
    return item.sourceUrls && item.sourceUrls.length > 0 ? item.sourceUrls[0] : "#";
}

function getPrimaryImage(item) {
    return item.images && item.images.length > 0 ? item.images[0] : null;
}

function getFallbackText(value) {
    return value || "整理中";
}

function matchesQuery(item) {
    if (!state.query) return true;

    const text = [
        item.id,
        item.title,
        item.year,
        item.date,
        item.venue,
        item.theme,
        item.summary
    ].filter(Boolean).join(" ").toLowerCase();

    return text.includes(state.query.toLowerCase());
}

function matchesFilter(item) {
    if (state.filter === "with-image") return Boolean(getPrimaryImage(item));
    if (state.filter === "needs-review") return item.status === "needs_review";
    return true;
}

function renderSummary(items) {
    const imageCount = items.filter(item => getPrimaryImage(item)).length;
    const needsReviewCount = items.filter(item => item.status === "needs_review").length;
    summary.textContent = `${items.length}件を収録中。代表画像あり ${imageCount}件、確認中 ${needsReviewCount}件。`;
}

function createCard(item) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".archive-card");
    const mediaLink = fragment.querySelector(".archive-card__media-link");
    const media = fragment.querySelector(".archive-card__media");
    const id = fragment.querySelector(".archive-card__id");
    const status = fragment.querySelector(".archive-card__status");
    const title = fragment.querySelector(".archive-card__title");
    const date = fragment.querySelector(".archive-card__date");
    const venue = fragment.querySelector(".archive-card__venue");
    const theme = fragment.querySelector(".archive-card__theme");
    const itemSummary = fragment.querySelector(".archive-card__summary");
    const links = fragment.querySelector(".archive-card__links");
    const image = getPrimaryImage(item);

    card.dataset.status = item.status;
    mediaLink.href = getPrimarySource(item);
    id.textContent = item.id === 1 ? "第1回" : `第${item.id}回`;
    status.textContent = item.statusLabel || "確認中";
    title.textContent = item.title;
    date.textContent = getFallbackText(item.date);
    venue.textContent = getFallbackText(item.venue);
    theme.textContent = getFallbackText(item.theme);
    itemSummary.textContent = item.summary || "概要、会場、参加クリエイターなどの情報を整理中です。";

    if (image && image.localPath) {
        const img = document.createElement("img");
        img.src = image.localPath;
        img.alt = `${item.title} 代表画像`;
        media.appendChild(img);
    } else {
        const placeholder = document.createElement("span");
        placeholder.className = "archive-card__media-placeholder";
        placeholder.textContent = "代表画像 整理中";
        media.appendChild(placeholder);
    }

    item.sourceUrls.forEach((url, index) => {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = index === 0 ? "出典" : `出典${index + 1}`;
        links.appendChild(link);
    });

    return fragment;
}

function renderList() {
    const filtered = state.items.filter(item => matchesQuery(item) && matchesFilter(item));
    list.replaceChildren();

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.className = "archive-empty";
        empty.textContent = "条件に合うアーカイブはありません。";
        list.appendChild(empty);
        return;
    }

    filtered.forEach(item => {
        list.appendChild(createCard(item));
    });
}

function bindControls() {
    searchInput.addEventListener("input", event => {
        state.query = event.target.value.trim();
        renderList();
    });

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            filterButtons.forEach(current => current.classList.remove("is-active"));
            button.classList.add("is-active");
            state.filter = button.dataset.filter;
            renderList();
        });
    });
}

async function initArchive() {
    try {
        const response = await fetch("data/projects.json");
        const data = await response.json();
        state.items = data.items.sort((a, b) => b.id - a.id);
        renderSummary(state.items);
        renderList();
        bindControls();
    } catch (error) {
        console.error("アーカイブデータの読み込みに失敗しました。", error);
        summary.textContent = "アーカイブデータの読み込みに失敗しました。";
        list.innerHTML = '<p class="archive-empty">時間をおいて再度アクセスしてください。</p>';
    }
}

initArchive();
