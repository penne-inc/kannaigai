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
    if (item.pageUrl) return item.pageUrl;
    return item.sourceUrls && item.sourceUrls.length > 0 ? item.sourceUrls[0] : null;
}

function getPrimaryImage(item) {
    return item.images && item.images.length > 0 ? item.images[0] : null;
}

function setFact(row, element, value) {
    if (value) {
        element.textContent = value;
    } else {
        row.hidden = true;
    }
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
    if (state.filter === "published") return Boolean(item.pageUrl);
    return true;
}

function renderSummary(items) {
    const pageCount = items.filter(item => item.pageUrl).length;
    summary.textContent = `第1回〜第${items.length}回のうち、${pageCount}回分のページを公開しています。`;
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
    if (item.featured) card.classList.add("archive-card--featured");
    const primary = getPrimarySource(item);
    if (primary) {
        mediaLink.href = primary;
        if (!item.pageUrl) {
            mediaLink.target = "_blank";
            mediaLink.rel = "noopener noreferrer";
        }
    } else {
        mediaLink.removeAttribute("href");
    }
    id.textContent = item.id === 1 ? "第1回" : `第${item.id}回`;
    status.textContent = item.statusLabel || "";
    title.textContent = item.title;
    setFact(date.parentElement, date, item.date);
    setFact(venue.parentElement, venue, item.venue);
    setFact(theme.parentElement, theme, item.theme);
    if (item.summary) {
        itemSummary.textContent = item.summary;
    } else if (item.status === "no_page") {
        itemSummary.textContent = "この回の公開ページはありません。";
    } else if (!item.pageUrl) {
        itemSummary.hidden = true;
    } else {
        itemSummary.hidden = true;
    }

    if (image && image.localPath) {
        const img = document.createElement("img");
        img.src = image.localPath;
        img.alt = `${item.title} 代表画像`;
        media.appendChild(img);
    } else {
        const placeholder = document.createElement("span");
        placeholder.className = "archive-card__media-placeholder";
        placeholder.textContent = `第${item.id}回`;
        media.appendChild(placeholder);
    }

    if (item.pageUrl) {
        const pageLink = document.createElement("a");
        pageLink.href = item.pageUrl;
        pageLink.textContent = "ページを見る";
        links.appendChild(pageLink);
    }

    item.sourceUrls.forEach((url, index) => {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = item.sourceUrls.length > 1 ? `関連リンク${index + 1}` : "関連リンク";
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
