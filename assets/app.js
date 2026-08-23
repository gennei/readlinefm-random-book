(() => {
  "use strict";

  const DATA_NODE_ID = "book-data";
  const LISTEN_URL_PATTERN = /^https:\/\/listen\.style\/p\/readlinefm\/[a-z0-9]+$/;
  const COVER_CACHE_KEY = "readlinefm-book-metadata-v1";

  const els = {
    bookObject: document.querySelector(".book-object"),
    coverImage: document.querySelector("#cover-image"),
    coverFallback: document.querySelector("#cover-fallback"),
    coverShimmer: document.querySelector("#cover-shimmer"),
    coverTitle: document.querySelector("#cover-title"),
    coverEpisode: document.querySelector("#cover-episode"),
    titleSlot: document.querySelector("#title-slot"),
    title: document.querySelector("#book-title"),
    meta: document.querySelector("#book-meta"),
    issue: document.querySelector("#issue"),
    description: document.querySelector("#description"),
    episodeLink: document.querySelector("#episode-link"),
    shuffle: document.querySelector("#shuffle"),
    status: document.querySelector("#status")
  };

  let pool = [];
  let bag = [];
  let lastIndex = -1;
  let renderToken = 0;

  function readCache() {
    try {
      return JSON.parse(localStorage.getItem(COVER_CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeCache(cache) {
    try {
      localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // The site remains fully usable when storage is unavailable.
    }
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\p{P}\p{S}]/gu, "");
  }

  function chooseVolume(items, title) {
    const wanted = normalize(title);
    const ranked = items
      .map((item) => {
        const candidate = normalize(item.volumeInfo?.title);
        let score = 0;
        if (candidate === wanted) score += 100;
        if (candidate && (wanted.includes(candidate) || candidate.includes(wanted))) score += 50;
        score += Math.min(candidate.length, wanted.length);
        if (item.volumeInfo?.imageLinks?.thumbnail) score += 20;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.item || null;
  }

  async function getBookMetadata(book) {
    if (book.amazonCoverUrl || book.coverUrl || book.authors?.length) {
      return {
        coverUrl: book.amazonCoverUrl || book.coverUrl || null,
        fallbackCoverUrl: book.amazonCoverUrl ? book.coverUrl || null : null,
        authors: book.authors || []
      };
    }

    const cache = readCache();
    if (cache[book.title]) return cache[book.title];

    const query = encodeURIComponent(`intitle:"${book.title}"`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&printType=books`;

    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error(`Google Books: ${response.status}`);
      const data = await response.json();
      const volume = chooseVolume(data.items || [], book.title);
      const thumbnail = volume?.volumeInfo?.imageLinks?.thumbnail || null;
      const metadata = {
        authors: volume?.volumeInfo?.authors || [],
        coverUrl: thumbnail
          ? thumbnail.replace(/^http:/, "https:").replace("zoom=1", "zoom=2")
          : null
      };
      cache[book.title] = metadata;
      writeCache(cache);
      return metadata;
    } catch {
      return { coverUrl: null, fallbackCoverUrl: null, authors: [] };
    }
  }

  function shuffle(values) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function refillBag() {
    bag = shuffle(pool.map((_, index) => index));
    if (bag.length > 1 && bag[bag.length - 1] === lastIndex) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
  }

  function nextIndex() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  async function preloadNextCover() {
    if (bag.length === 0) refillBag();
    const nextBook = pool[bag[bag.length - 1]];
    if (!nextBook) return;

    const metadata = await getBookMetadata(nextBook);
    if (!metadata.coverUrl) return;

    await new Promise((resolve) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = metadata.coverUrl;
    });
  }

  function showCoverLoading() {
    els.bookObject.setAttribute("aria-busy", "true");
    els.coverImage.classList.remove("is-visible");
    els.coverFallback.classList.remove("is-visible");
    els.coverShimmer.classList.add("is-visible");
    els.coverImage.removeAttribute("src");
  }

  function showCoverFallback() {
    els.bookObject.setAttribute("aria-busy", "false");
    els.coverImage.classList.remove("is-visible");
    els.coverShimmer.classList.remove("is-visible");
    els.coverFallback.classList.add("is-visible");
  }

  function animateContent() {
    [els.issue, els.title, els.meta, els.description, document.querySelector(".actions")]
      .forEach((element, index) => {
        element.classList.remove("reveal");
        void element.offsetWidth;
        element.style.animationDelay = `${index * 45}ms`;
        element.classList.add("reveal");
      });
  }

  async function renderBook(index) {
    const book = pool[index];
    const token = ++renderToken;
    lastIndex = index;

    els.bookObject.classList.add("is-changing");
    els.shuffle.disabled = true;
    showCoverLoading();

    await new Promise((resolve) => window.setTimeout(resolve, 130));
    if (token !== renderToken) return;

    els.title.textContent = book.title;
    const titleLength = [...book.title].length;
    els.title.classList.toggle("is-long", titleLength >= 15 && titleLength < 26);
    els.title.classList.toggle("is-extra-long", titleLength >= 26);
    els.coverTitle.textContent = book.title;
    els.issue.textContent = `${book.episodePart1} · PART 1`;
    els.titleSlot.dataset.episode = book.episodePart1;
    els.coverEpisode.textContent = book.episodePart1;
    els.meta.textContent = "readline.fmで紹介した一冊";
    els.episodeLink.href = book.episodePart1Url;
    els.episodeLink.setAttribute("aria-label", `${book.title}のPART1をLISTENで聴く`);

    els.description.replaceChildren();
    book.description.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      els.description.append(item);
    });

    animateContent();
    els.bookObject.classList.remove("is-changing");
    els.shuffle.disabled = false;

    const metadata = await getBookMetadata(book);
    if (token !== renderToken) return;

    if (metadata.authors?.length) {
      els.meta.textContent = metadata.authors.join(" / ");
    }

    if (metadata.coverUrl) {
      let triedFallback = false;
      els.coverImage.alt = `${book.title}の書影`;
      els.coverImage.onload = () => {
        if (token !== renderToken) return;
        els.bookObject.setAttribute("aria-busy", "false");
        els.coverImage.classList.add("is-visible");
        els.coverShimmer.classList.remove("is-visible");
        void preloadNextCover();
      };
      els.coverImage.onerror = () => {
        if (metadata.fallbackCoverUrl && !triedFallback) {
          triedFallback = true;
          els.coverImage.src = metadata.fallbackCoverUrl;
          return;
        }
        if (token === renderToken) showCoverFallback();
      };
      els.coverImage.src = metadata.coverUrl;
    } else {
      showCoverFallback();
    }
  }

  async function loadBooks() {
    const node = document.getElementById(DATA_NODE_ID);
    const embedded = node.textContent.trim();
    if (embedded) return JSON.parse(embedded);

    const source = node.dataset.src;
    const response = await fetch(source);
    if (!response.ok) throw new Error(`books.json: ${response.status}`);
    return response.json();
  }

  async function init() {
    try {
      const books = await loadBooks();
      pool = books.filter((book) => LISTEN_URL_PATTERN.test(book.episodePart1Url || ""));

      if (pool.length === 0) throw new Error("抽選可能な本がありません");

      els.status.textContent = `${pool.length} books on air`;
      els.shuffle.addEventListener("click", () => renderBook(nextIndex()));
      renderBook(nextIndex());
    } catch (error) {
      els.status.textContent = "data load error";
      els.title.textContent = "本のデータを読み込めませんでした";
      els.meta.textContent = "単体で確認するときは standalone-preview.html を開いてください。";
      els.shuffle.disabled = true;
      console.error(error);
    }
  }

  init();
})();
